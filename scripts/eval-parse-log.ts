/**
 * parse-log 프롬프트 평가. Edge Function 과 같은 요청(_shared/parse-log.prompt.ts)을
 * OpenAI 에 직접 보내고, scripts/eval/parse-log.cases.ts 의 검사를 돌려 통과율을 낸다.
 * 한도·인증을 거치지 않으므로 로컬에서 개발자 키로만 실행한다.
 *
 *   OPENAI_API_KEY=sk-... npm run eval:parse-log
 *   OPENAI_API_KEY=sk-... npm run eval:parse-log -- --no-few-shot      # 예시 없이
 *   OPENAI_API_KEY=sk-... npm run eval:parse-log -- --repeat 3         # 케이스마다 3회
 *   OPENAI_API_KEY=sk-... npm run eval:parse-log -- --effort medium --only 주입
 *
 * 옵션: --no-few-shot, --repeat N, --effort minimal|low|medium|high, --model 이름,
 *       --only 카테고리 또는 케이스 id, --concurrency N
 */
import { parseParseResponse } from '../supabase/functions/_shared/parse-log.logic.ts'
import {
  PARSE_LOG_MODEL,
  buildParseRequestBody,
  type ParseRequestOptions,
} from '../supabase/functions/_shared/parse-log.prompt.ts'
import { PARSE_LOG_CASES } from './eval/parse-log.cases.ts'
import { runChecks, type EvalCase } from './eval/parse-log.check.ts'

interface Args {
  fewShot: boolean
  repeat: number
  effort?: ParseRequestOptions['reasoningEffort']
  model?: string
  only?: string
  concurrency: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = { fewShot: true, repeat: 1, concurrency: 4 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--no-few-shot') args.fewShot = false
    else if (a === '--repeat') args.repeat = Math.max(1, Number(next()) || 1)
    else if (a === '--effort') args.effort = next() as Args['effort']
    else if (a === '--model') args.model = next()
    else if (a === '--only') args.only = next()
    else if (a === '--concurrency') args.concurrency = Math.max(1, Number(next()) || 1)
    else throw new Error(`알 수 없는 옵션: ${a}`)
  }
  return args
}

class AuthError extends Error {}

interface RunResult {
  ok: boolean
  failures: string[]
  ms: number
  promptTokens: number
  completionTokens: number
}

async function runOnce(c: EvalCase, args: Args, apiKey: string): Promise<RunResult> {
  const started = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      buildParseRequestBody(c.input, {
        fewShot: args.fewShot,
        model: args.model,
        reasoningEffort: args.effort,
      })
    ),
  })
  const ms = Date.now() - started
  // 키·권한 문제는 모든 케이스에서 똑같이 실패하므로 바로 멈춘다.
  if (res.status === 401 || res.status === 403) {
    throw new AuthError(`OpenAI 인증 실패(HTTP ${res.status}). OPENAI_API_KEY 값을 확인해 주세요.`)
  }
  if (!res.ok) {
    return { ok: false, failures: [`HTTP ${res.status}: ${await res.text()}`], ms, promptTokens: 0, completionTokens: 0 }
  }
  const data = await res.json()
  const usage = {
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  }
  let failures: string[]
  try {
    const items = parseParseResponse(JSON.parse(data.choices?.[0]?.message?.content ?? ''))
    failures = runChecks(c.checks, items)
  } catch (e) {
    failures = [`응답 해석 실패: ${(e as Error).message}`]
  }
  return { ok: failures.length === 0, failures, ms, ...usage }
}

/** 동시에 n 개까지만 돌린다(요청 제한 회피) */
async function pool<T, R>(inputs: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(inputs.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, inputs.length) }, async () => {
      while (next < inputs.length) {
        const i = next++
        results[i] = await fn(inputs[i])
      }
    })
  )
  return results
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY 환경 변수가 필요합니다.')
    process.exit(2)
  }
  const args = parseArgs(process.argv.slice(2))
  const cases = PARSE_LOG_CASES.filter(
    (c) => !args.only || c.category === args.only || c.id === args.only
  )
  const jobs = cases.flatMap((c) => Array.from({ length: args.repeat }, () => c))

  console.log(
    `모델 ${args.model ?? PARSE_LOG_MODEL.model} · effort ${args.effort ?? PARSE_LOG_MODEL.reasoning_effort} · ` +
      `few-shot ${args.fewShot ? '켬' : '끔'} · 케이스 ${cases.length}개 × ${args.repeat}회\n`
  )

  const results = await pool(jobs, args.concurrency, (c) => runOnce(c, args, apiKey))

  const byCase = new Map<string, RunResult[]>()
  jobs.forEach((c, i) => byCase.set(c.id, [...(byCase.get(c.id) ?? []), results[i]]))

  const byCategory = new Map<string, { pass: number; total: number }>()
  for (const c of cases) {
    const runs = byCase.get(c.id) ?? []
    const pass = runs.filter((r) => r.ok).length
    const cat = byCategory.get(c.category) ?? { pass: 0, total: 0 }
    byCategory.set(c.category, { pass: cat.pass + pass, total: cat.total + runs.length })

    const mark = pass === runs.length ? 'PASS' : pass === 0 ? 'FAIL' : 'FLAKY'
    console.log(`${mark.padEnd(5)} ${c.category} / ${c.id} (${pass}/${runs.length})`)
    const failure = runs.find((r) => !r.ok)
    if (failure) for (const f of failure.failures) console.log(`      - ${f}`)
  }

  const total = results.length
  const passed = results.filter((r) => r.ok).length
  const avg = (f: (r: RunResult) => number) => Math.round(results.reduce((s, r) => s + f(r), 0) / total)

  console.log('\n카테고리별')
  for (const [cat, { pass, total: t }] of byCategory) {
    console.log(`  ${cat.padEnd(6)} ${pass}/${t}`)
  }
  console.log(
    `\n전체 ${passed}/${total} (${Math.round((passed / total) * 100)}%) · ` +
      `평균 ${avg((r) => r.ms)}ms · 입력 ${avg((r) => r.promptTokens)} / 출력 ${avg((r) => r.completionTokens)} 토큰`
  )
  process.exit(passed === total ? 0 : 1)
}

main().catch((e) => {
  console.error(e instanceof AuthError ? e.message : e)
  process.exit(2)
})
