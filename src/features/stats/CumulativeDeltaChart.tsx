import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const config = {
  cumulative: { label: '누적 적자', color: 'var(--chart-2)' },
} satisfies ChartConfig

const formatKcal = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))

interface Props {
  data: { date: string; cumulative: number }[]
}

export function CumulativeDeltaChart({ data }: Props) {
  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cumulative)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-cumulative)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={44}
          tickFormatter={formatKcal}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${Number(value).toLocaleString()} kcal`}
            />
          }
        />
        <Area
          dataKey="cumulative"
          type="monotone"
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          fill="url(#cumulativeFill)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
