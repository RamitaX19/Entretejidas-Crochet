-- Fotos y archivos digitales guardados en la base (en Render, lo que se guarda en disco se borra al reiniciar).
-- Las fotos que ya estaban en la carpeta uploads/ y los archivos de archivos/ se siguen leyendo de ahí.
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

ALTER TABLE producto_imagenes
  ADD COLUMN IF NOT EXISTS datos bytea,
  ADD COLUMN IF NOT EXISTS tipo varchar(50);

-- Un archivo por producto digital. productos.archivo_nombre sigue teniendo el nombre que ve el cliente.
CREATE TABLE IF NOT EXISTS producto_archivos (
  producto_id integer PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
  tipo varchar(100) NOT NULL,
  datos bytea NOT NULL,
  creado_en timestamp DEFAULT now()
);

COMMIT;
