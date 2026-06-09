DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELAMENTO' AND enumtypid = 'tipo_endosso'::regtype) THEN
    ALTER TYPE "public"."tipo_endosso" ADD VALUE 'CANCELAMENTO' BEFORE 'OUTROS';
  END IF;
END $$;
