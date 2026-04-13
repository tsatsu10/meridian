import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const COLS_LG = 3;
const ROW_ESTIMATE_PX = 340;

type VirtualRow<T> = {
  items: T[];
};

function chunkTasks<T>(tasks: T[], perRow: number): VirtualRow<T>[] {
  const rows: VirtualRow<T>[] = [];
  for (let i = 0; i < tasks.length; i += perRow) {
    rows.push({ items: tasks.slice(i, i + perRow) });
  }
  return rows;
}

interface AllTasksVirtualGridProps<T extends { id: string }> {
  tasks: T[];
  renderTask: (task: T) => ReactNode;
  className?: string;
}

/**
 * Windowed grid for large pages: each virtual row renders up to 3 task cards (lg layout).
 */
export function AllTasksVirtualGrid<T extends { id: string }>({
  tasks,
  renderTask,
  className,
}: AllTasksVirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = chunkTasks(tasks, COLS_LG);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 2,
  });

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={cn("max-h-[min(70vh,900px)] overflow-auto pr-1", className)}
      role="list"
      aria-label="Task list"
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
                {row.items.map((task) => (
                  <div key={task.id} role="listitem">
                    {renderTask(task)}
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
