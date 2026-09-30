import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../config";

const LARGO_MINIMO = 8;

// Página del link que llega por correo: /restablecer#código. El código va después del # para que
// no quede guardado en los registros del servidor.
function Restablecer({ onAbrirAuth }) {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const codigo = hash.slice(1);
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");

    if (contrasena !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/restablecer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, contrasena }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error);
        return;
      }

      setListo(true);
      // El link ya no sirve: se saca de la dirección.
      navigate(pathname, { replace: true });
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor. Probá de nuevo en un momento.");
    } finally {
      setGuardando(false);
    }
  }

  if (listo) {
    return (
      <main className="pagina pagina-angosta">
        <h1>Contraseña nueva</h1>
        <p role="status" className="aviso aviso-ok">Listo: ya podés iniciar sesión con tu contraseña nueva.</p>
        <button className="boton" onClick={() => onAbrirAuth("login")}>Iniciar sesión</button>
      </main>
    );
  }

  if (!/^[0-9a-f]{64}$/.test(codigo)) {
    return (
      <main className="pagina pagina-angosta">
        <h1>Contraseña nueva</h1>
        <p>Este link no es válido. Puede que esté incompleto: probá copiarlo entero desde el correo, o pedí uno nuevo.</p>
        <button className="boton" onClick={() => onAbrirAuth("recuperar")}>Pedir un link nuevo</button>
      </main>
    );
  }

  return (
    <main className="pagina pagina-angosta">
      <h1>Contraseña nueva</h1>

      <form className="tarjeta" onSubmit={manejarSubmit}>
        {error && (
          <div role="alert" className="aviso aviso-error">
            <p>{error}</p>
            {error.includes("Pedí uno nuevo") && (
              <button type="button" className="boton-enlace" onClick={() => onAbrirAuth("recuperar")}>
                Pedir un link nuevo
              </button>
            )}
          </div>
        )}

        <div className="campo">
          <label htmlFor="restablecer-contrasena">Contraseña nueva</label>
          <input
            id="restablecer-contrasena"
            type="password"
            autoComplete="new-password"
            minLength={LARGO_MINIMO}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            aria-describedby="restablecer-ayuda"
            required
          />
          <p id="restablecer-ayuda" className="nota">Al menos {LARGO_MINIMO} caracteres.</p>
        </div>

        <div className="campo">
          <label htmlFor="restablecer-repetida">Repetí la contraseña</label>
          <input
            id="restablecer-repetida"
            type="password"
            autoComplete="new-password"
            minLength={LARGO_MINIMO}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}

export default Restablecer;
