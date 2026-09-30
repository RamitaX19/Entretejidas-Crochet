// Correos a los clientes con Resend: pedido recibido, cambios de estado y botón de arrepentimiento.
// Sin RESEND_API_KEY no se manda nada. Un correo que falla nunca corta la tienda: queda anotado en el log.
const { Resend } = require("resend");

const TIENDA = "Entretejidas";
// Sin un dominio propio verificado en Resend solo se puede mandar desde onboarding@resend.dev,
// y esos correos únicamente le llegan al email de la cuenta de Resend (sirve para probar).
const REMITENTE_DE_PRUEBA = `${TIENDA} <onboarding@resend.dev>`;

const COLOR = "#1f3a5f";
const GRIS = "#5b6472";
const LINEA = "#d9dee6";

let resend = null;

function configurado() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function enviar({ para, asunto, titulo, bloques, clave }) {
  if (!configurado()) return;

  resend ??= new Resend(process.env.RESEND_API_KEY);
  const { html, texto } = armar(titulo, bloques);

  try {
    const { error } = await resend.emails.send(
      {
        from: process.env.EMAIL_REMITENTE || REMITENTE_DE_PRUEBA,
        to: para,
        replyTo: process.env.EMAIL_RESPONDER_A || undefined,
        subject: asunto,
        html,
        text: texto,
      },
      // Si el mismo aviso se pide dos veces en 24 horas, Resend lo manda una sola vez.
      { idempotencyKey: clave },
    );
    if (error) console.error(`No se pudo mandar el correo "${asunto}":`, error.message);
  } catch (error) {
    console.error(`No se pudo mandar el correo "${asunto}":`, error.message);
  }
}

function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pesos(monto) {
  return `$${Number(monto).toLocaleString("es-AR")}`;
}

function enlace(ruta) {
  const frontend = process.env.FRONTEND_URL;
  return frontend ? `${frontend.replace(/\/+$/, "")}${ruta}` : null;
}

// Cada bloque del correo tiene su versión HTML y su versión de texto plano.
function parrafo(texto) {
  return { html: `<p style="margin:0 0 16px;line-height:1.5">${escapar(texto)}</p>`, texto };
}

function datos(filas) {
  const visibles = filas.filter(([, valor]) => valor);
  return {
    html: `<table role="presentation" style="margin:0 0 16px;border-collapse:collapse">${visibles
      .map(
        ([etiqueta, valor]) =>
          `<tr><td style="padding:3px 16px 3px 0;color:${GRIS}">${escapar(etiqueta)}</td><td style="padding:3px 0"><strong>${escapar(valor)}</strong></td></tr>`,
      )
      .join("")}</table>`,
    texto: visibles.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`).join("\n"),
  };
}

function boton(texto, url) {
  if (!url) return null;
  return {
    html: `<p style="margin:24px 0"><a href="${escapar(url)}" style="background:${COLOR};color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${escapar(texto)}</a></p>`,
    texto: `${texto}: ${url}`,
  };
}

function detalle(pedido) {
  const renglones = pedido.items.map((item) => ({
    nombre: `${item.nombre}${item.variante ? ` (${item.variante})` : ""}${item.tipo === "digital" ? " (digital)" : ` ×${item.cantidad}`}`,
    importe: item.cantidad * item.precioUnitario,
  }));
  const subtotal = renglones.reduce((suma, renglon) => suma + renglon.importe, 0);
  const totales = pedido.descuento > 0
    ? [["Subtotal", pesos(subtotal)], [`Cupón ${pedido.cupon}`, `−${pesos(pedido.descuento)}`], ["Total", pesos(pedido.total)]]
    : [["Total", pesos(pedido.total)]];
  const celda = `padding:6px 0;border-bottom:1px solid ${LINEA}`;

  return {
    html: `<table role="presentation" width="100%" style="margin:0 0 16px;border-collapse:collapse">${renglones
      .map((r) => `<tr><td style="${celda}">${escapar(r.nombre)}</td><td style="${celda};text-align:right">${pesos(r.importe)}</td></tr>`)
      .join("")}${totales
      .map(
        ([etiqueta, valor], i) =>
          `<tr><td style="padding:6px 0${i === totales.length - 1 ? ";font-weight:bold" : ""}">${escapar(etiqueta)}</td><td style="padding:6px 0;text-align:right${i === totales.length - 1 ? ";font-weight:bold" : ""}">${escapar(valor)}</td></tr>`,
      )
      .join("")}</table>`,
    texto: [...renglones.map((r) => `- ${r.nombre}: ${pesos(r.importe)}`), ...totales.map(([e, v]) => `${e}: ${v}`)].join("\n"),
  };
}

function entrega(pedido) {
  if (pedido.entrega === "envio") {
    const direccion = [pedido.direccion, pedido.ciudad, pedido.provincia].filter(Boolean).join(", ");
    const cp = pedido.codigoPostal ? ` (CP ${pedido.codigoPostal})` : "";
    return parrafo(`Envío a domicilio: ${direccion}${cp}. El costo del envío se coordina aparte.`);
  }

  if (pedido.entrega === "retiro") {
    return parrafo(`Retiro en persona: te vamos a contactar al ${pedido.telefono} para coordinar el día y el lugar.`);
  }

  return null;
}

function hayDigitales(pedido) {
  return pedido.items.some((item) => item.tipo === "digital");
}

// Clave para que Resend no repita un aviso. Lleva la fecha de creación porque la tienda local y la
// publicada usan la misma cuenta de Resend y las dos tienen, por ejemplo, un pedido #3.
function claveDe(tipo, id, creadoEn, detalleClave) {
  return `${tipo}-${id}-${new Date(creadoEn).getTime()}-${detalleClave}`;
}

function armar(titulo, bloques) {
  const presentes = bloques.filter(Boolean);
  const dudas = process.env.EMAIL_RESPONDER_A
    ? "¿Tenés dudas? Respondé este correo."
    : "¿Tenés dudas? Escribinos desde la sección Contacto de la tienda.";

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#23272f">
<table role="presentation" width="100%" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border-collapse:collapse">
<tr><td style="background:${COLOR};color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:20px;font-weight:bold">${TIENDA}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:20px;color:${COLOR}">${escapar(titulo)}</h1>
${presentes.map((bloque) => bloque.html).join("\n")}
<p style="margin:24px 0 0;color:${GRIS};font-size:14px">${escapar(dudas)}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  const texto = [titulo, ...presentes.map((bloque) => bloque.texto), dudas, `— ${TIENDA}`].join("\n\n");
  return { html, texto };
}

// Todas estas funciones se llaman sin esperar la respuesta: nunca fallan hacia afuera.
async function pedidoCreado(pedido, transferencia) {
  try {
    const gratis = pedido.total === 0;
    const bloques = [parrafo(`¡Hola, ${pedido.cliente}! ${gratis ? "Confirmamos" : "Recibimos"} tu pedido #${pedido.id}.`), detalle(pedido), entrega(pedido)];

    if (gratis) {
      bloques.push(parrafo("El cupón cubrió el total: no tenés que pagar nada."));
      if (hayDigitales(pedido)) bloques.push(parrafo("Ya podés descargar tus productos digitales desde Mis pedidos."));
    } else if (pedido.metodoPago === "transferencia" && transferencia) {
      bloques.push(
        parrafo(`Para confirmarlo, transferí ${pesos(pedido.total)} a esta cuenta:`),
        datos([["Titular", transferencia.titular], ["Alias", transferencia.alias], ["CBU", transferencia.cbu]]),
        parrafo(`Poné "Pedido #${pedido.id}" en el concepto. Cuando nos llegue la transferencia te avisamos por acá.`),
      );
    } else if (pedido.metodoPago === "mercadopago") {
      bloques.push(parrafo("Si todavía no lo pagaste, podés hacerlo con Mercado Pago desde este botón:"), boton("Pagar el pedido", enlace(`/pagar/${pedido.id}`)));
    }

    bloques.push(boton("Ver mis pedidos", enlace("/mis-pedidos")));

    await enviar({
      para: pedido.email,
      asunto: `${gratis ? "Confirmamos" : "Recibimos"} tu pedido #${pedido.id}`,
      titulo: gratis ? "¡Pedido confirmado!" : "¡Gracias por tu compra!",
      bloques,
      clave: claveDe("pedido", pedido.id, pedido.creadoEn, "creado"),
    });
  } catch (error) {
    console.error(`No se pudo armar el correo del pedido #${pedido?.id}:`, error.message);
  }
}

async function cambioDeEstado(pedido) {
  try {
    const n = pedido.id;
    const retiro = pedido.entrega === "retiro";
    let aviso;

    if (pedido.estado === "pagado") {
      const bloques = [parrafo(`¡Hola, ${pedido.cliente}! Recibimos el pago de ${pesos(pedido.total)} de tu pedido #${n}.`), detalle(pedido)];
      if (hayDigitales(pedido)) bloques.push(parrafo("Ya podés descargar tus productos digitales desde Mis pedidos."));
      if (pedido.entrega) {
        bloques.push(parrafo(retiro ? "Te avisamos cuando esté listo para retirar." : "Ahora lo preparamos y te avisamos cuando lo despachemos."));
      }
      aviso = { asunto: `Confirmamos el pago de tu pedido #${n}`, titulo: "¡Pago confirmado!", bloques };
    } else if (pedido.estado === "enviado" && pedido.entrega) {
      aviso = retiro
        ? {
            asunto: `Tu pedido #${n} está listo para retirar`,
            titulo: "¡Tu pedido está listo!",
            bloques: [parrafo(`¡Hola, ${pedido.cliente}! Tu pedido #${n} ya está listo para retirar.`), entrega(pedido)],
          }
        : {
            asunto: `Tu pedido #${n} está en camino`,
            titulo: "¡Tu pedido está en camino!",
            bloques: [parrafo(`¡Hola, ${pedido.cliente}! Despachamos tu pedido #${n}.`), entrega(pedido)],
          };
    } else if (pedido.estado === "entregado") {
      aviso = {
        asunto: `Tu pedido #${n} fue entregado`,
        titulo: "¡Pedido entregado!",
        bloques: [parrafo(`¡Hola, ${pedido.cliente}! Tu pedido #${n} ya fue entregado. Gracias por comprar en ${TIENDA}, esperamos que lo disfrutes.`)],
      };
    } else if (pedido.estado === "cancelado") {
      aviso = {
        asunto: `Tu pedido #${n} fue cancelado`,
        titulo: "Pedido cancelado",
        bloques: [
          parrafo(`¡Hola, ${pedido.cliente}! Cancelamos tu pedido #${n}.`),
          detalle(pedido),
          parrafo("Si ya lo habías pagado o creés que es un error, escribinos y lo resolvemos."),
        ],
      };
    } else {
      return;
    }

    aviso.bloques.push(boton("Ver mis pedidos", enlace("/mis-pedidos")));
    await enviar({ para: pedido.email, ...aviso, clave: claveDe("pedido", n, pedido.creadoEn, pedido.estado) });
  } catch (error) {
    console.error(`No se pudo armar el correo del pedido #${pedido?.id}:`, error.message);
  }
}

async function arrepentimiento(mensaje) {
  try {
    const codigo = `ARR-${String(mensaje.id).padStart(6, "0")}`;
    await enviar({
      para: mensaje.email,
      asunto: `Recibimos tu pedido de arrepentimiento (${codigo})`,
      titulo: "Recibimos tu pedido de arrepentimiento",
      bloques: [
        parrafo(`¡Hola, ${mensaje.nombre}! Recibimos tu solicitud para cancelar el pedido #${mensaje.pedido}.`),
        datos([["Número de solicitud", codigo]]),
        parrafo("Guardá este número. Te vamos a escribir para coordinar la devolución."),
      ],
      clave: claveDe("arrepentimiento", mensaje.id, mensaje.creadoEn, "recibido"),
    });
  } catch (error) {
    console.error("No se pudo armar el correo de arrepentimiento:", error.message);
  }
}

module.exports = { configurado, pedidoCreado, cambioDeEstado, arrepentimiento };
