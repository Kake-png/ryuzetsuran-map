CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`agave_public_id` text NOT NULL,
	`bloom_status` text NOT NULL,
	`observed_at` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photo_key` text,
	`photo_alt` text,
	`verified_submitter` integer DEFAULT false NOT NULL,
	`visibility` text DEFAULT 'approved' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `observations_public_id_unique` ON `observations` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_observations_agave_visibility_date` ON `observations` (`agave_public_id`,`visibility`,`observed_at`);--> statement-breakpoint
PRAGMA optimize;
