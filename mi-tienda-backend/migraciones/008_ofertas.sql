-- Ofertas: descuento en porcentaje de cada producto (0 = sin descuento). Vale también para sus variantes.
-- Los pedidos guardan el precio ya rebajado (pedido_items.precio_unitario).
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS oferta integer NOT NULL DEFAULT 0 CHECK (oferta BETWEEN 0 AND 90);

COMMIT;
