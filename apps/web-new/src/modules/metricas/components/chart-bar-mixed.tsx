
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import { useIsMobile } from '@/core/hooks/use-mobile';

export type BarChartData = {
  name: string;
  value: number;
  fill: string;
};

type ChartBarMixedProps = {
  data: BarChartData[];
  title: string;
  description?: string;
  footerText?: string;
  trendText?: string;
  config: ChartConfig;
  valueFormatter?: (value: number) => string;
};

export function ChartBarMixed({
  data,
  title,
  description,
  footerText,
  trendText,
  config,
  valueFormatter,
}: ChartBarMixedProps) {
  const isMobile = useIsMobile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} role="img" aria-label={title}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              left: isMobile ? 5 : 20,
              right: isMobile ? 5 : 20,
            }}
          >
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={isMobile ? 5 : 10}
              axisLine={false}
              tickFormatter={(value) => {
                const label = config[value as keyof typeof config]?.label || value;
                return isMobile && label.length > 10 ? `${label.slice(0, 10)}…` : label;
              }}
              width={isMobile ? 70 : 120}
            />
            <XAxis
              dataKey="value"
              type="number"
              hide
              tickFormatter={valueFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={valueFormatter as any}
                />
              }
            />
            <Bar dataKey="value" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {(trendText || footerText) && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {trendText && (
            <div className="flex gap-2 leading-none font-medium">
              {trendText} <TrendingUp className="h-4 w-4" />
            </div>
          )}
          {footerText && (
            <div className="text-muted-foreground leading-none">
              {footerText}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
