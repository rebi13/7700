import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  /** 단일 블록 스켈레톤의 높이(px). 지정하면 rows 는 무시된다. */
  height?: number
  /** 텍스트 줄 스켈레톤 개수. 마지막 줄은 60% 너비로 그린다. */
  rows?: number
}

export function SkeletonCard({ height, rows = 1 }: Props) {
  return (
    <Card className="mb-3 py-4">
      <CardContent className="flex flex-col gap-2.5 px-4">
        {height != null ? (
          <Skeleton style={{ height }} className="w-full" />
        ) : (
          Array.from({ length: rows }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: i === rows - 1 ? '60%' : '100%' }}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
