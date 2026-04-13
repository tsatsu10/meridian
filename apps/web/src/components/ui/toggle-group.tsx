import * as React from "react"
import { cn } from "@/lib/cn"

export interface ToggleGroupProps {
  type: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: any) => void
  className?: string
  children: React.ReactNode
}

export interface ToggleGroupItemProps {
  value: string
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

const ToggleGroupContext = React.createContext<{
  type: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: any) => void
}>({
  type: "single"
})

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ type, value, onValueChange, className, children, ...props }, ref) => {
    return (
      <ToggleGroupContext.Provider value={{ type, value, onValueChange }}>
        <div
          ref={ref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, children, disabled, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    
    const isSelected = React.useMemo(() => {
      if (context.type === "single") {
        return context.value === value
      } else {
        return Array.isArray(context.value) && context.value.includes(value)
      }
    }, [context.value, value, context.type])

    const handleClick = () => {
      if (disabled || !context.onValueChange) return

      if (context.type === "single") {
        context.onValueChange(isSelected ? "" : value)
      } else {
        const currentValue = Array.isArray(context.value) ? context.value : []
        if (isSelected) {
          context.onValueChange(currentValue.filter(v => v !== value))
        } else {
          context.onValueChange([...currentValue, value])
        }
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isSelected
            ? "bg-background text-foreground shadow-sm"
            : "hover:bg-muted hover:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem } 