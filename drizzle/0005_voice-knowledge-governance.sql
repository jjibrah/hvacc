ALTER TABLE "knowledge_sources" ADD COLUMN "source_type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "content" text;
