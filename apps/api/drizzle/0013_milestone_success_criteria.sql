-- The frontend milestone form has always collected a required "Success
-- Criteria" field, but the milestone table had nowhere to store it (the
-- whole feature was never wired to this real backend - see the localStorage
-- fallback this PR replaces). Add the column so that data isn't dropped now
-- that milestones are persisted for real.
ALTER TABLE "milestone" ADD COLUMN "success_criteria" text;
--> statement-breakpoint

-- The "not_started" default and its documented "not_started/in_progress/
-- completed/blocked" vocabulary were never what the app actually reads or
-- writes (get-milestones.ts's stats calc has always checked "achieved"/
-- "upcoming"/"missed"). Align the default with the real vocabulary.
ALTER TABLE "milestone" ALTER COLUMN "status" SET DEFAULT 'upcoming';
