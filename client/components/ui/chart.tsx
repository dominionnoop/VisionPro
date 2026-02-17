"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Chart configuration
export type ChartConfig = {
  [key: string]: {
    label: string
    color: string
    icon?: React.ComponentType
  }
}

// Context for chart configuration
const ChartContext = React.createContext<ChartConfig | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// Chart Container Component
interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig
  children: React.ReactElement<any>
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, children, className, ...props }, ref) => {
    return (
      <ChartContext.Provider value={config}>
        <div
          ref={ref}
          className={cn("w-full h-full", className)}
          style={
            {
              ...Object.entries(config).reduce((acc, [key, value]) => {
                acc[`--color-${key}`] = value.color
                return acc
              }, {} as Record<string, string>),
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

// Chart Tooltip Component
const ChartTooltip = RechartsPrimitive.Tooltip

// Chart Tooltip Content Component
interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  className?: string
  indicator?: "line" | "dot" | "dashed"
  hideLabel?: boolean
  hideIndicator?: boolean
  label?: string
  labelFormatter?: (label: any) => string
  labelClassName?: string
  formatter?: (value: any, name: any, item: any, index: number, payload: any[]) => React.ReactNode
  color?: string
  nameKey?: string
  labelKey?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const config = useChart()

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-background p-2 shadow-md",
          className
        )}
      >
        {!hideLabel && (
          <div className={cn("font-medium mb-2", labelClassName)}>
            {label || payload[0]?.payload?.date}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key = item.dataKey as string
            const itemConfig = config[key]
            const value = formatter
              ? formatter(item.value, item.name, item, index, payload)
              : item.value

            return (
              <div
                key={item.dataKey}
                className="flex items-center gap-2 text-sm"
              >
                {!hideIndicator && (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: itemConfig?.color || item.color,
                    }}
                  />
                )}
                <span className="flex-1 capitalize">
                  {itemConfig?.label || item.name}:
                </span>
                <span className="font-mono font-bold">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
