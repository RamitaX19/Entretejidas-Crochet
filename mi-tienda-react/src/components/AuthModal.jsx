import { useState } from "react";
import Login from "./Login";
import Registro from "./Registro";
import RecuperarContrasena from "./RecuperarContrasena";

const TITULOS = {
  login: "Iniciar sesión",
  registro: "Crear cuenta",
  recuperar: "Recuperar contraseña",
};

function AuthModal({ vista, onCambiarVista, onCerrar, onLoginExitoso, mensaje }) {
  const [cuentaCreada, setCuentaCreada] = useState(false);

  function cambiarVista(nuevaVista) {
    setCuentaCreada(false);
    onCambiarVista(nuevaVista);
  }

  function registroExitoso() {
    onCambiarVista("login");
    setCuentaCreada(true);
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={TITULOS[vista] ?? TITULOS.login}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        {cuentaCreada ? (
          <p role="status" className="aviso aviso-ok">
            ¡Listo! Tu cuenta quedó creada. Ahora iniciá sesión.
          </p>
        ) : (
          mensaje && <p className="modal-mensaje">{mensaje}</p>
        )}

        {vista === "registro" && (
          <>
            <Registro onRegistroExitoso={registroExitoso} />
            <p>
              ¿Ya tenés cuenta?{" "}
              <button className="boton-enlace" onClick={() => cambiarVista("login")}>
                Iniciar sesión
              </button>
            </p>
          </>
        )}

        {vista === "recuperar" && (
          <>
            <RecuperarContrasena />
            <p>
              <button className="boton-enlace" onClick={() => cambiarVista("login")}>
                Volver a iniciar sesión
              </button>
            </p>
          </>
        )}

        {vista !== "registro" && vista !== "recuperar" && (
          <>
            <Login onLoginExitoso={onLoginExitoso} />
            <p>
              <button className="boton-enlace" onClick={() => cambiarVista("recuperar")}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
            <p>
              ¿No tenés cuenta?{" "}
              <button className="boton-enlace" onClick={() => cambiarVista("registro")}>
                Registrate
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
