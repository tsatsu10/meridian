import type { ProjectWithTasks } from "@/types/project";
import type { TaskWithSubtasks } from "@/types/task";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskCard from "../task-card";

interface ColumnDropzoneProps {
  column: ProjectWithTasks["columns"][number];
}

export function ColumnDropzone({ column }: ColumnDropzoneProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  // Only render parent tasks - subtasks are shown in expanded view within parent cards
  const renderParentTasks = (tasks: TaskWithSubtasks[]) => {
    return tasks.map((task) => (
      <TaskCard 
        key={task.id} 
        task={task} 
        hierarchyLevel={0}
      />
    ));
  };

  // Get parent task IDs only for sortable context
  const getParentTaskIds = (tasks: TaskWithSubtasks[]): string[] => {
    return tasks.map(task => task.id);
  };

  return (
    <div ref={setNodeRef} className="flex-1">
      <SortableContext
        items={getParentTaskIds(column.tasks)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {renderParentTasks(column.tasks)}
        </div>
      </SortableContext>
    </div>
  );
}
