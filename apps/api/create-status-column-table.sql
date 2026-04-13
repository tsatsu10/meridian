-- Create status_column table manually
CREATE TABLE IF NOT EXISTS `status_column` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `color` text DEFAULT '#6b7280' NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `is_default` integer DEFAULT false NOT NULL,
  `is_archived` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT '"2025-06-03T21:03:19.919Z"' NOT NULL,
  `updated_at` integer DEFAULT '"2025-06-03T21:03:19.919Z"' NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE cascade ON DELETE cascade
); 