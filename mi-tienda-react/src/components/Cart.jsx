import { etiquetaVariante, precioDe, stockDe } from "../variantes";

function Cart({ carrito, onAumentar, onDisminuir, onFinalizar }) {
  const total = carrito.reduce((suma, item) => suma + precioDe(item, item.variante) * item.cantidad, 0);

  return (
    <div>
      <h2>Carrito</h2>

      {carrito.length === 0 && <p className="carrito-vacio">Tu carrito está vacío</p>}

      <ul className="carrito-lista">
        {carrito.map((item) => {
          const esDigital = item.tipo === "digital";
          const precio = precioDe(item, item.variante);
          const stock = stockDe(item, item.variante);
          const variante = etiquetaVariante(item, item.variante);
          const nombre = variante ? `${item.nombre} (${variante})` : item.nombre;

          return (
            <li className="carrito-item" key={item.clave}>
              <span>
                {item.nombre} — ${precio.toLocaleString("es-AR")}
                {esDigital ? " (digital)" : " c/u"}
                {variante && <small className="carrito-variante">{variante}</small>}
              </span>

              {esDigital ? (
                <button
                  className="boton-quitar"
                  onClick={() => onDisminuir(item.clave)}
                  aria-label={`Quitar del carrito: ${nombre}`}
                >
                  Quitar
                </button>
              ) : (
                <div className="cantidad-control" role="group" aria-label={`Cantidad de ${nombre}`}>
                  <button
                    className="boton-cantidad"
                    onClick={() => onDisminuir(item.clave)}
                    aria-label={`Quitar una unidad de ${nombre}`}
                  >
                    −
                  </button>
                  <span aria-live="polite">×{item.cantidad}</span>
                  <button
                    className="boton-cantidad"
                    onClick={() => onAumentar(item, 1, item.variante)}
                    disabled={stock != null && item.cantidad >= stock}
                    aria-label={`Agregar una unidad más de ${nombre}`}
                  >
                    +
                  </button>
                </div>
              )}

              <span className="carrito-subtotal">
                ${(precio * item.cantidad).toLocaleString("es-AR")}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="carrito-total" aria-live="polite">
        Total: ${total.toLocaleString("es-AR")}
      </p>

      {carrito.length > 0 && (
        <button className="boton" onClick={onFinalizar}>Finalizar compra</button>
      )}
    </div>
  );
}

export default Cart;
