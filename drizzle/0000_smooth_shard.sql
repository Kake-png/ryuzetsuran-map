CREATE TABLE `abuse_buckets` (
	`key` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agaves` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`title` text NOT NULL,
	`species` text DEFAULT '不明' NOT NULL,
	`bloom_status` text NOT NULL,
	`observed_at` text NOT NULL,
	`previous_bloom_year` integer,
	`plant_count` integer,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`municipality` text NOT NULL,
	`location_name` text NOT NULL,
	`location_type` text NOT NULL,
	`access_note` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photo_key` text,
	`photo_alt` text,
	`submitter_relation` text NOT NULL,
	`permission_confirmed` integer DEFAULT false NOT NULL,
	`visibility` text DEFAULT 'approved' NOT NULL,
	`management_key_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agaves_public_id_unique` ON `agaves` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_agaves_visibility_status_observed` ON `agaves` (`visibility`,`bloom_status`,`observed_at`);--> statement-breakpoint
CREATE TABLE `change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`agave_public_id` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`details` text NOT NULL,
	`contact_email` text,
	`verified_submitter` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_requests_public_id_unique` ON `change_requests` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_change_requests_status_created` ON `change_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_change_requests_agave` ON `change_requests` (`agave_public_id`);