-- Categorías, variantes de productos (con precio y stock propios) y mensajes de contacto.
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

CREATE TABLE IF NOT EXISTS categorias (
  id serial PRIMARY KEY,
  nombre varchar(60) NOT NULL,
  creado_en timestamp DEFAULT now()
);

-- Único sin importar mayúsculas: no pueden convivir "Hilos" e "hilos".
CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_unico ON categorias (lower(nombre));

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS categoria_id integer REFERENCES categorias(id) ON DELETE SET NULL,
  -- Opciones de las variantes, por ejemplo [{"nombre": "Color", "valores": ["Rojo", "Azul"]}].
  ADD COLUMN IF NOT EXISTS opciones jsonb NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS producto_variantes (
  id serial PRIMARY KEY,
  producto_id integer NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  -- El valor elegido de cada opción, por ejemplo {"Color": "Rojo", "Talle": "M"}.
  valores jsonb NOT NULL,
  -- Vacío: usa el precio del producto. Vacío en stock: sin límite.
  precio integer CHECK (precio >= 1),
  stock integer CHECK (stock >= 0),
  orden integer NOT NULL DEFAULT 0,
  UNIQUE (producto_id, valores)
);

ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS variante_id integer REFERENCES producto_variantes(id) ON DELETE SET NULL,
  -- Copia del texto de la variante, para que el pedido lo conserve aunque la variante se borre.
  ADD COLUMN IF NOT EXISTS variante text;

CREATE TABLE IF NOT EXISTS mensajes (
  id serial PRIMARY KEY,
  tipo varchar(20) NOT NULL DEFAULT 'contacto' CHECK (tipo IN ('contacto', 'arrepentimiento')),
  nombre varchar(100) NOT NULL,
  email varchar(150) NOT NULL,
  telefono varchar(30),
  pedido integer,
  mensaje text NOT NULL DEFAULT '',
  leido boolean NOT NULL DEFAULT false,
  creado_en timestamp DEFAULT now()
);

COMMIT;
