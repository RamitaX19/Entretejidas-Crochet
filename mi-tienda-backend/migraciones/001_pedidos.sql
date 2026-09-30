-- Estado, pago y entrega de los pedidos; stock y archivo descargable de los productos.
-- Solo agrega columnas: se puede ejecutar más de una vez sin romper nada.

BEGIN;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS stock integer CHECK (stock >= 0),
  ADD COLUMN IF NOT EXISTS archivo text,
  ADD COLUMN IF NOT EXISTS archivo_nombre text;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  ADD COLUMN IF NOT EXISTS metodo_pago varchar(20)
    CHECK (metodo_pago IN ('transferencia', 'mercadopago')),
  ADD COLUMN IF NOT EXISTS mp_pago_id varchar(50),
  ADD COLUMN IF NOT EXISTS entrega varchar(10)
    CHECK (entrega IN ('envio', 'retiro')),
  ADD COLUMN IF NOT EXISTS destinatario text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS codigo_postal text;

-- Marca si al comprar se descontó stock, para devolverlo solo en ese caso al cancelar.
ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS stock_descontado boolean NOT NULL DEFAULT false;

COMMIT;
