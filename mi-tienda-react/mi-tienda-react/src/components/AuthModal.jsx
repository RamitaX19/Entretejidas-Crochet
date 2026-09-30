import { useState } from "react";
import Login from "./Login";
import Registro from "./Registro";

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
        aria-label={vista === "login" ? "Iniciar sesión" : "Crear cuenta"}
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

        {vista === "login" ? (
          <>
            <Login onLoginExitoso={onLoginExitoso} />
            <p>
              ¿No tenés cuenta?{" "}
              <button className="boton-enlace" onClick={() => cambiarVista("registro")}>
                Registrate
              </button>
            </p>
          </>
        ) : (
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
      </div>
    </div>
  );
}

export default AuthModal;
