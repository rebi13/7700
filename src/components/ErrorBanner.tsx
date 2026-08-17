import { TriangleAlert, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <Alert variant="destructive" className="mb-3 items-center">
      <TriangleAlert />
      <AlertDescription className="line-clamp-2 text-destructive/90">
        {message}
      </AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="오류 닫기"
        onClick={onDismiss}
        className="absolute top-1.5 right-1.5 size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" />
      </Button>
    </Alert>
  )
}
