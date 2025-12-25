CREATE TABLE "pelican"."generation_images" (
	"gen_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	CONSTRAINT "generation_images_gen_id_image_id_pk" PRIMARY KEY("gen_id","image_id")
);
--> statement-breakpoint
ALTER TABLE "pelican"."images" DROP CONSTRAINT "images_gen_id_generations_id_fk";
--> statement-breakpoint
ALTER TABLE "pelican"."generation_images" ADD CONSTRAINT "generation_images_gen_id_generations_id_fk" FOREIGN KEY ("gen_id") REFERENCES "pelican"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generation_images" ADD CONSTRAINT "generation_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "pelican"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."images" DROP COLUMN "gen_id";