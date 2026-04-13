"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AnimatedCircularProgressBarProps {
  /**
   * The maximum value of the progress bar.
   * @default 100
   */
  max?: number;
  /**
   * The minimum value of the progress bar.
   * @default 0
   */
  min?: number;
  /**
   * The current value of the progress bar.
   * @default 0
   */
  value?: number;
  /**
   * The size of the progress bar.
   * @default 120
   */
  size?: number;
  /**
   * The stroke width of the progress bar.
   * @default 10
   */
  strokeWidth?: number;
  /**
   * The color of the progress bar.
   * @default "hsl(var(--primary))"
   */
  color?: string;
  /**
   * The color of the progress bar background.
   * @default "hsl(var(--muted))"
   */
  backgroundColor?: string;
  /**
   * The duration of the animation in milliseconds.
   * @default 1000
   */
  duration?: number;
  /**
   * Whether to show the percentage value.
   * @default true
   */
  showPercentage?: boolean;
  /**
   * Additional class names to apply to the progress bar.
   */
  className?: string;
  /**
   * Additional class names to apply to the text.
   */
  textClassName?: string;
}

export function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  size = 120,
  strokeWidth = 10,
  color = "hsl(var(--primary))",
  backgroundColor = "hsl(var(--muted))",
  duration = 1000,
  showPercentage = true,
  className,
  textClassName,
}: AnimatedCircularProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(min);
  const [isAnimating, setIsAnimating] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = ((value - min) / (max - min)) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const valueRange = endValue - startValue;

    const updateValue = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + valueRange * easedProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, duration, displayValue]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          className="opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
          style={{
            transitionDuration: isAnimating ? `${duration}ms` : "300ms",
          }}
        />
      </svg>
      {showPercentage && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm font-medium",
            textClassName
          )}
        >
          {Math.round(((displayValue - min) / (max - min)) * 100)}%
        </div>
      )}
    </div>
  );
} 