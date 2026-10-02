import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Galeria from "../components/Galeria";
import Precio from "./Precio";
import {
  claveCarrito,
  pesos,
  precioDe,
  precioOriginalDe,
  textoPrecio,
  textoPrecioOriginal,
  tieneVariantes,
} from "../variantes";
import { linkDeCategoria } from "../categorias";

function ProductoDetalle(props) {
  const { id } = useParams();
  // La key hace que cada producto arranque con la selección y la cantidad limpias.
  return <DetalleDelProducto key={id} id={id} {...props} />;
}

function DetalleDelProducto({ id, productos, carrito, cargando, agregarAlCarrito }) {
  const [elegidos, setElegidos] = useState({});
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(0);

  const producto = productos.find((p) => p.id === Number(id));

  if (cargando) {
    return (
      <main className="detalle">
        <p role="status">Cargando producto...</p>
      </main>
    );
  }

  if (!producto) {
    return (
      <main className="detalle">
        <h1>No encontramos este producto</h1>
        <p>Puede que ya no esté disponible.</p>
        <Link to="/" className="volver">
          Volver a la tienda
        </Link>
      </main>
    );
  }

  const esDigital = producto.tipo === "digital";
  const conVariantes = tieneVariantes(producto);
  // Las opciones con un solo valor quedan elegidas solas.
  const seleccion = Object.fromEntries(
    producto.opciones.map((o) => [o.nombre, o.valores.length === 1 ? o.valores[0] : elegidos[o.nombre]]),
  );
  const faltan = producto.opciones.filter((o) => !seleccion[o.nombre]).map((o) => o.nombre.toLowerCase());
  const variante = conVariantes && faltan.length === 0
    ? producto.variantes.find((v) => producto.opciones.every((o) => v.valores[o.nombre] === seleccion[o.nombre])) ?? null
    : null;
  const combinacionInexistente = conVariantes && faltan.length === 0 && !variante;

  const enCarrito = carrito.find((item) => item.clave === claveCarrito(producto.id, variante))?.cantidad ?? 0;
  const yaEnCarrito = enCarrito > 0;
  const stock = conVariantes ? variante?.stock ?? null : producto.stock;
  const disponibles = stock === null ? Infinity : stock - enCarrito;
  const sePuedeAgregar = !conVariantes || variante !== null;
  // Con una variante elegida, su precio; si no, el del producto ("Desde $..." si las variantes cambian).
  const precioFinal = variante ? pesos(precioDe(producto, variante)) : textoPrecio(producto);
  const precioOriginal = variante ? pesos(precioOriginalDe(producto, variante)) : textoPrecioOriginal(producto);

  // ¿Hay alguna combinación con stock con este valor y lo que ya se eligió en las otras opciones?
  function valorDisponible(opcion, valor) {
    return producto.variantes.some(
      (v) =>
        v.stock !== 0 &&
        v.valores[opcion.nombre] === valor &&
        producto.opciones.every(
          (o) => o.nombre === opcion.nombre || !seleccion[o.nombre] || v.valores[o.nombre] === seleccion[o.nombre],
        ),
    );
  }

  function elegir(nombreOpcion, valor) {
    setElegidos({ ...elegidos, [nombreOpcion]: valor });
    setCantidad(1);
    setAgregado(0);
  }

  function cambiarCantidad(nueva) {
    setCantidad(nueva);
    setAgregado(0);
  }

  function agregar() {
    agregarAlCarrito(producto, cantidad, variante);
    setAgregado(cantidad);
    setCantidad(1);
  }

  return (
    <main className="detalle">
      <Link to="/" className="volver">
        Volver a la tienda
      </Link>

      <article className="detalle-producto">
        <Galeria imagenes={producto.imagenes} nombre={producto.nombre} />

        <div className="detalle-info">
          {producto.categoria && (
            <p className="producto-categoria">
              {producto.categoriaPadreId && (
                <>
                  <Link to={linkDeCategoria(producto.categoriaPadreId)}>{producto.categoriaPadre}</Link>
                  <span aria-hidden="true"> › </span>
                </>
              )}
              <Link to={linkDeCategoria(producto.categoriaId)}>{producto.categoria}</Link>
            </p>
          )}
          <h1>{producto.nombre}</h1>

          <p className={`insignia ${esDigital ? "digital" : ""}`}>
            <span aria-hidden="true">{esDigital ? "📄" : "📦"}</span>{" "}
            {esDigital ? "Descarga digital" : "Envío a domicilio"}
          </p>

          <div aria-live="polite">
            <Precio className="detalle-precio" final={precioFinal} original={precioOriginal} oferta={producto.oferta} />
          </div>

          {producto.descripcion && (
            <p className="detalle-descripcion">{producto.descripcion}</p>
          )}

          {producto.opciones.map((opcion) => (
            <fieldset key={opcion.nombre} className="selector-opcion">
              <legend>
                {opcion.nombre}
                {seleccion[opcion.nombre] && <span className="opcion-elegida">: {seleccion[opcion.nombre]}</span>}
              </legend>
              <div className="chips">
                {opcion.valores.map((valor) => {
                  const disponible = valorDisponible(opcion, valor);

                  return (
                    <label key={valor} className={`chip-opcion ${disponible ? "" : "agotada"}`}>
                      <input
                        type="radio"
                        name={`opcion-${opcion.nombre}`}
                        value={valor}
                        checked={seleccion[opcion.nombre] === valor}
                        onChange={() => elegir(opcion.nombre, valor)}
                      />
                      <span>
                        {valor}
                        {!disponible && <span className="solo-lector"> (no disponible)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {conVariantes && faltan.length > 0 && (
            <p className="detalle-stock">Elegí {faltan.join(" y ")} para ver el stock.</p>
          )}

          {combinacionInexistente && (
            <p className="sin-stock">Esa combinación no está disponible.</p>
          )}

          {!esDigital && sePuedeAgregar && stock > 0 && (
            <p className="detalle-stock">
              {stock === 1 ? "Queda 1 unidad" : `Quedan ${stock} unidades`}
            </p>
          )}

          {!esDigital && sePuedeAgregar && stock === 0 && (
            <p className="sin-stock">Sin stock por ahora.</p>
          )}

          {esDigital && !yaEnCarrito && (
            <div className="detalle-compra">
              <button className="boton" onClick={agregar}>
                Agregar al carrito
              </button>
            </div>
          )}

          {esDigital && yaEnCarrito && (
            <p role="status" className="aviso aviso-ok">
              Ya está en tu carrito. Los productos digitales se compran de a una
              unidad.
            </p>
          )}

          {!esDigital && sePuedeAgregar && disponibles > 0 && (
            <div className="detalle-compra">
              <div
                className="cantidad-control"
                role="group"
                aria-label="Cantidad"
              >
                <button
                  className="boton-cantidad"
                  onClick={() => cambiarCantidad(cantidad - 1)}
                  disabled={cantidad <= 1}
                  aria-label="Una unidad menos"
                >
                  −
                </button>
                <span aria-live="polite">{cantidad}</span>
                <button
                  className="boton-cantidad"
                  onClick={() => cambiarCantidad(cantidad + 1)}
                  disabled={cantidad >= disponibles}
                  aria-label="Una unidad más"
                >
                  +
                </button>
              </div>

              <button className="boton" onClick={agregar}>
                Agregar al carrito
              </button>
            </div>
          )}

          {!esDigital && sePuedeAgregar && stock > 0 && disponibles <= 0 && (
            <p role="status" className="aviso aviso-ok">
              Ya tenés en el carrito todas las unidades disponibles.
            </p>
          )}

          {!esDigital && agregado > 0 && (
            <p role="status" className="aviso aviso-ok">
              Agregado al carrito ({agregado}{" "}
              {agregado === 1 ? "unidad" : "unidades"}).
            </p>
          )}
        </div>
      </article>
    </main>
  );
}

export default ProductoDetalle;
