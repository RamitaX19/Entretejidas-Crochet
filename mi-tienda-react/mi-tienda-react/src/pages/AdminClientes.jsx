import { Fragment, useEffect, useState } from "react";
import { pedirApi } from "../api";
import { formatearFecha } from "../pedidos";
import AdminNav from "../components/AdminNav";
import EstadoPedido from "../components/EstadoPedido";

function resumenItems(items) {
  return items
    .map((item) => {
      const nombre = item.variante ? `${item.nombre} (${item.variante})` : item.nombre;
      return item.tipo === "digital" ? `${nombre} (digital)` : `${nombre} ×${item.cantidad}`;
    })
    .join(", ");
}

function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abiertoId, setAbiertoId] = useState(null);
  const [historiales, setHistoriales] = useState({});

  useEffect(() => {
    pedirApi("/api/clientes")
      .then((respuesta) => respuesta.json().then((datos) => ({ ok: respuesta.ok, datos })))
      .then(({ ok, datos }) => {
        if (ok) setClientes(datos);
        else setError(datos.error);
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudieron cargar los clientes. Probá de nuevo.");
      })
      .finally(() => setCargando(false));
  }, []);

  async function alternarHistorial(clienteId) {
    if (abiertoId === clienteId) {
      setAbiertoId(null);
      return;
    }

    setAbiertoId(clienteId);
    if (historiales[clienteId]) return;

    try {
      const respuesta = await pedirApi(`/api/clientes/${clienteId}/pedidos`);
      const datos = await respuesta.json();
      setHistoriales((actuales) => ({
        ...actuales,
        [clienteId]: respuesta.ok ? { pedidos: datos } : { error: datos.error },
      }));
    } catch (err) {
      console.error(err);
      setHistoriales((actuales) => ({ ...actuales, [clienteId]: { error: "No se pudo cargar el historial." } }));
    }
  }

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {error && <p role="alert" className="aviso aviso-error">{error}</p>}

      <section className="tarjeta">
        <div className="tabla-contenedor" role="region" aria-label="Lista de clientes" tabIndex={0}>
          <table>
            <caption>Clientes ({clientes.length})</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Email</th>
                <th scope="col" className="num">Pedidos</th>
                <th scope="col" className="num">Total gastado</th>
                <th scope="col">Último pedido</th>
                <th scope="col">Historial</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={6} role="status">Cargando clientes...</td>
                </tr>
              )}

              {!cargando && clientes.length === 0 && (
                <tr>
                  <td colSpan={6}>Todavía no hay clientes registrados.</td>
                </tr>
              )}

              {clientes.map((cliente) => {
                const abierto = abiertoId === cliente.id;
                const historial = historiales[cliente.id];

                return (
                  <Fragment key={cliente.id}>
                    <tr className={abierto ? "fila-abierta" : ""}>
                      <th scope="row">{cliente.nombre}</th>
                      <td>{cliente.email}</td>
                      <td className="num">{cliente.pedidos}</td>
                      <td className="num">${cliente.totalGastado.toLocaleString("es-AR")}</td>
                      <td>{cliente.ultimoPedido ? formatearFecha(cliente.ultimoPedido) : "—"}</td>
                      <td>
                        {cliente.pedidos === 0 ? (
                          <span className="nota">Sin compras</span>
                        ) : (
                          <button
                            className="boton-enlace"
                            onClick={() => alternarHistorial(cliente.id)}
                            aria-expanded={abierto}
                            aria-controls={`historial-${cliente.id}`}
                          >
                            {abierto ? "Ocultar" : "Ver historial"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {abierto && (
                      <tr className="fila-historial">
                        <td colSpan={6} id={`historial-${cliente.id}`}>
                          {!historial && <p role="status">Cargando historial...</p>}
                          {historial?.error && <p role="alert" className="mensaje-error">{historial.error}</p>}
                          {historial?.pedidos && (
                            <ul className="historial">
                              {historial.pedidos.map((pedido) => (
                                <li key={pedido.id} className="historial-pedido">
                                  <div className="historial-cabecera">
                                    <strong>Pedido #{pedido.id}</strong>
                                    <span className="nota">{formatearFecha(pedido.creadoEn)}</span>
                                    <EstadoPedido estado={pedido.estado} entrega={pedido.entrega} />
                                    <strong className="historial-total">${pedido.total.toLocaleString("es-AR")}</strong>
                                  </div>
                                  <p className="nota">
                                    {resumenItems(pedido.items)}
                                    {pedido.descuento > 0 && ` · Cupón ${pedido.cupon}: −$${pedido.descuento.toLocaleString("es-AR")}`}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="nota">"Total gastado" suma solo los pedidos cobrados (pagados, enviados o entregados).</p>
      </section>
    </main>
  );
}

export default AdminClientes;
