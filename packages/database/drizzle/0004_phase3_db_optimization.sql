CREATE TABLE "answers_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value_text" text,
	"value_number" double precision,
	"value_date" timestamp,
	"value_boolean" boolean,
	"value_json" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "answers_v2" ADD CONSTRAINT "answers_v2_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "answers_v2_response_id_idx" ON "answers_v2" USING btree ("response_id");
--> statement-breakpoint
CREATE INDEX "answers_v2_field_id_idx" ON "answers_v2" USING btree ("field_id");
--> statement-breakpoint
CREATE INDEX "answers_v2_text_idx" ON "answers_v2" USING btree ("field_id","value_text") WHERE value_text IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "answers_v2_number_idx" ON "answers_v2" USING btree ("field_id","value_number") WHERE value_number IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "answers_v2_date_idx" ON "answers_v2" USING btree ("field_id","value_date") WHERE value_date IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "forms_creator_status_visibility_idx" ON "forms" USING btree ("creator_id","status","visibility") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "forms_public_explore_idx" ON "forms" USING btree ("status","visibility","created_at" DESC) WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public';
--> statement-breakpoint
CREATE INDEX "responses_form_submitted_idx" ON "responses" USING btree ("form_id","submitted_at" DESC);
--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");
--> statement-breakpoint
CREATE MATERIALIZED VIEW "form_summary_stats" AS
SELECT
  f.id AS form_id,
  f.creator_id,
  COUNT(DISTINCT r.id)::int AS total_responses,
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.submitted_at >= NOW() - INTERVAL '7 days'
  )::int AS responses_last_7_days,
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.submitted_at >= NOW() - INTERVAL '30 days'
  )::int AS responses_last_30_days,
  AVG(EXTRACT(EPOCH FROM (r.submitted_at - r.started_at))) AS avg_duration_seconds,
  MAX(r.submitted_at) AS last_response_at
FROM forms f
LEFT JOIN responses r ON r.form_id = f.id
WHERE f.deleted_at IS NULL
GROUP BY f.id, f.creator_id;
--> statement-breakpoint
CREATE UNIQUE INDEX "form_summary_stats_form_id_idx" ON "form_summary_stats" (form_id);
