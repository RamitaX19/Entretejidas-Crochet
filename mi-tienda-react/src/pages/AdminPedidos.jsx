import { useEffect, useState } from "react";
import { pedirApi } from "../api";
import { ESTADOS, formatearFecha, nombreEstado, nombreMetodoPago } from "../pedidos";
import AdminNav from "../components/AdminNav";
import EstadoPedido from "../components/EstadoPedido";
import DatosEntrega from "../components/DatosEntrega";

function AdminPedidos({ onStockCambiado }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [aviso, setAviso] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);

  useEffect(() => {
    pedirApi("/api/pedidos")
      .then((respuesta) => respuesta.json().then((datos) => ({ ok: respuesta.ok, datos })))
      .then(({ ok, datos }) => {
        if (ok) setPedidos(datos);
        else setAviso({ tipo: "error", texto: datos.error });
      })
      .catch((err) => {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar los pedidos. Probá de nuevo." });
      })
      .finally(() => setCargando(false));
  }, []);

  function elegirEstado(pedido, estado) {
    if (estado === "cancelado") {
      setConfirmandoId(pedido.id);
    } else {
      guardarEstado(pedido.id, estado);
    }
  }

  async function guardarEstado(pedidoId, estado) {
    setAviso(null);
    setConfirmandoId(null);
    setGuardandoId(pedidoId);

    try {
      const respuesta = await pedirApi(`/api/pedidos/${pedidoId}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setPedidos((lista) => lista.map((p) => (p.id === datos.id ? datos : p)));
      setAviso({ tipo: "ok", texto: `Pedido #${datos.id}: ${nombreEstado(datos.estado, datos.entrega)}.` });

      if (estado === "cancelado") onStockCambiado();
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    } finally {
      setGuardandoId(null);
    }
  }

  const visibles = filtro === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtro);

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <div className="campo filtro-pedidos">
        <label htmlFor="filtro-estado">Mostrar</label>
        <select id="filtro-estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos ({pedidos.length})</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {nombreEstado(estado)} ({pedidos.filter((p) => p.estado === estado).length})
            </option>
          ))}
        </select>
      </div>

      {cargando && <p role="status">Cargando pedidos...</p>}
      {!cargando && visibles.length === 0 && <p>No hay pedidos para mostrar.</p>}

      <ul className="lista-pedidos">
        {visibles.map((pedido) => (
          <li key={pedido.id} className={`tarjeta pedido ${confirmandoId === pedido.id ? "confirmando" : ""}`}>
            <div className="pedido-cabecera">
              <h2>Pedido #{pedido.id}</h2>
              <EstadoPedido estado={pedido.estado} entrega={pedido.entrega} />
            </div>
            <p className="pedido-fecha">
              {formatearFecha(pedido.creadoEn)} · {pedido.cliente} ({pedido.email})
            </p>

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
                </li>
              ))}
            </ul>

            {pedido.descuento > 0 && (
              <p className="pedido-descuento">
                Cupón {pedido.cupon}: −${pedido.descuento.toLocaleString("es-AR")}
              </p>
            )}
            {pedido.costoEnvio > 0 && (
              <p className="pedido-envio">Envío: ${pedido.costoEnvio.toLocaleString("es-AR")}</p>
            )}
            <p className="pedido-total">
              Total: ${pedido.total.toLocaleString("es-AR")} ·{" "}
              {pedido.total === 0 ? "Cubierto por el cupón" : nombreMetodoPago(pedido.metodoPago)}
            </p>
            <DatosEntrega pedido={pedido} />

            {pedido.estado !== "cancelado" && confirmandoId === pedido.id && (
              <div className="acciones-fila">
                <span>¿Cancelar el pedido #{pedido.id}? Se devuelve el stock y no se puede deshacer.</span>
                <button className="boton boton-peligro" onClick={() => guardarEstado(pedido.id, "cancelado")}>
                  Sí, cancelar
                </button>
                <button className="boton boton-secundario" onClick={() => setConfirmandoId(null)} autoFocus>
                  No
                </button>
              </div>
            )}

            {pedido.estado !== "cancelado" && confirmandoId !== pedido.id && (
              <div className="campo campo-estado">
                <label htmlFor={`estado-${pedido.id}`}>Cambiar estado</label>
                <select
                  id={`estado-${pedido.id}`}
                  value={pedido.estado}
                  disabled={guardandoId === pedido.id}
                  onChange={(e) => elegirEstado(pedido, e.target.value)}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {nombreEstado(estado, pedido.entrega)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default AdminPedidos;
