-- Cupones de descuento y el descuento aplicado en cada pedido.
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

CREATE TABLE IF NOT EXISTS cupones (
  id serial PRIMARY KEY,
  codigo varchar(30) NOT NULL UNIQUE,
  porcentaje integer NOT NULL CHECK (porcentaje BETWEEN 1 AND 100),
  usos_maximos integer CHECK (usos_maximos >= 1),
  usos integer NOT NULL DEFAULT 0 CHECK (usos >= 0),
  vence date,
  creado_en timestamp DEFAULT now(),
  CHECK (usos_maximos IS NULL OR usos <= usos_maximos)
);

-- Se guarda el código (no una referencia) para que el pedido conserve el dato aunque se borre el cupón.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS cupon varchar(30),
  ADD COLUMN IF NOT EXISTS descuento integer NOT NULL DEFAULT 0 CHECK (descuento >= 0);

COMMIT;
