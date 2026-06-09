CREATE INDEX "idx_tarefa_entidade_id" ON "tarefa" USING btree ("entidade_id");--> statement-breakpoint
CREATE INDEX "idx_tarefa_entidade_tipo_id" ON "tarefa" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX "idx_tarefa_usuario_concluida" ON "tarefa" USING btree ("usuario_id","concluida");