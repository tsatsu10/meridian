-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATETIME,
    "number" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "createdAt", "description", "dueDate", "id", "number", "priority", "projectId", "status", "title", "updatedAt") SELECT "assigneeId", "createdAt", "description", "dueDate", "id", "number", "priority", "projectId", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE UNIQUE INDEX "Task_projectId_number_key" ON "Task"("projectId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
