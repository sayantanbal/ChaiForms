-- Rename existing table
ALTER TABLE "responses" RENAME TO "responses_old";

-- Drop foreign key on old table to prevent issues when dropping
ALTER TABLE "responses_old" DROP CONSTRAINT "responses_form_id_forms_id_fk";

-- Create new partitioned table
CREATE TABLE "responses" (
	"id" uuid NOT NULL DEFAULT gen_random_uuid(),
	"form_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"submitted_at" timestamp NOT NULL DEFAULT now(),
	"respondent_email" text,
	"unlock_token" text,
	"ip_address" text,
	"user_agent" text,
	"device_fingerprint" varchar(64),
	"device_type" varchar(32),
	"os_name" varchar(80),
	"os_version" varchar(40),
	"browser_name" varchar(80),
	"browser_version" varchar(40),
	"device_vendor" varchar(80),
	"device_model" varchar(120),
	"latitude" double precision,
	"longitude" double precision,
	"geo_country" varchar(80),
	"geo_region" varchar(80),
	"geo_city" varchar(120),
    PRIMARY KEY ("id", "submitted_at")
) PARTITION BY RANGE ("submitted_at");

-- Create default partition for existing data and catch-all
CREATE TABLE "responses_default" PARTITION OF "responses" DEFAULT;

-- Insert existing data
INSERT INTO "responses" SELECT * FROM "responses_old";

-- Create indexes
CREATE INDEX "responses_form_id_idx" ON "responses" ("form_id");
CREATE INDEX "responses_submitted_at_idx" ON "responses" ("submitted_at");
CREATE INDEX "responses_device_fingerprint_idx" ON "responses" ("device_fingerprint");

-- Add foreign key constraint
ALTER TABLE "responses" ADD CONSTRAINT "responses_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE cascade ON UPDATE no action;

-- Drop old table
DROP TABLE "responses_old";
