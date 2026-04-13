import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const COLS_LG = 3;
const ROW_ESTIMATE_PX = 360;

type VirtualRow<T> = { items: T[] };

function chunkProjects<T>(items: T[], perRow: number): VirtualRow<T>[] {
  const rows: VirtualRow<T>[] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push({ items: items.slice(i, i + perRow) });
  }
  return rows;
}

interface ProjectsVirtualGridProps<T extends { id: string }> {
  projects: T[];
  renderProject: (project: T) => ReactNode;
  className?: string;
}

/**
 * Windowed grid for large project pages (mirrors All Tasks virtual grid).
 */
export function ProjectsVirtualGrid<T extends { id: string }>({
  projects,
  renderProject,
  className,
}: ProjectsVirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = chunkProjects(projects, COLS_LG);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 2,
  });

  if (projects.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("max-h-[min(70vh,900px)] overflow-auto pr-1", className)}
      role="list"
      aria-label="Projects grid"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const row = rows[vRow.index];
          return (
            <div
              key={vRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                {row.items.map((p) => (
                  <div key={p.id} role="listitem">
                    {renderProject(p)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
