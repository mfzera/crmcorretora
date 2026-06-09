ALTER TABLE "admin" ADD COLUMN "totp_secret" varchar(255);--> statement-breakpoint
ALTER TABLE "admin" ADD COLUMN "totp_enabled" boolean DEFAULT false NOT NULL;