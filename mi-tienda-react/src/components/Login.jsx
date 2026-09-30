import {useState} from "react";
import { API_URL } from "../config";

function Login ({onLoginExitoso}) {
    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");

    async function manejarSubmit(e) {
        e.preventDefault();
        setError("");

        try {
            const respuesta = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({email, contrasena}),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.error);
                return;
            }

            onLoginExitoso(datos);
        } catch (err) {
            console.error(err);
            setError("No se pudo conectar con el servidor");
        }
    }

    return (
  <form onSubmit={manejarSubmit}>
    <h2>Iniciar sesión</h2>

    {error && <p role="alert" className="mensaje-error">{error}</p>}

    <div className="campo">
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </div>

    <div className="campo">
      <label htmlFor="login-contrasena">Contraseña</label>
      <input
        id="login-contrasena"
        type="password"
        autoComplete="current-password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        required
      />
    </div>

    <button type="submit" className="boton">Ingresar</button>
  </form>
);
}

export default Login;
