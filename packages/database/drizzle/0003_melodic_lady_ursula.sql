CREATE TYPE "public"."workspace_role" AS ENUM('admin', 'creator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."form_scope" AS ENUM('global', 'workspace');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "scope" "form_scope" DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "requires_auth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family");--> statement-breakpoint
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forms_workspace_id_idx" ON "forms" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "forms_deleted_at_idx" ON "forms" USING btree ("deleted_at");