import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface HealthGaugeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function HealthGauge({
  score,
  size = "md",
  showLabel = true,
  animated = true,
  className,
}: HealthGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeMap = {
    sm: { diameter: 120, lineWidth: 8, fontSize: 16 },
    md: { diameter: 180, lineWidth: 12, fontSize: 24 },
    lg: { diameter: 240, lineWidth: 16, fontSize: 32 },
  };

  const config = sizeMap[size];
  const radius = config.diameter / 2;

  // Determine color based on score
  const getColorForScore = (s: number) => {
    if (s >= 80) return { stroke: "#22c55e", label: "Excellent" }; // green
    if (s >= 60) return { stroke: "#3b82f6", label: "Good" }; // blue
    if (s >= 40) return { stroke: "#f59e0b", label: "Fair" }; // amber
    return { stroke: "#ef4444", label: "Critical" }; // red
  };

  const { stroke: strokeColor, label: statusLabel } = getColorForScore(score);

  // Draw gauge
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = config.diameter * dpr;
    canvas.height = config.diameter * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, config.diameter, config.diameter);

    const centerX = config.diameter / 2;
    const centerY = config.diameter / 2;
    const arcRadius = radius - config.lineWidth / 2;

    // Draw background arc (light gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, arcRadius, -Math.PI / 2, (Math.PI * 3) / 2);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = config.lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw score arc
    const animatedScore = animated ? Math.min(score, 100) : score;
    const endAngle = -Math.PI / 2 + (animatedScore / 100) * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, arcRadius, -Math.PI / 2, endAngle);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = config.lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw center circle (white background)
    ctx.beginPath();
    ctx.arc(centerX, centerY, arcRadius - config.lineWidth * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Draw text
    ctx.fillStyle = "#1f2937";
    ctx.font = `bold ${config.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(animatedScore).toString(), centerX, centerY - config.fontSize / 4);

    // Draw label
    ctx.fillStyle = "#6b7280";
    ctx.font = `14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`;
    ctx.fillText("Health Score", centerX, centerY + config.fontSize / 2 + 8);
  }, [score, config, strokeColor, animated]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <canvas ref={canvasRef} width={config.diameter} height={config.diameter} />
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {statusLabel}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {score >= 80 && "Performing well"}
            {score >= 60 && score < 80 && "Monitor performance"}
            {score >= 40 && score < 60 && "Needs attention"}
            {score < 40 && "Critical issues"}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact health gauge - icon-only version without label
 */
export function HealthGaugeCompact({
  score,
  size = "sm",
  className,
}: Omit<HealthGaugeProps, "showLabel">) {
  return <HealthGauge score={score} size={size} showLabel={false} className={className} />;
}
