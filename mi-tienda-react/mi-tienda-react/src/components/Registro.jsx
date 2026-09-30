import { useState } from "react";
import { API_URL } from "../config";

function Registro({ onRegistroExitoso }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const respuesta = await fetch(`${API_URL}/api/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, contrasena }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error);
        return;
      }

      onRegistroExitoso();
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    }
  }

  return (
  <form onSubmit={manejarSubmit}>
    <h2>Crear cuenta</h2>

    {error && <p role="alert" className="mensaje-error">{error}</p>}

    <div className="campo">
      <label htmlFor="registro-nombre">Nombre</label>
      <input
        id="registro-nombre"
        type="text"
        autoComplete="name"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />
    </div>

    <div className="campo">
      <label htmlFor="registro-email">Email</label>
      <input
        id="registro-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </div>

    <div className="campo">
      <label htmlFor="registro-contrasena">Contraseña</label>
      <input
        id="registro-contrasena"
        type="password"
        autoComplete="new-password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        required
      />
    </div>

    <button type="submit" className="boton">Registrarme</button>
  </form>
);
}

export default Registro;