import { describe, it, expect } from "vitest";
import { transformStats, type DashboardStats } from "../use-dashboard-data";

describe("transformStats", () => {
  it("returns a shallow copy of stats without mutating inputs", () => {
    const stats: DashboardStats = {
      totalTasks: 10,
      completedTasks: 4,
      overdueTasks: 1,
      dueTodayTasks: 2,
      activeProjects: 3,
      teamMembers: 5,
      productivity: 40,
    };
    const out = transformStats(stats);
    expect(out).toEqual(stats);
    expect(out).not.toBe(stats);
  });

  it("does not inflate productivity or other KPIs for display variants", () => {
    const stats: DashboardStats = {
      totalTasks: 100,
      completedTasks: 50,
      overdueTasks: 0,
      activeProjects: 2,
      teamMembers: 4,
      productivity: 50,
    };
    const out = transformStats(stats);
    expect(out.productivity).toBe(50);
    expect(out.teamMembers).toBe(4);
    expect(out.totalTasks).toBe(100);
  });
});
