import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const config = {
  weight: { label: '체중', color: 'var(--chart-1)' },
} satisfies ChartConfig

interface Props {
  data: { date: string; weight: number }[]
}

export function WeightTrendChart({ data }: Props) {
  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
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
          width={40}
          domain={['dataMin - 1', 'dataMax + 1']}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${Number(value).toFixed(1)} kg`}
            />
          }
        />
        <Line
          dataKey="weight"
          type="monotone"
          stroke="var(--color-weight)"
          strokeWidth={2}
          dot={data.length <= 14}
        />
      </LineChart>
    </ChartContainer>
  )
}
