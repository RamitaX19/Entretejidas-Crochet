import { useState } from "react";
import { API_URL } from "../config";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo en un momento.";

// Formulario de Contacto y del Botón de arrepentimiento: los dos llegan a la sección Mensajes del panel.
function FormularioMensaje({ tipo, usuario }) {
  const esArrepentimiento = tipo === "arrepentimiento";
  const [datos, setDatos] = useState({
    nombre: usuario?.nombre ?? "",
    email: usuario?.email ?? "",
    telefono: "",
    pedido: "",
    mensaje: "",
    sitioWeb: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviadoId, setEnviadoId] = useState(null);

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, tipo }),
      });

      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        setError(cuerpo.error);
        return;
      }

      setEnviadoId(cuerpo.id);
    } catch (err) {
      console.error(err);
      setError(ERROR_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  if (enviadoId !== null) {
    return esArrepentimiento ? (
      <div role="status" className="aviso aviso-ok">
        <p><strong>Recibimos tu pedido de arrepentimiento.</strong></p>
        <p>
          Tu número de solicitud es <strong>ARR-{String(enviadoId).padStart(6, "0")}</strong>. Guardalo: te vamos a
          escribir a {datos.email} para seguir con la cancelación.
        </p>
      </div>
    ) : (
      <p role="status" className="aviso aviso-ok">
        ¡Gracias por escribirnos! Te vamos a responder a {datos.email}.
      </p>
    );
  }

  const prefijo = `mensaje-${tipo}`;

  return (
    <form onSubmit={enviar}>
      {error && <p role="alert" className="aviso aviso-error">{error}</p>}

      <div className="campo">
        <label htmlFor={`${prefijo}-nombre`}>Nombre</label>
        <input
          id={`${prefijo}-nombre`}
          name="nombre"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={datos.nombre}
          onChange={cambiar}
          required
        />
      </div>

      <div className="campo">
        <label htmlFor={`${prefijo}-email`}>Email</label>
        <input
          id={`${prefijo}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={150}
          value={datos.email}
          onChange={cambiar}
          required
        />
      </div>

      <div className="campo">
        <label htmlFor={`${prefijo}-telefono`}>Teléfono (opcional)</label>
        <input
          id={`${prefijo}-telefono`}
          name="telefono"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          value={datos.telefono}
          onChange={cambiar}
        />
      </div>

      {esArrepentimiento && (
        <div className="campo">
          <label htmlFor={`${prefijo}-pedido`}>Número de pedido</label>
          <input
            id={`${prefijo}-pedido`}
            name="pedido"
            type="number"
            min="1"
            step="1"
            value={datos.pedido}
            onChange={cambiar}
            aria-describedby={`${prefijo}-ayuda-pedido`}
            required
          />
          <p id={`${prefijo}-ayuda-pedido`} className="nota">Lo encontrás en "Mis pedidos" (por ejemplo, 12 para el pedido #12).</p>
        </div>
      )}

      <div className="campo">
        <label htmlFor={`${prefijo}-mensaje`}>{esArrepentimiento ? "Comentarios (opcional)" : "Mensaje"}</label>
        <textarea
          id={`${prefijo}-mensaje`}
          name="mensaje"
          rows={5}
          maxLength={2000}
          value={datos.mensaje}
          onChange={cambiar}
          required={!esArrepentimiento}
        />
      </div>

      {/* Campo trampa: las personas no lo ven; los bots suelen completarlo. */}
      <div className="campo-trampa" aria-hidden="true">
        <label htmlFor={`${prefijo}-sitio`}>Dejá este campo vacío</label>
        <input
          id={`${prefijo}-sitio`}
          name="sitioWeb"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={datos.sitioWeb}
          onChange={cambiar}
        />
      </div>

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? "Enviando..." : esArrepentimiento ? "Enviar pedido de arrepentimiento" : "Enviar mensaje"}
      </button>
    </form>
  );
}

export default FormularioMensaje;
