/** RN 의 Keyboard.dismiss() 대체 — 포커스 해제로 모바일 키보드를 내린다 */
export function blurActiveElement(): void {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}
