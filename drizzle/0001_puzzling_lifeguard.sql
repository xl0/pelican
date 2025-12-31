CREATE TABLE "pelican"."models" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"input_price" real DEFAULT 0 NOT NULL,
	"output_price" real DEFAULT 0 NOT NULL,
	"supports_images" boolean DEFAULT true NOT NULL,
	CONSTRAINT "models_provider_id_value_unique" UNIQUE("provider_id","value")
);
--> statement-breakpoint
CREATE TABLE "pelican"."llm_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pelican"."generations" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "model_id" integer;--> statement-breakpoint
ALTER TABLE "pelican"."models" ADD CONSTRAINT "models_provider_id_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "pelican"."llm_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD CONSTRAINT "generations_provider_id_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "pelican"."llm_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD CONSTRAINT "generations_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "pelican"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP TYPE "pelican"."providers";