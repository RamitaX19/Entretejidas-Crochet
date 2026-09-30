import { useEffect, useState } from "react";
import { pedirApi } from "../api";
import AdminNav from "../components/AdminNav";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo.";

const FILTROS = {
  todos: () => true,
  "no-leidos": (m) => !m.leido,
  arrepentimiento: (m) => m.tipo === "arrepentimiento",
};

function fechaYHora(fecha) {
  return new Date(fecha).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
}

function AdminMensajes() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    pedirApi("/api/mensajes")
      .then((respuesta) => respuesta.json().then((datos) => ({ ok: respuesta.ok, datos })))
      .then(({ ok, datos }) => {
        if (ok) setMensajes(datos);
        else setAviso({ tipo: "error", texto: datos.error });
      })
      .catch((err) => {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar los mensajes. Probá de nuevo." });
      })
      .finally(() => setCargando(false));
  }, []);

  async function marcarLeido(mensaje, leido) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(`/api/mensajes/${mensaje.id}/leido`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leido }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setMensajes((lista) => lista.map((m) => (m.id === datos.id ? datos : m)));
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
    }
  }

  async function eliminar(mensaje) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(`/api/mensajes/${mensaje.id}`, { method: "DELETE" });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setMensajes((lista) => lista.filter((m) => m.id !== mensaje.id));
      setAviso({ tipo: "ok", texto: `Mensaje de ${mensaje.nombre} eliminado.` });
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
    } finally {
      setConfirmandoId(null);
    }
  }

  const visibles = mensajes.filter(FILTROS[filtro]);
  const noLeidos = mensajes.filter((m) => !m.leido).length;

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <div className="barra-mensajes">
        <p className="resumen-stock">
          {noLeidos === 0 ? "No tenés mensajes sin leer." : `${noLeidos} ${noLeidos === 1 ? "mensaje sin leer" : "mensajes sin leer"}`}
        </p>
        <div className="campo filtro-pedidos">
          <label htmlFor="filtro-mensajes">Mostrar</label>
          <select id="filtro-mensajes" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos ({mensajes.length})</option>
            <option value="no-leidos">Sin leer ({noLeidos})</option>
            <option value="arrepentimiento">
              Arrepentimientos ({mensajes.filter(FILTROS.arrepentimiento).length})
            </option>
          </select>
        </div>
      </div>

      {cargando && <p role="status">Cargando mensajes...</p>}
      {!cargando && visibles.length === 0 && <p>No hay mensajes para mostrar.</p>}

      <ul className="lista-pedidos">
        {visibles.map((mensaje) => (
          <li
            key={mensaje.id}
            className={`tarjeta mensaje ${mensaje.leido ? "" : "mensaje-nuevo"} ${confirmandoId === mensaje.id ? "confirmando" : ""}`}
          >
            <div className="pedido-cabecera">
              <h2>
                {mensaje.tipo === "arrepentimiento"
                  ? `Arrepentimiento ARR-${String(mensaje.id).padStart(6, "0")}`
                  : `Mensaje de ${mensaje.nombre}`}
              </h2>
              <span className={`etiqueta ${mensaje.tipo === "arrepentimiento" ? "etiqueta-alerta" : "etiqueta-neutra"}`}>
                {mensaje.tipo === "arrepentimiento" ? "Arrepentimiento" : "Contacto"}
              </span>
            </div>
            <p className="pedido-fecha">
              {fechaYHora(mensaje.creadoEn)} · {mensaje.leido ? "Leído" : "Sin leer"}
            </p>

            <dl className="mensaje-datos">
              <dt>Nombre</dt>
              <dd>{mensaje.nombre}</dd>
              <dt>Email</dt>
              <dd><a href={`mailto:${mensaje.email}`}>{mensaje.email}</a></dd>
              {mensaje.telefono && (
                <>
                  <dt>Teléfono</dt>
                  <dd>{mensaje.telefono}</dd>
                </>
              )}
              {mensaje.pedido && (
                <>
                  <dt>Pedido</dt>
                  <dd>#{mensaje.pedido}</dd>
                </>
              )}
            </dl>

            {mensaje.mensaje && <p className="mensaje-texto">{mensaje.mensaje}</p>}

            {confirmandoId === mensaje.id ? (
              <div className="acciones-fila">
                <span>¿Eliminar este mensaje?</span>
                <button className="boton boton-peligro" onClick={() => eliminar(mensaje)}>
                  Sí, eliminar
                </button>
                <button className="boton boton-secundario" onClick={() => setConfirmandoId(null)} autoFocus>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="acciones-fila">
                <button className="boton boton-secundario" onClick={() => marcarLeido(mensaje, !mensaje.leido)}>
                  {mensaje.leido ? "Marcar como no leído" : "Marcar como leído"}
                </button>
                <button
                  className="boton-quitar"
                  onClick={() => setConfirmandoId(mensaje.id)}
                  aria-label={`Eliminar el mensaje de ${mensaje.nombre}`}
                >
                  Eliminar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default AdminMensajes;
