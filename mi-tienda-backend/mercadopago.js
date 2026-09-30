const { MercadoPagoConfig, Payment } = require("mercadopago");

const API = "https://api.mercadopago.com";

function configurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function clavePublica() {
  return process.env.MP_PUBLIC_KEY || null;
}

async function pedirMercadoPago(ruta, opciones = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(`Mercado Pago respondió ${respuesta.status}: ${datos.message || "sin detalle"}`);
  }

  return datos;
}

// Mercado Pago no acepta direcciones locales para volver a la tienda.
function esDireccionLocal(url) {
  try {
    const { hostname } = new URL(url);
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch {
    return true;
  }
}

async function crearLinkDePago(pedido) {
  // Mercado Pago no acepta ítems con precio negativo: con cupón se cobra el pedido como un solo ítem.
  const items = pedido.descuento > 0
    ? [{
        id: `pedido-${pedido.id}`,
        title: `Pedido #${pedido.id} de Entretejidas`,
        quantity: 1,
        unit_price: pedido.total,
        currency_id: "ARS",
      }]
    : pedido.items.map((item) => ({
        id: String(item.id),
        title: item.variante ? `${item.nombre} (${item.variante})` : item.nombre,
        quantity: item.cantidad,
        unit_price: item.precioUnitario,
        currency_id: "ARS",
      }));

  const preferencia = {
    items,
    external_reference: `pedido-${pedido.id}`,
  };

  const frontend = process.env.FRONTEND_URL;

  if (frontend && !esDireccionLocal(frontend)) {
    const vuelta = `${frontend}/mis-pedidos?pedido=${pedido.id}`;
    preferencia.back_urls = { success: vuelta, pending: vuelta, failure: vuelta };
    preferencia.auto_return = "approved";
  }

  if (process.env.BACKEND_URL_PUBLICA) {
    preferencia.notification_url = `${process.env.BACKEND_URL_PUBLICA}/api/webhooks/mercadopago`;
  }

  const datos = await pedirMercadoPago("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(preferencia),
  });

  return process.env.MP_ACCESS_TOKEN.startsWith("TEST-") ? datos.sandbox_init_point : datos.init_point;
}

// Checkout API: cobra con el token que genera el formulario de tarjeta de Mercado Pago en el navegador.
function pagarConTarjeta(pedido, tarjeta) {
  // Configuración nueva en cada pago: el SDK guarda en ella las opciones de cada llamada
  // y así cada cobro lleva su propia clave de idempotencia (la genera el SDK).
  const cliente = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const identificacion = tarjeta.payer?.identification;

  return new Payment(cliente).create({
    body: {
      transaction_amount: pedido.total,
      token: tarjeta.token,
      description: `Pedido #${pedido.id} de Entretejidas`,
      installments: Number(tarjeta.installments) || 1,
      payment_method_id: tarjeta.payment_method_id,
      issuer_id: tarjeta.issuer_id ? Number(tarjeta.issuer_id) : undefined,
      payer: {
        email: tarjeta.payer?.email || pedido.email,
        identification: identificacion?.number
          ? { type: identificacion.type, number: identificacion.number }
          : undefined,
      },
      external_reference: `pedido-${pedido.id}`,
      notification_url: process.env.BACKEND_URL_PUBLICA
        ? `${process.env.BACKEND_URL_PUBLICA}/api/webhooks/mercadopago`
        : undefined,
    },
  });
}

// Devuelve el pago aprobado del pedido o, si no hay, el último intento.
async function buscarPago(pedidoId) {
  const datos = await pedirMercadoPago(
    `/v1/payments/search?external_reference=pedido-${pedidoId}&sort=date_created&criteria=desc`
  );
  const pagos = datos.results || [];
  return pagos.find((pago) => pago.status === "approved") || pagos[0] || null;
}

function obtenerPago(id) {
  return pedirMercadoPago(`/v1/payments/${id}`);
}

function pedidoDeReferencia(referencia) {
  const coincidencia = /^pedido-(\d+)$/.exec(referencia || "");
  return coincidencia ? Number(coincidencia[1]) : null;
}

module.exports = {
  configurado,
  clavePublica,
  crearLinkDePago,
  pagarConTarjeta,
  buscarPago,
  obtenerPago,
  pedidoDeReferencia,
};
