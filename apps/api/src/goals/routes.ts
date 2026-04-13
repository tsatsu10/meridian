/**
 * 🎯 Goal Setting API Routes
 * 
 * Routes for goal management (CRUD operations)
 */

import { Hono } from "hono";
import { createGoal } from "./controllers/create-goal";
import { getGoals } from "./controllers/get-goals";
import { getGoalDetail } from "./controllers/get-goal-detail";
import { updateGoal } from "./controllers/update-goal";
import { deleteGoal } from "./controllers/delete-goal";
import { addKeyResult } from "./controllers/add-key-result";
import { updateKeyResult } from "./controllers/update-key-result";
import { deleteKeyResult } from "./controllers/delete-key-result";
import { logProgress } from "./controllers/log-progress";
import { getProgressHistory } from "./controllers/get-progress-history";
import { getGoalAnalytics } from "./controllers/get-goal-analytics";
import { getTeamGoals } from "./controllers/get-team-goals";
import { getTeamProgress } from "./controllers/get-team-progress";
import { createMilestone } from "./controllers/create-milestone";
import { getMilestones } from "./controllers/get-milestones";
import { getUpcomingMilestones } from "./controllers/get-upcoming-milestones";
import { updateMilestone } from "./controllers/update-milestone";
import { createReflection } from "./controllers/create-reflection";
import { getReflections } from "./controllers/get-reflections";

const app = new Hono();

// Note: Auth middleware should be applied at the parent level when mounting these routes

// Core Goal CRUD
app.post('/', createGoal);                        // POST /api/goals
app.get('/:workspaceId', getGoals);              // GET /api/goals/:workspaceId
app.get('/detail/:id', getGoalDetail);           // GET /api/goals/detail/:id
app.put('/:id', updateGoal);                     // PUT /api/goals/:id
app.delete('/:id', deleteGoal);                  // DELETE /api/goals/:id

// Key Results Management
app.post('/:id/key-results', addKeyResult);      // POST /api/goals/:id/key-results
app.put('/key-results/:id', updateKeyResult);    // PUT /api/goals/key-results/:id
app.delete('/key-results/:id', deleteKeyResult); // DELETE /api/goals/key-results/:id

// Progress Tracking & Analytics
app.post('/:id/progress', logProgress);          // POST /api/goals/:id/progress
app.get('/:id/progress', getProgressHistory);    // GET /api/goals/:id/progress
app.get('/:id/analytics', getGoalAnalytics);     // GET /api/goals/:id/analytics

// Team Goals
app.get('/team/:teamId', getTeamGoals);          // GET /api/goals/team/:teamId
app.get('/team/:teamId/progress', getTeamProgress); // GET /api/goals/team/:teamId/progress

// Milestones
app.post('/milestones', createMilestone);        // POST /api/goals/milestones
app.get('/milestones/:userId', getMilestones);   // GET /api/goals/milestones/:userId
app.get('/milestones/countdown/upcoming', getUpcomingMilestones); // GET /api/goals/milestones/countdown/upcoming
app.put('/milestones/:id', updateMilestone);     // PUT /api/goals/milestones/:id

// Reflections
app.post('/:id/reflections', createReflection);  // POST /api/goals/:id/reflections
app.get('/:id/reflections', getReflections);     // GET /api/goals/:id/reflections

export default app;


