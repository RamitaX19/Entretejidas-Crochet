import { useState } from "react";
import { API_URL } from "../config";

function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/recuperar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error);
        return;
      }

      setEnviado(datos.mensaje);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div role="status" className="aviso aviso-ok">
        <p>{enviado}</p>
        <p>Revisá también la carpeta de spam. El link vence en 1 hora.</p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarSubmit}>
      <h2>Recuperar contraseña</h2>
      <p>Escribí el email de tu cuenta y te mandamos un link para crear una contraseña nueva.</p>

      {error && <p role="alert" className="mensaje-error">{error}</p>}

      <div className="campo">
        <label htmlFor="recuperar-email">Email</label>
        <input
          id="recuperar-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? "Enviando..." : "Mandarme el link"}
      </button>
    </form>
  );
}

export default RecuperarContrasena;
