import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { API_URL } from "../config";
import { pedirApi } from "../api";
import { ESTADOS_PAGADOS, formatearFecha } from "../pedidos";
import EstadoPedido from "../components/EstadoPedido";
import DatosEntrega from "../components/DatosEntrega";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo en un momento.";

function avisoInicial(estado) {
  if (!estado?.pedidoNuevo) return null;

  if (estado.pagado) {
    return { tipo: "ok", texto: `¡Pedido #${estado.pedidoNuevo} realizado! El cupón cubrió el total, así que ya está pagado.` };
  }

  return { tipo: "ok", texto: `¡Pedido #${estado.pedidoNuevo} realizado! Abajo te mostramos cómo pagarlo.` };
}

function avisoDePago(pedido, estadoPago) {
  if (ESTADOS_PAGADOS.includes(pedido.estado)) {
    return { tipo: "ok", texto: `¡Listo! El pago del pedido #${pedido.id} está acreditado.` };
  }

  if (pedido.estado === "cancelado") {
    return { tipo: "error", texto: `El pedido #${pedido.id} está cancelado.` };
  }

  if (["pending", "in_process", "authorized"].includes(estadoPago)) {
    return {
      tipo: "info",
      texto: `Mercado Pago todavía está procesando el pago del pedido #${pedido.id}. Puede tardar unos minutos.`,
    };
  }

  if (estadoPago) {
    return { tipo: "error", texto: `El pago del pedido #${pedido.id} no se completó. Podés intentarlo de nuevo.` };
  }

  return {
    tipo: "info",
    texto: `Todavía no encontramos un pago para el pedido #${pedido.id}. Si ya pagaste, esperá unos minutos y revisá de nuevo.`,
  };
}

async function consultarPago(pedidoId) {
  const respuesta = await pedirApi(`/api/pedidos/${pedidoId}/verificar-pago`, { method: "POST" });
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    return { aviso: { tipo: "error", texto: datos.error } };
  }

  return { pedido: datos.pedido, aviso: avisoDePago(datos.pedido, datos.estadoPago) };
}

function MisPedidos({ usuario, onAbrirAuth }) {
  const location = useLocation();
  const [parametros] = useSearchParams();
  const [pedidos, setPedidos] = useState([]);
  const [transferencia, setTransferencia] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(() => avisoInicial(location.state));

  const conectado = usuario !== null;
  const pedidoNuevo = location.state?.pedidoNuevo;
  // Mercado Pago nos devuelve acá con ?pedido=N cuando la tienda tiene dirección pública.
  const pedidoQueVuelveDePagar = parametros.get("pedido");

  useEffect(() => {
    if (!conectado) return;

    async function cargar() {
      try {
        let avisoPago = null;

        if (pedidoQueVuelveDePagar) {
          avisoPago = (await consultarPago(pedidoQueVuelveDePagar)).aviso;
        }

        const [respuestaPedidos, respuestaPagos] = await Promise.all([
          pedirApi("/api/mis-pedidos"),
          fetch(`${API_URL}/api/pagos`),
        ]);

        if (respuestaPedidos.status === 401) return;
        if (!respuestaPedidos.ok) throw new Error(`Error ${respuestaPedidos.status}`);

        setPedidos(await respuestaPedidos.json());
        setTransferencia((await respuestaPagos.json()).transferencia);
        if (avisoPago) setAviso(avisoPago);
      } catch (err) {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar tus pedidos. Probá de nuevo en un momento." });
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [conectado, pedidoQueVuelveDePagar]);

  async function revisarPago(pedidoId) {
    setAviso(null);

    try {
      const { pedido, aviso: avisoPago } = await consultarPago(pedidoId);
      if (pedido) setPedidos((lista) => lista.map((p) => (p.id === pedido.id ? pedido : p)));
      setAviso(avisoPago);
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
    }
  }

  async function descargar(item) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(`/api/descargas/${item.productoId}`);

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = item.archivoNombre;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
    }
  }

  if (!conectado) {
    return (
      <main className="pedidos">
        <h1>Mis pedidos</h1>
        <p>Iniciá sesión para ver tus pedidos.</p>
        <button className="boton" onClick={() => onAbrirAuth("login")}>
          Iniciar sesión
        </button>
      </main>
    );
  }

  return (
    <main className="pedidos">
      <h1>Mis pedidos</h1>

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      {cargando && <p role="status">Cargando pedidos...</p>}

      {!cargando && pedidos.length === 0 && (
        <p>
          Todavía no hiciste ningún pedido. <Link to="/">Ir a la tienda</Link>
        </p>
      )}

      <ul className="lista-pedidos">
        {pedidos.map((pedido) => {
          const pagado = ESTADOS_PAGADOS.includes(pedido.estado);
          const pendiente = pedido.estado === "pendiente";

          return (
            <li key={pedido.id} className={`tarjeta pedido ${pedido.id === pedidoNuevo ? "pedido-nuevo" : ""}`}>
              <div className="pedido-cabecera">
                <h2>Pedido #{pedido.id}</h2>
                <EstadoPedido estado={pedido.estado} entrega={pedido.entrega} />
              </div>
              <p className="pedido-fecha">{formatearFecha(pedido.creadoEn)}</p>

              <ul className="pedido-items">
                {pedido.items.map((item) => (
                  <li key={item.id} className="pedido-item">
                    <span>
                      {item.nombre}
                      {item.variante && ` (${item.variante})`}
                      {item.tipo === "digital" && " (digital)"}
                      {(item.tipo !== "digital" || item.cantidad > 1) && ` ×${item.cantidad}`}
                    </span>
                    <span>${(item.precioUnitario * item.cantidad).toLocaleString("es-AR")}</span>

                    {item.tipo === "digital" && pagado && item.archivoNombre && (
                      <div className="pedido-descarga">
                        <button
                          className="boton boton-secundario"
                          onClick={() => descargar(item)}
                          aria-label={`Descargar ${item.archivoNombre}`}
                        >
                          Descargar
                        </button>
                      </div>
                    )}
                    {item.tipo === "digital" && pagado && !item.archivoNombre && (
                      <p className="pedido-descarga nota">El archivo todavía no está disponible.</p>
                    )}
                    {item.tipo === "digital" && pendiente && (
                      <p className="pedido-descarga nota">La descarga se habilita cuando se acredite el pago.</p>
                    )}
                  </li>
                ))}
              </ul>

              {pedido.descuento > 0 && (
                <p className="pedido-descuento">
                  Cupón {pedido.cupon}: −${pedido.descuento.toLocaleString("es-AR")}
                </p>
              )}
              <p className="pedido-total">Total: ${pedido.total.toLocaleString("es-AR")}</p>
              <DatosEntrega pedido={pedido} />

              {pendiente && pedido.metodoPago === "transferencia" && transferencia && (
                <div className="pago-instrucciones">
                  <h3>Datos para transferir</h3>
                  <dl>
                    <dt>Titular</dt>
                    <dd>{transferencia.titular}</dd>
                    <dt>Alias</dt>
                    <dd>{transferencia.alias}</dd>
                    <dt>CBU</dt>
                    <dd>{transferencia.cbu}</dd>
                    <dt>Monto</dt>
                    <dd>${pedido.total.toLocaleString("es-AR")}</dd>
                  </dl>
                  <p>
                    Poné "Pedido #{pedido.id}" en el concepto. Cuando nos llegue la transferencia, vas a ver el
                    pedido como pagado.
                  </p>
                </div>
              )}

              {pendiente && pedido.metodoPago === "mercadopago" && (
                <div className="acciones-fila">
                  <Link to={`/pagar/${pedido.id}`} className="boton">
                    Pagar con Mercado Pago
                  </Link>
                  <button className="boton boton-secundario" onClick={() => revisarPago(pedido.id)}>
                    Ya pagué: revisar el pago
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export default MisPedidos;
