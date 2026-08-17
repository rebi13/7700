import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  onSave: () => void
  saving?: boolean
  children: ReactNode
}

/**
 * RN 의 <Modal presentationStyle="pageSheet"> 를 대체하는 공용 편집 시트.
 * 취소 / 제목 / 저장 헤더 구조를 유지하되 포커스 트랩·ESC·스크롤 잠금은
 * Radix Dialog 가 처리한다.
 */
export function EditSheet({
  open,
  title,
  description,
  onClose,
  onSave,
  saving,
  children,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[90dvh] grid-rows-[auto_1fr_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {description ?? `${title} 폼`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? '저장 중' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
