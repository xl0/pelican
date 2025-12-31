ALTER TABLE "pelican"."generations" DROP CONSTRAINT "generations_provider_id_llm_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "pelican"."generations" DROP CONSTRAINT "generations_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "pelican"."generations" DROP COLUMN "provider_id";--> statement-breakpoint
ALTER TABLE "pelican"."generations" DROP COLUMN "model_id";