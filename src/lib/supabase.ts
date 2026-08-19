import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 배포 환경에 환경 변수를 등록하지 않으면 흰 화면만 남는다.
// 어느 값이 비었는지 콘솔에서 바로 알 수 있게 먼저 걸러낸다.
if (!url || !anonKey) {
  const missing = [
    !url && 'VITE_SUPABASE_URL',
    !anonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean)
  throw new Error(
    `환경 변수가 없습니다: ${missing.join(', ')}. ` +
      '로컬은 .env, 배포 환경은 호스트의 환경 변수 설정을 확인해 주세요.'
  )
}

export const supabase = createClient<Database>(
  url,
  anonKey,
  {
    auth: {
      // 브라우저에서는 supabase-js 가 localStorage 를 기본 저장소로 사용한다.
      autoRefreshToken: true,
      persistSession: true,
      // 비밀번호 재설정·이메일 인증 링크는 URL 조각에 토큰을 실어 보낸다.
      // 이것을 켜야 supabase-js 가 세션으로 바꿔 준다.
      detectSessionInUrl: true,
    },
  }
)
