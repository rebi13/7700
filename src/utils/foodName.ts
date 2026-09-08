/**
 * 음식 이름을 조회/캐시 키로 정규화한다.
 * 규칙(의도적으로 최소한):
 *  - 앞뒤 공백 제거, 내부 연속 공백은 1칸으로 축소
 *  - 소문자화 (영문 대소문자 통일; 한글엔 영향 없음)
 * 양(수량)은 절대 제거하지 않는다: "밥"과 "밥 1공기"는 서로 다른 키다(양이 영양을 바꾸므로).
 */
export function normalizeFoodName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** ilike 접두어 검색에서 사용자가 넣은 %, _, \ 를 리터럴로 취급하도록 이스케이프한다. */
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`)
}
