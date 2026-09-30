-- Supabase ofrece además una API web propia para las tablas del esquema public, que se puede usar con la
-- clave pública del proyecto. La tienda no la usa (el backend se conecta directo a la base), así que se cierra:
-- se activa RLS sin políticas, con lo que esa API no puede leer ni cambiar nada, y se les sacan los permisos
-- a los usuarios públicos de Supabase (anon y authenticated). El backend no se ve afectado: es el dueño de las tablas.
-- Va última (999) para cubrir también las tablas de migraciones futuras. En una base sin Supabase solo activa RLS.

DO $$
DECLARE
  tabla record;
  hay_usuarios_publicos boolean :=
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
BEGIN
  FOR tabla IN
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND tableowner = current_user
  LOOP
    IF NOT tabla.rowsecurity THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla.tablename);
    END IF;

    IF hay_usuarios_publicos THEN
      IF has_table_privilege('anon', format('public.%I', tabla.tablename), 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
        OR has_table_privilege('authenticated', format('public.%I', tabla.tablename), 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
      THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabla.tablename);
      END IF;
    END IF;
  END LOOP;
END
$$;
