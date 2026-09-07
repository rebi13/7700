import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  name: string
  sub?: string | null
  trailing?: string
  onEdit: () => void
  onDelete: () => void
}

/**
 * 기록 목록의 한 줄. 행 본문과 삭제 버튼을 형제로 배치해
 * 버튼 안에 버튼이 중첩되지 않도록 한다.
 */
export function LogRow({ name, sub, trailing, onEdit, onDelete }: Props) {
  return (
    <li className="flex items-center gap-2 border-b py-2 last:border-b-0">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="break-words text-sm font-medium">{name}</span>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </span>
        {trailing && (
          <span className="shrink-0 whitespace-nowrap text-right text-sm tabular-nums text-muted-foreground">
            {trailing}
          </span>
        )}
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${name} 삭제`}
        onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
