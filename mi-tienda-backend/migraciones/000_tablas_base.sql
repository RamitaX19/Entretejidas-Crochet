-- Tablas con las que arrancó la tienda. En una base nueva (por ejemplo, la de producción) las crea;
-- donde ya existen no hace nada. Las columnas que se sumaron después están en las migraciones siguientes.

BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
  id serial PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  email varchar(150) NOT NULL UNIQUE,
  contrasena varchar(255) NOT NULL,
  creado_en timestamp DEFAULT now(),
  es_admin boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS productos (
  id serial PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  precio integer NOT NULL,
  tipo varchar(20) NOT NULL,
  descripcion text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id serial PRIMARY KEY,
  producto_id integer NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  ruta varchar(255) NOT NULL,
  orden integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedidos (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id),
  total integer NOT NULL,
  creado_en timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id serial PRIMARY KEY,
  pedido_id integer NOT NULL REFERENCES pedidos(id),
  producto_id integer NOT NULL REFERENCES productos(id),
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario integer NOT NULL
);

COMMIT;
