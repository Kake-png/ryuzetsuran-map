CREATE TABLE `location_restrictions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_request_public_id` text NOT NULL,
	`agave_public_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radius_meters` integer DEFAULT 75 NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`match_count` integer DEFAULT 0 NOT NULL,
	`last_matched_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_restrictions_source_request_public_id_unique` ON `location_restrictions` (`source_request_public_id`);--> statement-breakpoint
CREATE INDEX `idx_location_restrictions_status_latitude_longitude` ON `location_restrictions` (`status`,`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `idx_location_restrictions_agave` ON `location_restrictions` (`agave_public_id`);--> statement-breakpoint
ALTER TABLE `change_requests` ADD `reporter_hash` text;--> statement-breakpoint
ALTER TABLE `change_requests` ADD `outcome` text;--> statement-breakpoint
ALTER TABLE `change_requests` ADD `resolution_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `change_requests` ADD `restrict_location` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `change_requests` ADD `hidden_at` text;--> statement-breakpoint
ALTER TABLE `change_requests` ADD `contact_erased_at` text;--> statement-breakpoint
PRAGMA optimize;
