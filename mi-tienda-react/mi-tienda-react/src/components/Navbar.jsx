import { useState } from "react";
import { Link } from "react-router-dom";
import Cart from "./Cart";

function Navbar({
  usuario,
  cerrarSesion,
  carrito,
  aumentarCantidad,
  disminuirCantidad,
  finalizarCompra,
  carritoAbierto,
  onAlternarCarrito,
  onCerrarCarrito,
  onAbrirAuth,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <header className="cabecera">
      <div className="cabecera-contenido">
        <Link to="/" className="marca" onClick={cerrarMenu}>Entretejidas</Link>

        <nav
          id="menu-cuenta"
          aria-label="Cuenta"
          className={`cuenta ${menuAbierto ? "abierta" : ""}`}
        >
          {usuario ? (
            <>
              <span>Hola, {usuario.nombre}</span>
              <Link to="/mis-pedidos" onClick={cerrarMenu}>Mis pedidos</Link>
              {usuario.esAdmin && (
                <Link to="/admin" onClick={cerrarMenu}>Panel de administrador</Link>
              )}
              <button
                className="boton boton-claro"
                onClick={() => {
                  cerrarMenu();
                  cerrarSesion();
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button
                className="boton boton-claro"
                onClick={() => {
                  cerrarMenu();
                  onAbrirAuth("login");
                }}
              >
                Iniciar sesión
              </button>
              <button
                className="boton boton-claro"
                onClick={() => {
                  cerrarMenu();
                  onAbrirAuth("registro");
                }}
              >
                Registrarte
              </button>
            </>
          )}
        </nav>

        <div className="cabecera-acciones">
          <button
            className="boton boton-claro boton-menu"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-expanded={menuAbierto}
            aria-controls="menu-cuenta"
          >
            Menú
          </button>

          <div className="carrito-nav">
            <button
              className="boton boton-claro boton-carrito"
              onClick={() => {
                cerrarMenu();
                onAlternarCarrito();
              }}
              aria-expanded={carritoAbierto}
              aria-controls="carrito-desplegable"
              aria-label={`Carrito, ${cantidadTotal} ${cantidadTotal === 1 ? "producto" : "productos"}`}
            >
              Carrito
              {cantidadTotal > 0 && (
                <span className="carrito-contador" aria-hidden="true">{cantidadTotal}</span>
              )}
            </button>

            {carritoAbierto && (
              <>
                <div className="carrito-fondo" onClick={onCerrarCarrito} aria-hidden="true"></div>
                <div id="carrito-desplegable" className="carrito-desplegable">
                  <button className="panel-cerrar" onClick={onCerrarCarrito} aria-label="Cerrar carrito">
                    ✕
                  </button>
                  <Cart
                    carrito={carrito}
                    onAumentar={aumentarCantidad}
                    onDisminuir={disminuirCantidad}
                    onFinalizar={finalizarCompra}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="cinta" aria-hidden="true"></div>
    </header>
  );
}

export default Navbar;