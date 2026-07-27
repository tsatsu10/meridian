export function calculateNextRun(
  frequency: string,
  time: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date();
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);

  if (frequency === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (
    frequency === "weekly" &&
    dayOfWeek !== null &&
    dayOfWeek !== undefined
  ) {
    const currentDay = now.getDay();
    const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
    // daysUntilNext === 0 means today - land on today first (not "|| 7",
    // which would always skip straight to next week even when today's
    // scheduled time hasn't happened yet); push a week out only once
    // today's slot has actually passed.
    next.setDate(now.getDate() + daysUntilNext);
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
  } else if (
    frequency === "monthly" &&
    dayOfMonth !== null &&
    dayOfMonth !== undefined
  ) {
    next.setDate(dayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}
