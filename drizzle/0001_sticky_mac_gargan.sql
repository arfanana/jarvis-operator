CREATE TABLE `aiGenerations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leadId` varchar(120),
	`businessName` varchar(200) NOT NULL,
	`kind` enum('outreach','audit','proposal') NOT NULL,
	`tone` varchar(32) NOT NULL,
	`promptVersion` varchar(32) NOT NULL,
	`prompt` text NOT NULL,
	`output` text NOT NULL,
	`model` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiGenerations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leadId` varchar(120),
	`recipient` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`providerMessageId` varchar(255),
	`error` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rateLimits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bucketStart` timestamp NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rateLimits_id` PRIMARY KEY(`id`),
	CONSTRAINT `rateLimitUserBucket` UNIQUE(`userId`,`bucketStart`)
);
