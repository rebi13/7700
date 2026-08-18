import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ConfirmDialog,
  confirmAction,
  type ConfirmOptions,
} from '@/components/ConfirmDialog'

/**
 * confirmAction 은 React 밖에서 부르는 명령형 API 라 상태 갱신이 act 밖에서
 * 일어난다. 실제 호출부(이벤트 핸들러)에서는 React 가 알아서 감싸주는 부분이므로
 * 테스트에서만 act 로 맞춰준다.
 */
function open(options: ConfirmOptions): Promise<boolean> {
  let pending!: Promise<boolean>
  act(() => {
    pending = confirmAction(options)
  })
  return pending
}

const cancel = () => userEvent.click(screen.getByRole('button', { name: '취소' }))

/**
 * confirmAction 은 window.confirm 을 대신하므로, 어떤 경로로 닫히든 프라미스가
 * 반드시 결판나야 한다. 매달리면 호출부의 await 가 영영 풀리지 않는다.
 */
describe('ConfirmDialog', () => {
  it('요청이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<ConfirmDialog />)

    expect(container).toBeEmptyDOMElement()
  })

  it('제목·설명·확인 버튼 문구를 넘긴 대로 보여준다', async () => {
    render(<ConfirmDialog />)
    const pending = open({
      title: '기록 삭제',
      description: '되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      destructive: true,
    })

    expect(screen.getByText('기록 삭제')).toBeInTheDocument()
    expect(screen.getByText('되돌릴 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()

    await cancel()
    await pending
  })

  it('확인 버튼 문구를 안 주면 "확인" 으로 둔다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '로그아웃' })

    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()

    await cancel()
    await pending
  })

  it('설명을 안 주면 본문 없이 제목만 보여준다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '로그아웃' })

    expect(screen.getByRole('alertdialog')).toHaveTextContent('로그아웃')

    await cancel()
    await pending
  })

  it('확인을 누르면 true 로 결판난다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '기록 삭제', confirmLabel: '삭제' })

    await userEvent.click(screen.getByRole('button', { name: '삭제' }))

    await expect(pending).resolves.toBe(true)
  })

  it('취소를 누르면 false 로 결판난다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '기록 삭제', confirmLabel: '삭제' })

    await cancel()

    await expect(pending).resolves.toBe(false)
  })

  it('ESC 로 닫아도 false 로 결판난다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '기록 삭제', confirmLabel: '삭제' })

    await userEvent.keyboard('{Escape}')

    await expect(pending).resolves.toBe(false)
  })

  it('닫은 뒤에는 대화상자가 화면에서 사라진다', async () => {
    render(<ConfirmDialog />)
    const pending = open({ title: '기록 삭제', confirmLabel: '삭제' })

    await cancel()
    await pending

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('앞선 요청이 열려 있는데 새로 부르면, 앞 요청을 취소로 정리한다', async () => {
    // 정리하지 않으면 첫 프라미스가 영원히 대기해 호출부가 멈춘다.
    render(<ConfirmDialog />)
    const first = open({ title: '첫 번째' })
    const second = open({ title: '두 번째' })

    await expect(first).resolves.toBe(false)
    expect(screen.getByText('두 번째')).toBeInTheDocument()

    await cancel()
    await second
  })
})
