import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const config = {
  amount: { label: '칼로리' },
} satisfies ChartConfig

const formatKcal = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))

interface Props {
  /** delta > 0 이면 적자, < 0 이면 초과. amount 는 막대 높이용 절댓값. */
  data: { date: string; delta: number; amount: number }[]
}

export function DeltaBarChart({ data }: Props) {
  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={40}
          tickFormatter={formatKcal}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, _name, item) => {
                const delta = item.payload.delta as number
                return `${delta >= 0 ? '-' : '+'}${Math.abs(delta).toLocaleString()} kcal ${
                  delta >= 0 ? '적자' : '초과'
                }`
              }}
            />
          }
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.date}
              fill={d.delta >= 0 ? 'var(--deficit)' : 'var(--surplus)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
