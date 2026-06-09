-- Remove per-corretora email uniqueness, make email globally unique
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "unq_corretora_email";
DROP INDEX IF EXISTS "idx_usuario_email";

ALTER TABLE "usuario" ADD CONSTRAINT "unq_usuario_email" UNIQUE("email");
CREATE INDEX "idx_usuario_email" ON "usuario" ("email");
