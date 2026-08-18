import { toast as sonner } from 'sonner'

/**
 * 사용자 알림. 기존에는 RN 의 Alert.alert 를 옮긴 window.alert 였으나,
 * 브라우저 모달은 스레드를 막고 앱 디자인과 겉돌아 토스트로 바꿨다.
 */
export const toast = {
  success(message: string): void {
    sonner.success(message)
  },
  error(message: string): void {
    sonner.error(message)
  },
}
