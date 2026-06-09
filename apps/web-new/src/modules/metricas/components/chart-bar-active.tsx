
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from 'recharts';

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

export type BarActiveChartData = {
  name: string;
  value: number;
  fill: string;
};

type ChartBarActiveProps = {
  data: BarActiveChartData[];
  title: string;
  description?: string;
  footerText?: string;
  trendText?: string;
  config: ChartConfig;
  valueFormatter?: (value: number) => string;
  activeIndex?: number;
};

export function ChartBarActive({
  data,
  title,
  description,
  footerText,
  trendText,
  config,
  valueFormatter,
  activeIndex,
}: ChartBarActiveProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} role="img" aria-label={title}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                config[value as keyof typeof config]?.label || value
              }
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
            <Bar
              dataKey="value"
              strokeWidth={2}
              radius={8}
              activeIndex={activeIndex}
              activeBar={({ ...props }) => {
                return (
                  <Rectangle
                    {...props}
                    fillOpacity={0.8}
                    stroke={props.payload.fill}
                    strokeDasharray={4}
                    strokeDashoffset={4}
                  />
                );
              }}
            />
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
