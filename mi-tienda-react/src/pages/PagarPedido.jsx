import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { API_URL } from "../config";
import { pedirApi } from "../api";
import { nombreEstado, pedirLinkMercadoPago } from "../pedidos";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo en un momento.";
const ERROR_FORMULARIO =
  "No se pudo cargar el formulario de tarjeta. Podés pagar desde el sitio de Mercado Pago, más abajo.";
// Si la Public Key es inválida o un bloqueador frena el SDK, Mercado Pago no avisa: se espera este tiempo.
const ESPERA_FORMULARIO = 15000;

// Mensajes que recomienda Mercado Pago para los rechazos más comunes.
const MOTIVOS_RECHAZO = {
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad de la tarjeta.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_call_for_authorize: "Tenés que autorizar el pago con el banco de tu tarjeta.",
  cc_rejected_card_disabled: "Llamá al banco para activar la tarjeta.",
  cc_rejected_invalid_installments: "La tarjeta no acepta esa cantidad de cuotas.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Probá con otra tarjeta u otro medio de pago.",
};

function PagarPedido({ usuario, onAbrirAuth }) {
  const { id } = useParams();
  // La key hace que cada pedido arranque con el estado limpio (avisos, intentos, resultado).
  return <PagoDelPedido key={id} id={id} usuario={usuario} onAbrirAuth={onAbrirAuth} />;
}

function PagoDelPedido({ id, usuario, onAbrirAuth }) {
  const [pedido, setPedido] = useState(null);
  const [clavePublica, setClavePublica] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [formularioListo, setFormularioListo] = useState(false);
  const [formularioFallo, setFormularioFallo] = useState(false);
  // Cambiarlo vuelve a montar el formulario de tarjeta para un intento nuevo.
  const [intento, setIntento] = useState(0);

  const conectado = usuario !== null;
  const total = pedido?.total;
  const email = usuario?.email;
  const puedePagar = pedido?.metodoPago === "mercadopago" && pedido?.estado === "pendiente" && resultado === null;
  const mostrarFormulario = conectado && Boolean(clavePublica) && puedePagar;

  useEffect(() => {
    if (!conectado) return;

    async function cargar() {
      try {
        const [respuestaPedidos, respuestaPagos] = await Promise.all([
          pedirApi("/api/mis-pedidos"),
          fetch(`${API_URL}/api/pagos`),
        ]);

        if (respuestaPedidos.status === 401) return;
        if (!respuestaPedidos.ok) throw new Error(`Error ${respuestaPedidos.status}`);

        const pedidos = await respuestaPedidos.json();
        const { clavePublicaMercadoPago } = await respuestaPagos.json();

        if (clavePublicaMercadoPago) {
          initMercadoPago(clavePublicaMercadoPago, { locale: "es-AR" });
          setClavePublica(clavePublicaMercadoPago);
        }

        setPedido(pedidos.find((p) => p.id === Number(id)) ?? null);
      } catch (err) {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudo cargar el pedido. Probá de nuevo en un momento." });
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [conectado, id]);

  useEffect(() => {
    if (!mostrarFormulario || formularioListo) return;

    const espera = setTimeout(() => setFormularioFallo(true), ESPERA_FORMULARIO);
    return () => clearTimeout(espera);
  }, [mostrarFormulario, formularioListo]);

  // CardPayment vuelve a crear el formulario si cambian estas props, por eso se mantienen estables.
  const inicializacion = useMemo(() => ({ amount: total, payer: { email } }), [total, email]);

  const pagar = useCallback(
    async (datosTarjeta) => {
      setAviso(null);

      try {
        const respuesta = await pedirApi(`/api/pedidos/${id}/pagar-con-tarjeta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosTarjeta),
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          // Si la sesión venció, App ya abrió el login con su propio aviso.
          if (respuesta.status !== 401) setAviso({ tipo: "error", texto: datos.error });
          setIntento((n) => n + 1);
          return;
        }

        setPedido(datos.pedido);

        if (datos.estadoPago === "approved") {
          setResultado("aprobado");
        } else if (datos.estadoPago === "in_process" || datos.estadoPago === "pending") {
          setResultado("en-revision");
        } else {
          setAviso({
            tipo: "error",
            texto: MOTIVOS_RECHAZO[datos.detalle] ?? "El pago fue rechazado. Probá con otra tarjeta u otro medio de pago.",
          });
          setIntento((n) => n + 1);
        }
      } catch (err) {
        console.error(err);
        setAviso({ tipo: "error", texto: ERROR_CONEXION });
        setIntento((n) => n + 1);
      }
    },
    [id],
  );

  const formularioCargado = useCallback(() => setFormularioListo(true), []);

  const errorDelFormulario = useCallback((error) => {
    console.error(error);
    if (error.type === "critical") {
      setAviso({ tipo: "error", texto: ERROR_FORMULARIO });
    }
  }, []);

  async function irAMercadoPago() {
    setAviso(null);
    const { url, error } = await pedirLinkMercadoPago(pedido.id);

    if (url) {
      window.location.assign(url);
    } else {
      setAviso({ tipo: "error", texto: error });
    }
  }

  if (!conectado) {
    return (
      <main className="checkout">
        <h1>Pagar pedido</h1>
        <p>Iniciá sesión para pagar tu pedido.</p>
        <button className="boton" onClick={() => onAbrirAuth("login")}>
          Iniciar sesión
        </button>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="checkout">
        <p role="status">Cargando pedido...</p>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="checkout">
        <h1>Pagar pedido</h1>
        {aviso ? (
          <p role="alert" className="aviso aviso-error">{aviso.texto}</p>
        ) : (
          <p>No encontramos este pedido.</p>
        )}
        <Link to="/mis-pedidos" className="volver">Ir a mis pedidos</Link>
      </main>
    );
  }

  if (resultado === "aprobado") {
    return (
      <main className="checkout">
        <h1>¡Pago aprobado!</h1>
        <p role="status" className="aviso aviso-ok">
          Recibimos el pago del pedido #{pedido.id}. En "Mis pedidos" podés seguir su estado y bajar los productos
          digitales.
        </p>
        <Link to="/mis-pedidos" className="boton">Ver mis pedidos</Link>
      </main>
    );
  }

  if (resultado === "en-revision") {
    return (
      <main className="checkout">
        <h1>Pago en revisión</h1>
        <p role="status" className="aviso aviso-info">
          Mercado Pago está revisando el pago del pedido #{pedido.id}. Puede tardar unos minutos: en "Mis pedidos" vas
          a ver cuando se acredite.
        </p>
        <Link to="/mis-pedidos" className="boton">Ver mis pedidos</Link>
      </main>
    );
  }

  if (!puedePagar) {
    return (
      <main className="checkout">
        <h1>Pedido #{pedido.id}</h1>
        <p>
          {pedido.metodoPago !== "mercadopago"
            ? "Este pedido se paga por transferencia. Los datos para transferir están en \"Mis pedidos\"."
            : `Este pedido no tiene pagos pendientes (estado: ${nombreEstado(pedido.estado, pedido.entrega)}).`}
        </p>
        <Link to="/mis-pedidos" className="volver">Ir a mis pedidos</Link>
      </main>
    );
  }

  return (
    <main className="checkout">
      <Link to="/mis-pedidos" className="volver">Volver a mis pedidos</Link>
      <h1>Pagar pedido #{pedido.id}</h1>
      <p className="resumen-total">Total: ${pedido.total.toLocaleString("es-AR")}</p>

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      {mostrarFormulario ? (
        <>
          {!formularioListo && (
            <p role={formularioFallo ? "alert" : "status"} className={formularioFallo ? "aviso aviso-error" : "nota"}>
              {formularioFallo ? ERROR_FORMULARIO : "Cargando el formulario de pago..."}
            </p>
          )}
          <CardPayment
            key={intento}
            initialization={inicializacion}
            onReady={formularioCargado}
            onSubmit={pagar}
            onError={errorDelFormulario}
          />
        </>
      ) : (
        <p className="nota">El pago con tarjeta no está disponible en este momento.</p>
      )}

      <section className="tarjeta" aria-labelledby="titulo-otras-formas">
        <h2 id="titulo-otras-formas">Otras formas de pago</h2>
        <p className="nota">Con dinero en tu cuenta de Mercado Pago, en efectivo o con otras tarjetas.</p>
        <button className="boton boton-secundario" onClick={irAMercadoPago}>
          Pagar en el sitio de Mercado Pago
        </button>
      </section>
    </main>
  );
}

export default PagarPedido;
