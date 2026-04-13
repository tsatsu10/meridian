import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import toKebabCase from "@/lib/to-kebab-case";
import type { ProjectWithTasks } from "@/types/project";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ColumnDropzone } from "./column-dropzone";
import ColumnHeader from "./column-header";
// Enhanced visual components
import { RippleButton } from "@/components/magicui/ripple-button";
import { BlurFade } from "@/components/magicui/blur-fade";

interface ColumnProps {
  column: ProjectWithTasks["columns"][number];
}

function Column({ column }: ColumnProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <BlurFade delay={0.1} inView>
      {/* 📱 MOBILE RESPONSIVE: Flexible column widths */}
      <div className="relative flex flex-col w-full sm:min-w-72 sm:w-72 h-full group">
        <CreateTaskModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          status={toKebabCase(column.name)}
        />

        {/* Simplified background */}
        <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm" />
        
        {/* Main column content */}
        <div className="relative flex flex-col h-full rounded-lg overflow-hidden">
          {/* Compact header */}
          <div className="relative p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
            <ColumnHeader column={column} />
          </div>

          {/* Compact task area */}
          <div className="relative flex-1 p-2 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="relative">
              <ColumnDropzone column={column} />
            </div>
          </div>

          {/* Compact add task button */}
          <div className="relative p-2 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
            <BlurFade delay={0.2} inView>
              <RippleButton
                onClick={() => setIsTaskModalOpen(true)}
                className="w-full text-left px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-800/50 hover:bg-white/70 dark:hover:bg-zinc-800/70 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 rounded-md transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-zinc-700 dark:text-zinc-200">
                    Add task
                  </span>
                </div>
              </RippleButton>
            </BlurFade>
          </div>
        </div>
      </div>
    </BlurFade>
  );
}

export default Column;
