import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { pedirApi } from "../api";
import { etiquetaVariante, precioDe } from "../variantes";

function Checkout({ carrito, usuario, onPedidoCreado, onAbrirAuth }) {
  const navigate = useNavigate();
  const [medios, setMedios] = useState(null);
  const [metodoPago, setMetodoPago] = useState("");
  const [entrega, setEntrega] = useState("envio");
  const [formulario, setFormulario] = useState({
    destinatario: usuario?.nombre ?? "",
    telefono: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    codigoPostal: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigoCupon, setCodigoCupon] = useState("");
  const [cupon, setCupon] = useState(null);
  const [errorCupon, setErrorCupon] = useState("");
  const [revisandoCupon, setRevisandoCupon] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/pagos`)
      .then((respuesta) => respuesta.json())
      .then((disponibles) => {
        setMedios(disponibles);
        if (disponibles.transferencia) setMetodoPago("transferencia");
        else if (disponibles.mercadoPago) setMetodoPago("mercadopago");
      })
      .catch((err) => {
        console.error(err);
        setMedios({ transferencia: null, mercadoPago: false });
      });
  }, []);

  if (!usuario) {
    return (
      <main className="checkout">
        <h1>Finalizar compra</h1>
        <p>Para finalizar la compra tenés que iniciar sesión.</p>
        <button className="boton" onClick={() => onAbrirAuth("login", "compra")}>
          Iniciar sesión
        </button>
      </main>
    );
  }

  if (carrito.length === 0) {
    return (
      <main className="checkout">
        <h1>Finalizar compra</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/" className="volver">Volver a la tienda</Link>
      </main>
    );
  }

  const subtotal = carrito.reduce((suma, item) => suma + precioDe(item, item.variante) * item.cantidad, 0);
  // Mismo redondeo que el backend, que igual recalcula todo al crear el pedido.
  const descuento = cupon ? Math.round((subtotal * cupon.porcentaje) / 100) : 0;
  const total = subtotal - descuento;
  const gratis = total === 0;
  const hayFisicos = carrito.some((item) => item.tipo !== "digital");
  const hayDigitales = carrito.some((item) => item.tipo === "digital");
  const sinMedios = medios && !medios.transferencia && !medios.mercadoPago;

  function cambiarCampo(e) {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  }

  async function aplicarCupon() {
    setErrorCupon("");
    if (!codigoCupon.trim()) return;
    setRevisandoCupon(true);

    try {
      const respuesta = await pedirApi("/api/cupones/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoCupon }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        if (respuesta.status !== 401) setErrorCupon(datos.error);
        return;
      }

      setCupon(datos);
      setCodigoCupon("");
    } catch (err) {
      console.error(err);
      setErrorCupon("No se pudo conectar con el servidor. Probá de nuevo.");
    } finally {
      setRevisandoCupon(false);
    }
  }

  async function confirmarPedido(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);

    try {
      const respuesta = await pedirApi("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((item) => ({ id: item.id, cantidad: item.cantidad, varianteId: item.variante?.id ?? null })),
          metodoPago,
          cupon: cupon?.codigo,
          entrega: hayFisicos ? entrega : null,
          ...formulario,
        }),
      });

      const pedido = await respuesta.json();

      if (!respuesta.ok) {
        // Si la sesión venció, App ya abrió el login con su propio aviso.
        if (respuesta.status !== 401) setError(pedido.error);
        return;
      }

      onPedidoCreado();

      if (metodoPago === "mercadopago" && pedido.estado === "pendiente") {
        navigate(`/pagar/${pedido.id}`);
      } else {
        navigate("/mis-pedidos", { state: { pedidoNuevo: pedido.id, pagado: pedido.estado === "pagado" } });
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor. Probá de nuevo en un momento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="checkout">
      <Link to="/" className="volver">Seguir comprando</Link>
      <h1>Finalizar compra</h1>

      {error && <p role="alert" className="aviso aviso-error">{error}</p>}

      <form onSubmit={confirmarPedido}>
        <section className="tarjeta" aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen">Tu pedido</h2>
          <ul className="resumen-lista">
            {carrito.map((item) => {
              const variante = etiquetaVariante(item, item.variante);

              return (
                <li key={item.clave} className="resumen-item">
                  <span>
                    {item.nombre}
                    {variante && ` (${variante})`}
                    {item.tipo === "digital" ? " (digital)" : ` ×${item.cantidad}`}
                  </span>
                  <span>${(precioDe(item, item.variante) * item.cantidad).toLocaleString("es-AR")}</span>
                </li>
              );
            })}
          </ul>

          {cupon ? (
            <>
              <p className="resumen-item">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </p>
              <p className="resumen-item">
                <span>
                  Cupón <strong>{cupon.codigo}</strong> (−{cupon.porcentaje}%){" "}
                  <button type="button" className="boton-enlace" onClick={() => setCupon(null)}>
                    Quitar
                  </button>
                </span>
                <span>−${descuento.toLocaleString("es-AR")}</span>
              </p>
            </>
          ) : (
            <div className="campo cupon">
              <label htmlFor="checkout-cupon">¿Tenés un cupón de descuento?</label>
              <div className="cupon-fila">
                <input
                  id="checkout-cupon"
                  type="text"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter aplica el cupón en vez de confirmar todo el pedido.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      aplicarCupon();
                    }
                  }}
                  maxLength={30}
                  autoComplete="off"
                  aria-describedby={errorCupon ? "error-cupon" : undefined}
                />
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={aplicarCupon}
                  disabled={revisandoCupon}
                >
                  {revisandoCupon ? "Revisando..." : "Aplicar"}
                </button>
              </div>
              {errorCupon && (
                <p id="error-cupon" role="alert" className="mensaje-error">
                  {errorCupon}
                </p>
              )}
            </div>
          )}

          <p className="resumen-total">Total: ${total.toLocaleString("es-AR")}</p>
          {hayFisicos && <p className="nota">El costo del envío se coordina aparte y no está incluido.</p>}
          {hayDigitales && (
            <p className="nota">Los productos digitales se descargan desde "Mis pedidos" cuando se acredita el pago.</p>
          )}
        </section>

        {hayFisicos && (
          <section className="tarjeta">
            <fieldset>
              <legend>Entrega</legend>

              <div className="opciones">
                <label className="opcion">
                  <input
                    type="radio"
                    name="entrega"
                    value="envio"
                    checked={entrega === "envio"}
                    onChange={(e) => setEntrega(e.target.value)}
                  />
                  <span>Envío a domicilio</span>
                </label>
                <label className="opcion">
                  <input
                    type="radio"
                    name="entrega"
                    value="retiro"
                    checked={entrega === "retiro"}
                    onChange={(e) => setEntrega(e.target.value)}
                  />
                  <span>Retiro en persona</span>
                </label>
              </div>

              <div className="campo">
                <label htmlFor="checkout-destinatario">
                  {entrega === "envio" ? "Nombre de quien recibe" : "Nombre de quien retira"}
                </label>
                <input
                  id="checkout-destinatario"
                  name="destinatario"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  value={formulario.destinatario}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="campo">
                <label htmlFor="checkout-telefono">Teléfono</label>
                <input
                  id="checkout-telefono"
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  value={formulario.telefono}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              {entrega === "envio" ? (
                <>
                  <div className="campo">
                    <label htmlFor="checkout-direccion">Dirección (calle, número, piso y depto)</label>
                    <input
                      id="checkout-direccion"
                      name="direccion"
                      type="text"
                      autoComplete="street-address"
                      maxLength={200}
                      value={formulario.direccion}
                      onChange={cambiarCampo}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="checkout-ciudad">Ciudad</label>
                    <input
                      id="checkout-ciudad"
                      name="ciudad"
                      type="text"
                      autoComplete="address-level2"
                      maxLength={100}
                      value={formulario.ciudad}
                      onChange={cambiarCampo}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="checkout-provincia">Provincia</label>
                    <input
                      id="checkout-provincia"
                      name="provincia"
                      type="text"
                      autoComplete="address-level1"
                      maxLength={100}
                      value={formulario.provincia}
                      onChange={cambiarCampo}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="checkout-cp">Código postal</label>
                    <input
                      id="checkout-cp"
                      name="codigoPostal"
                      type="text"
                      autoComplete="postal-code"
                      maxLength={10}
                      value={formulario.codigoPostal}
                      onChange={cambiarCampo}
                      required
                    />
                  </div>
                </>
              ) : (
                <p className="nota">Te contactamos por teléfono para coordinar el día y el lugar de retiro.</p>
              )}
            </fieldset>
          </section>
        )}

        <section className="tarjeta">
          <fieldset>
            <legend>Pago</legend>

            {gratis && <p>El cupón cubre el total del pedido: no hace falta pagar nada.</p>}
            {!gratis && !medios && <p role="status">Cargando medios de pago...</p>}
            {!gratis && sinMedios && <p>Por ahora no hay medios de pago disponibles. Probá más tarde.</p>}

            {!gratis && (
              <div className="opciones">
                {medios?.transferencia && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name="pago"
                      value="transferencia"
                      checked={metodoPago === "transferencia"}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    />
                    <span>
                      Transferencia bancaria
                      <small>Al confirmar te mostramos los datos para transferir.</small>
                    </span>
                  </label>
                )}
                {medios?.mercadoPago && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name="pago"
                      value="mercadopago"
                      checked={metodoPago === "mercadopago"}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    />
                    <span>
                      Mercado Pago
                      <small>Pagás con tarjeta de crédito o débito acá mismo, o con tu cuenta de Mercado Pago.</small>
                    </span>
                  </label>
                )}
              </div>
            )}
          </fieldset>
        </section>

        <button type="submit" className="boton" disabled={enviando || (!gratis && !metodoPago)}>
          {enviando
            ? "Confirmando..."
            : gratis
              ? "Confirmar pedido"
              : `Confirmar pedido por $${total.toLocaleString("es-AR")}`}
        </button>
      </form>
    </main>
  );
}

export default Checkout;
