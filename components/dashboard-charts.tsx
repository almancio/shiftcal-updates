'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

type DailyPoint = {
  day: string;
  checks: number;
  served: number;
  configFetches: number;
};

type LabelValuePoint = {
  label: string;
  value: number;
};

const trafficConfig = {
  checks: {
    label: 'Checks OTA',
    color: 'hsl(var(--chart-1))'
  },
  served: {
    label: 'Updates servidas',
    color: 'hsl(var(--chart-2))'
  },
  configFetches: {
    label: 'Fetch config',
    color: 'hsl(var(--chart-3))'
  }
} satisfies ChartConfig;

const versionsConfig = {
  count: {
    label: 'Eventos',
    color: 'hsl(var(--chart-4))'
  }
} satisfies ChartConfig;

const channelsConfig = {
  checks: {
    label: 'Checks por canal',
    color: 'hsl(var(--chart-5))'
  }
} satisfies ChartConfig;

const piePalette = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

type DashboardChartsProps = {
  daily: DailyPoint[];
  platforms: LabelValuePoint[];
  versions: LabelValuePoint[];
  channels: LabelValuePoint[];
};

export function DashboardCharts({ daily, platforms, versions, channels }: DashboardChartsProps) {
  const platformTotal = platforms.reduce((acc, item) => acc + item.value, 0);
  const versionsData = versions.map((item) => ({ name: item.label, count: item.value }));
  const channelsData = channels.map((item) => ({ channel: item.label, checks: item.value }));

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <Card className="2xl:col-span-2">
          <CardHeader>
            <CardTitle>Tráfico OTA y config en el tiempo</CardTitle>
            <CardDescription>Evolución diaria de checks, updates entregadas y fetch de config.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficConfig} className="h-[320px] w-full">
              <AreaChart data={daily} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="fillChecks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-checks)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-checks)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillServed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-served)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-served)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} width={34} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="natural"
                  dataKey="checks"
                  stroke="var(--color-checks)"
                  fill="url(#fillChecks)"
                  strokeWidth={2.5}
                />
                <Area
                  type="natural"
                  dataKey="served"
                  stroke="var(--color-served)"
                  fill="url(#fillServed)"
                  strokeWidth={2.3}
                />
                <Area
                  type="natural"
                  dataKey="configFetches"
                  stroke="var(--color-configFetches)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por plataforma</CardTitle>
            <CardDescription>Qué porcentaje de checks viene de iOS/Android.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={Object.fromEntries(
                platforms.map((item, index) => [
                  item.label,
                  {
                    label: item.label,
                    color: piePalette[index % piePalette.length]
                  }
                ])
              )}
              className="h-[320px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel nameKey="label" labelFormatter={() => 'Plataforma'} />}
                />
                <Pie data={platforms} dataKey="value" nameKey="label" innerRadius={62} outerRadius={110} paddingAngle={3}>
                  {platforms.map((entry, index) => (
                    <Cell key={entry.label} fill={piePalette[index % piePalette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Total checks analizados: <span className="font-semibold text-foreground">{platformTotal.toLocaleString('es-ES')}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versiones de app más activas</CardTitle>
            <CardDescription>Top versiones con mayor tráfico OTA reciente.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={versionsConfig} className="h-[300px] w-full">
              <BarChart data={versionsData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={34} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intensidad por canal</CardTitle>
            <CardDescription>Comparativa visual del peso de cada canal OTA.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={channelsConfig} className="h-[300px] w-full">
              <RadarChart data={channelsData} outerRadius={108}>
                <ChartTooltip content={<ChartTooltipContent labelFormatter={() => 'Canal'} hideLabel />} />
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="channel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Radar
                  dataKey="checks"
                  fill="var(--color-checks)"
                  fillOpacity={0.22}
                  stroke="var(--color-checks)"
                  strokeWidth={2}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
