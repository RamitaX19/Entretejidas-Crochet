-- Subcategorías: una categoría puede ir dentro de otra (por ejemplo Hilos > Hilos gross).
-- Hay dos niveles, categoría principal y subcategoría: eso lo controla el backend.
-- Se puede ejecutar más de una vez sin romper nada.

BEGIN;

-- Al borrar una categoría se borran sus subcategorías; los productos quedan sin categoría (no se borran).
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS padre_id integer REFERENCES categorias(id) ON DELETE CASCADE;

-- El nombre ya no tiene que ser único en toda la tienda sino dentro de cada categoría:
-- puede haber "Gruesos" en Hilos y también en Lanas.
DROP INDEX IF EXISTS categorias_nombre_unico;
CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_unico_por_padre ON categorias (COALESCE(padre_id, 0), lower(nombre));

COMMIT;
