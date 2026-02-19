'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const keyedPayload = payload as {
    dataKey?: string;
    name?: string;
    payload?: { fill?: string; [key: string]: unknown };
  };

  const key = keyedPayload.dataKey || keyedPayload.name;
  if (!key || !(key in config)) {
    return null;
  }

  return config[key];
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, style, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  const chartStyle = Object.entries(config).reduce((acc, [key, item]) => {
    if (item.color) {
      acc[`--color-${key}`] = item.color;
    }
    return acc;
  }, {} as Record<string, string>);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          'h-full w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-foreground [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border/40 [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border/50',
          className
        )}
        style={{ ...(chartStyle as React.CSSProperties), ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string;
  hideLabel?: boolean;
  indicator?: 'line' | 'dot';
  nameKey?: string;
  labelFormatter?: (value: React.ReactNode) => React.ReactNode;
};

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      label,
      labelFormatter,
      formatter,
      nameKey
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn('grid min-w-[200px] gap-2 rounded-lg border bg-background p-3 text-xs shadow-xl', className)}
      >
        {!hideLabel && label != null && (
          <p className="font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>
        )}

        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const itemConfig =
              getPayloadConfigFromPayload(config, item) ||
              (nameKey && item.payload && typeof item.payload === 'object' && nameKey in item.payload
                ? config[String(item.payload[nameKey])]
                : null);

            const labelNode = itemConfig?.label || item.name;
            const color = item.color || item.payload?.fill || 'hsl(var(--primary))';

            return (
              <div key={item.dataKey || index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {indicator === 'dot' ? (
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  ) : (
                    <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
                  )}
                  <span className="text-muted-foreground">{labelNode}</span>
                </div>
                <span className="font-semibold text-foreground">
                  {formatter && item.value != null
                    ? formatter(item.value, item.name ?? '', item, index, item.payload)
                    : Number(item.value || 0).toLocaleString('es-ES')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & Pick<RechartsPrimitive.LegendProps, 'payload'>
>(({ className, payload }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div ref={ref} className={cn('flex flex-wrap items-center justify-center gap-3 text-xs', className)}>
      {payload.map((item) => {
        const itemConfig = getPayloadConfigFromPayload(config, item);
        const labelNode = itemConfig?.label || item.value;
        const color = item.color || '#999';

        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{labelNode}</span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegendContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
