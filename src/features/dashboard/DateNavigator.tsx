import { useState } from 'react'
import { ko } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { addDays, formatDate, fromISODate, todayISO, toISODate } from '@/utils/date'

/**
 * 홈 화면 날짜 선택기. ‹ 날짜 › 로 하루씩 옮기고, 날짜 텍스트를 누르면
 * 캘린더 팝오버가 열린다. 미래 날짜는 기록이 없으므로 막는다.
 */
export function DateNavigator({
  date,
  onChange,
}: {
  date: string
  onChange: (date: string) => void
}) {
  const [open, setOpen] = useState(false)
  const today = todayISO()
  // 미래는 기록이 없으니 오늘에 다다르면 '다음 날' 을 막는다.
  const atToday = date >= today

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="이전 날"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 font-medium">
            {formatDate(date)}
            <CalendarDays className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={ko}
            selected={fromISODate(date)}
            defaultMonth={fromISODate(date)}
            disabled={(d) => toISODate(d) > today}
            onSelect={(d) => {
              if (!d) return
              onChange(toISODate(d))
              setOpen(false)
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="다음 날"
        disabled={atToday}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
