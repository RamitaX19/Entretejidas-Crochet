-- Envíos por Correo Argentino: el tipo elegido (clásico o express) y lo que se cobró por el envío.
-- El total del pedido ya incluye costo_envio. Los pedidos anteriores quedan sin tipo y con costo 0.
-- Solo agrega: se puede ejecutar más de una vez sin romper nada.

BEGIN;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS tipo_envio varchar(10) CHECK (tipo_envio IN ('clasico', 'express')),
  ADD COLUMN IF NOT EXISTS costo_envio integer NOT NULL DEFAULT 0 CHECK (costo_envio >= 0);

COMMIT;
