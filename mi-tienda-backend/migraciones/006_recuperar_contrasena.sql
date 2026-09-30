-- Links para crear una contraseña nueva ("¿Olvidaste tu contraseña?").
-- Se guarda el hash del código, nunca el código: el que llega por correo es el único que sirve.
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

CREATE TABLE IF NOT EXISTS recuperaciones (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash char(64) NOT NULL UNIQUE,
  expira timestamp NOT NULL,
  usado_en timestamp,
  creado_en timestamp DEFAULT now()
);

COMMIT;
