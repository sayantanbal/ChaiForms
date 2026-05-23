ALTER TABLE "users" ADD COLUMN "neon_auth_user_id" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "device_fingerprint" varchar(64);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "device_type" varchar(32);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "os_name" varchar(80);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "os_version" varchar(40);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "browser_name" varchar(80);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "browser_version" varchar(40);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "device_vendor" varchar(80);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "device_model" varchar(120);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "geo_country" varchar(80);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "geo_region" varchar(80);--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "geo_city" varchar(120);--> statement-breakpoint
CREATE INDEX "responses_device_fingerprint_idx" ON "responses" USING btree ("device_fingerprint");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_neon_auth_user_id_unique" UNIQUE("neon_auth_user_id");