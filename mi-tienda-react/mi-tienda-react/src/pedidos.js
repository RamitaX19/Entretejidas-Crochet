import { pedirApi } from "./api";

export const ESTADOS = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];

export const ESTADOS_PAGADOS = ["pagado", "enviado", "entregado"];

const NOMBRES_ESTADO = {
  pendiente: "Pendiente de pago",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function nombreEstado(estado, entrega) {
  if (estado === "enviado" && entrega === "retiro") return "Listo para retirar";
  return NOMBRES_ESTADO[estado];
}

export function nombreMetodoPago(metodo) {
  if (metodo === "transferencia") return "Transferencia";
  if (metodo === "mercadopago") return "Mercado Pago";
  return "Sin medio de pago";
}

export function formatearFecha(fecha) {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function pedirLinkMercadoPago(pedidoId) {
  try {
    const respuesta = await pedirApi(`/api/pedidos/${pedidoId}/mercadopago`, { method: "POST" });
    const datos = await respuesta.json();
    return respuesta.ok ? { url: datos.url } : { error: datos.error };
  } catch {
    return { error: "No se pudo conectar con el servidor. Probá de nuevo en un momento." };
  }
}
