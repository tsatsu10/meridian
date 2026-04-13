"use client";

import { cn } from "@/lib/utils";

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  color?: string | string[];
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
}

export function ShineBorder({
  children,
  className,
  color = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
}: ShineBorderProps) {
  const colorArray = Array.isArray(color) ? color : [color];
  const gradientColors = colorArray.join(", ");

  // Create keyframe style string
  const keyframeId = `shine-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <>
      <style>
        {`
          @keyframes ${keyframeId} {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-background p-[1px]",
          className
        )}
        style={{
          borderRadius: `${borderRadius}px`,
        }}
      >
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `conic-gradient(from 0deg, ${gradientColors}, ${colorArray[0]})`,
            animation: `${keyframeId} ${duration}s linear infinite`,
            borderRadius: `${borderRadius}px`,
          }}
        />
        <div
          className="relative z-10 rounded-lg bg-background"
          style={{
            borderRadius: `${borderRadius - borderWidth}px`,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
} 