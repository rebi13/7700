import { Check } from 'lucide-react'
import type { EstimateResult } from '@/stores/aiStore'
import type { AiNote } from '@/features/ai-log/useCalorieEstimate'
import { cn } from '@/lib/utils'

const CONFIDENCE_LABEL: Record<EstimateResult['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const CONFIDENCE_CLASS: Record<EstimateResult['confidence'], string> = {
  high: 'text-deficit',
  medium: 'text-chart-4',
  low: 'text-surplus',
}

export function AiEstimateNote({ note }: { note: AiNote }) {
  return (
    <div className="mt-2 rounded-md border-l-2 border-l-deficit bg-accent/50 px-3 py-2">
      <p
        className={cn(
          'flex items-center gap-1 text-xs font-semibold',
          CONFIDENCE_CLASS[note.confidence]
        )}
      >
        <Check className="size-3.5" />
        AI 추정 · 신뢰도 {CONFIDENCE_LABEL[note.confidence]}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note.text}</p>
    </div>
  )
}
