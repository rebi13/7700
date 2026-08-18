import { useSyncExternalStore } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type ConfirmOptions = {
  title: string
  description?: string
  /** 확인 버튼 문구. 무엇이 일어나는지 드러나게 쓴다 — "확인" 보다 "삭제" */
  confirmLabel?: string
  /** 되돌릴 수 없는 동작이면 확인 버튼을 빨갛게 표시한다 */
  destructive?: boolean
}

type Request = ConfirmOptions & {
  resolve: (confirmed: boolean) => void
  settled: boolean
}

type State = { request: Request | null; open: boolean }

let state: State = { request: null, open: false }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * RN 의 Alert.alert(취소/확인) 대체. window.confirm 과 달리 비동기다.
 *
 * 명령형으로 부를 수 있도록 프라미스를 열어두고, 화면에 한 번만 올려둔
 * <ConfirmDialog /> 가 응답을 받아 닫는다.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // 앞선 요청이 아직 열려 있으면 취소로 정리해 프라미스가 매달리지 않게 한다.
  settle(false)

  return new Promise<boolean>((resolve) => {
    state = { request: { ...options, resolve, settled: false }, open: true }
    emit()
  })
}

function settle(confirmed: boolean) {
  const { request } = state
  if (request && !request.settled) {
    request.settled = true
    request.resolve(confirmed)
  }
  if (state.open) {
    // 닫기 애니메이션이 남아 있으므로 request 는 그대로 두고 open 만 내린다.
    state = { request: state.request, open: false }
    emit()
  }
}

function getSnapshot() {
  return state
}

export function ConfirmDialog() {
  const { request, open } = useSyncExternalStore(subscribe, getSnapshot)
  if (!request) return null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // ESC 나 바깥 클릭으로 닫히는 경우도 취소로 처리한다.
        if (!next) settle(false)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request.title}</AlertDialogTitle>
          {request.description && (
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant={request.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {request.confirmLabel ?? '확인'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
