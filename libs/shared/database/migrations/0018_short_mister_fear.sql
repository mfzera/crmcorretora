ALTER TABLE "changelogs" ADD COLUMN "published_by_id" uuid;--> statement-breakpoint
ALTER TABLE "changelogs" ADD CONSTRAINT "changelogs_published_by_id_admin_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelogs" DROP COLUMN "published_by";