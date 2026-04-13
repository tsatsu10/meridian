/**
 * 🛠️ Seed Utilities
 * 
 * Helper functions for generating realistic seed data
 */

import { createId } from "@paralleldrive/cuid2";

// ==========================================
// RANDOM DATA GENERATORS
// ==========================================

/**
 * Generate random date between start and end
 */
export function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

/**
 * Get random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random boolean with configurable probability
 */
export function randomBool(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Get multiple random elements from array
 */
export function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Get date N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get date N hours ago
 */
export function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

// ==========================================
// NAME GENERATORS
// ==========================================

const FIRST_NAMES = [
  "Alex", "Blake", "Casey", "Drew", "Emerson", "Finley", "Gray", "Harper",
  "Indigo", "Jordan", "Kelly", "Logan", "Morgan", "Noah", "Oakley", "Parker",
  "Quinn", "Riley", "Sage", "Taylor", "Uma", "Val", "Winter", "Yael", "Zion"
];

const LAST_NAMES = [
  "Anderson", "Bennett", "Carter", "Davis", "Evans", "Foster", "Garcia", "Harris",
  "Ingram", "Johnson", "Kumar", "Lee", "Martinez", "Nelson", "O'Brien", "Patel",
  "Quinn", "Rodriguez", "Smith", "Taylor", "Upton", "Vega", "Williams", "Xu", "Young"
];

export function generateUserName(): string {
  const first = randomElement(FIRST_NAMES);
  const last = randomElement(LAST_NAMES);
  return `${first} ${last}`;
}

export function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/['\s]/g, '.');
  return `${cleanName}@meridian.app`;
}

// ==========================================
// PROJECT & TASK GENERATORS
// ==========================================

const PROJECT_PREFIXES = [
  "Customer", "Product", "Platform", "Mobile", "Web", "API", "Infrastructure",
  "Analytics", "Security", "Performance", "Integration", "Migration"
];

const PROJECT_SUFFIXES = [
  "Portal", "Dashboard", "System", "App", "Service", "Engine", "Framework",
  "Platform", "Solution", "Suite", "Tools", "Upgrade", "Optimization"
];

export function generateProjectName(): string {
  const prefix = randomElement(PROJECT_PREFIXES);
  const suffix = randomElement(PROJECT_SUFFIXES);
  return `${prefix} ${suffix}`;
}

const TASK_VERBS = [
  "Implement", "Design", "Refactor", "Optimize", "Debug", "Test", "Deploy",
  "Configure", "Update", "Migrate", "Document", "Review", "Fix", "Add",
  "Remove", "Improve", "Analyze", "Research", "Create", "Build"
];

const TASK_SUBJECTS = [
  "authentication system", "user interface", "API endpoints", "database schema",
  "error handling", "form validation", "navigation menu", "search functionality",
  "notification system", "payment integration", "analytics tracking", "mobile layout",
  "dashboard widgets", "user permissions", "file upload", "real-time updates",
  "email templates", "performance metrics", "security headers", "accessibility features"
];

export function generateTaskTitle(): string {
  const verb = randomElement(TASK_VERBS);
  const subject = randomElement(TASK_SUBJECTS);
  return `${verb} ${subject}`;
}

export function generateTaskDescription(): string {
  const descriptions = [
    "This task requires implementation of core functionality with proper error handling and test coverage.",
    "Focus on user experience and ensure mobile responsiveness across all screen sizes.",
    "Integrate with existing systems and maintain backward compatibility.",
    "Optimize for performance and reduce bundle size where possible.",
    "Follow established design patterns and coding standards.",
    "Include comprehensive unit tests and integration tests.",
    "Document API endpoints and update technical specifications.",
    "Coordinate with design team for UI/UX approval.",
    "Review security implications and ensure data protection.",
    "Consider edge cases and handle errors gracefully.",
  ];
  return randomElement(descriptions);
}

// ==========================================
// STATUS & PRIORITY HELPERS
// ==========================================

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const PROJECT_STATUSES = ['planning', 'active', 'in_progress', 'on_hold', 'completed', 'archived'] as const;

/**
 * Get realistic task status distribution
 */
export function getTaskStatus(weights: { todo?: number; in_progress?: number; done?: number } = {}): typeof TASK_STATUSES[number] {
  const { todo = 30, in_progress = 40, done = 30 } = weights;
  const rand = Math.random() * 100;
  
  if (rand < todo) return 'todo';
  if (rand < todo + in_progress) return 'in_progress';
  return 'done';
}

/**
 * Get realistic priority distribution
 */
export function getPriority(): typeof PRIORITIES[number] {
  const rand = Math.random() * 100;
  if (rand < 15) return 'urgent';
  if (rand < 40) return 'high';
  if (rand < 75) return 'medium';
  return 'low';
}

// ==========================================
// DATE HELPERS
// ==========================================

/**
 * Generate realistic due date for a task
 */
export function generateDueDate(createdAt: Date): Date | null {
  // 30% of tasks have no due date
  if (randomBool(0.3)) return null;
  
  // Due dates between 1-30 days from creation
  const daysUntilDue = randomInt(1, 30);
  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + daysUntilDue);
  return dueDate;
}

/**
 * Generate completed date for done tasks
 */
export function generateCompletedDate(createdAt: Date, dueDate: Date | null): Date {
  const startTime = createdAt.getTime();
  const endTime = dueDate ? dueDate.getTime() : Date.now();
  
  // Completed somewhere between creation and due date
  const completedTime = startTime + Math.random() * (endTime - startTime);
  return new Date(completedTime);
}

// ==========================================
// GAMIFICATION HELPERS
// ==========================================

/**
 * Generate realistic streak data for a user
 */
export function generateStreakData(baseStreak: number = 0) {
  const currentStreak = baseStreak || randomInt(3, 20);
  const longestStreak = currentStreak + randomInt(0, 15);
  const totalActiveDays = longestStreak + randomInt(10, 50);
  
  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    lastActivityDate: new Date(),
    streakStartDate: daysAgo(currentStreak),
    freezesRemaining: randomBool(0.3) ? randomInt(1, 3) : 0,
  };
}

/**
 * Calculate achievement progress
 */
export function calculateAchievementProgress(current: number, target: number) {
  return Math.min(100, Math.floor((current / target) * 100));
}

/**
 * Generate leaderboard score based on activities
 */
export function calculateLeaderboardScore(activities: {
  tasksCompleted?: number;
  goalsCompleted?: number;
  kudosGiven?: number;
  kudosReceived?: number;
  streakDays?: number;
  achievementsUnlocked?: number;
}) {
  const {
    tasksCompleted = 0,
    goalsCompleted = 0,
    kudosGiven = 0,
    kudosReceived = 0,
    streakDays = 0,
    achievementsUnlocked = 0,
  } = activities;
  
  return (
    tasksCompleted * 10 +
    goalsCompleted * 100 +
    kudosGiven * 5 +
    kudosReceived * 10 +
    streakDays * 2 +
    achievementsUnlocked * 50
  );
}

// ==========================================
// BATCH INSERT HELPER
// ==========================================

/**
 * Batch insert with progress logging
 */
export async function batchInsert<T extends { id: string }>(
  insertFn: (batch: T[]) => Promise<any>,
  items: T[],
  batchSize: number = 100,
  label: string = "items"
): Promise<void> {
  const totalBatches = Math.ceil(items.length / batchSize);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    await insertFn(batch);
    console.log(`  ✅ Batch ${batchNum}/${totalBatches}: Inserted ${batch.length} ${label}`);
  }
}

// ==========================================
// COLOR GENERATORS
// ==========================================

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export function randomColor(): string {
  return randomElement(COLORS);
}

// ==========================================
// TEXT GENERATORS
// ==========================================

export function generateDescription(type: 'project' | 'task' | 'goal'): string {
  const projectDescriptions = [
    "Strategic initiative to enhance platform capabilities and user experience.",
    "Critical system upgrade to improve performance and scalability.",
    "Customer-facing feature development with emphasis on usability.",
    "Internal tooling improvements for development team efficiency.",
    "Infrastructure modernization and technical debt reduction.",
  ];
  
  const taskDescriptions = [
    "Implementation requires careful consideration of edge cases and error handling.",
    "Coordinate with design team for UI/UX approval before implementation.",
    "Ensure backward compatibility with existing integrations.",
    "Add comprehensive test coverage including unit and integration tests.",
    "Review security implications and follow OWASP best practices.",
    "Optimize for performance and minimize bundle size impact.",
    "Document changes in technical specification and update API docs.",
  ];
  
  const goalDescriptions = [
    "Measurable objective aligned with quarterly business priorities.",
    "Personal development goal to enhance skills and capabilities.",
    "Team goal focused on collaboration and delivery excellence.",
    "Strategic initiative supporting long-term organizational growth.",
  ];
  
  switch (type) {
    case 'project': return randomElement(projectDescriptions);
    case 'task': return randomElement(taskDescriptions);
    case 'goal': return randomElement(goalDescriptions);
  }
}

// ==========================================
// EXPORTS
// ==========================================

export const seedUtils = {
  randomDate,
  randomElement,
  randomElements,
  randomInt,
  randomBool,
  daysAgo,
  hoursAgo,
  generateUserName,
  generateEmail,
  generateProjectName,
  generateTaskTitle,
  generateTaskDescription,
  generateDescription,
  getTaskStatus,
  getPriority,
  generateDueDate,
  generateCompletedDate,
  generateStreakData,
  calculateAchievementProgress,
  calculateLeaderboardScore,
  batchInsert,
  randomColor,
};

export default seedUtils;

