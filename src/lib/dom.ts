/** RN 의 Alert.alert(title, message) 대체 — 단순 알림 */
export function notify(title: string, message?: string): void {
  window.alert(message ? `${title}\n\n${message}` : title)
}

/** RN 의 Alert.alert(title, message, [취소/확인]) 대체 — 확인/취소 */
export function confirmAction(title: string, message?: string): boolean {
  return window.confirm(message ? `${title}\n\n${message}` : title)
}

/** RN 의 Keyboard.dismiss() 대체 — 포커스 해제로 모바일 키보드를 내린다 */
export function blurActiveElement(): void {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}
