import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { leerJson, pedirApi } from "../api";
import AdminNav from "../components/AdminNav";
import ProductoImagen from "../components/ProductoImagen";
import { etiquetaVariante, stockDe, tieneVariantes } from "../variantes";

// Desde esta cantidad para abajo, el producto se marca con "Pocas unidades".
const STOCK_BAJO = 3;

// Una fila por producto, o una por variante si el producto tiene variantes.
function filasDe(productos) {
  return productos.flatMap((producto) =>
    tieneVariantes(producto)
      ? producto.variantes.map((variante) => ({ clave: `v${variante.id}`, producto, variante }))
      : [{ clave: `p${producto.id}`, producto, variante: null }],
  );
}

function estadoStock({ producto, variante }) {
  const stock = stockDe(producto, variante);
  if (producto.tipo === "digital") return { orden: 4, texto: "No aplica (digital)", clase: "etiqueta-neutra" };
  if (stock === null) return { orden: 3, texto: "Disponible", clase: "etiqueta-ok" };
  if (stock === 0) return { orden: 0, texto: "Sin stock", clase: "etiqueta-peligro" };
  if (stock <= STOCK_BAJO) return { orden: 1, texto: "Pocas unidades", clase: "etiqueta-alerta" };
  return { orden: 2, texto: "Disponible", clase: "etiqueta-ok" };
}

// Lo urgente primero. Se ordena una sola vez al cargar, para que las filas no salten mientras se edita.
function ordenar(filas) {
  return [...filas]
    .sort(
      (a, b) =>
        estadoStock(a).orden - estadoStock(b).orden ||
        (stockDe(a.producto, a.variante) ?? 0) - (stockDe(b.producto, b.variante) ?? 0) ||
        a.producto.nombre.localeCompare(b.producto.nombre),
    )
    .map((fila) => fila.clave);
}

function valorGuardado({ producto, variante }) {
  const stock = stockDe(producto, variante);
  return stock === null ? "" : String(stock);
}

function nombreFila({ producto, variante }) {
  return variante ? `${producto.nombre} (${etiquetaVariante(producto, variante)})` : producto.nombre;
}

function AdminStock({ onStockCambiado }) {
  const [productos, setProductos] = useState([]);
  const [orden, setOrden] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [borradores, setBorradores] = useState({});
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/productos`)
      .then(leerJson)
      .then((datos) => {
        setProductos(datos);
        setOrden(ordenar(filasDe(datos)));
      })
      .catch((err) => {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar los productos. Probá de nuevo." });
      })
      .finally(() => setCargando(false));
  }, []);

  const porClave = new Map(filasDe(productos).map((fila) => [fila.clave, fila]));
  const filas = orden.map((clave) => porClave.get(clave)).filter(Boolean);

  function borrador(fila) {
    return borradores[fila.clave] ?? valorGuardado(fila);
  }

  function cambiarBorrador(fila, valor) {
    setBorradores((actuales) => ({ ...actuales, [fila.clave]: valor }));
  }

  async function guardarStock(e, fila) {
    e.preventDefault();
    const texto = borrador(fila).trim();
    const stock = texto === "" ? null : Number(texto);

    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setAviso({
        tipo: "error",
        texto: `El stock de "${nombreFila(fila)}" tiene que ser un número entero, de 0 para arriba (o vacío para "sin límite").`,
      });
      return;
    }

    setAviso(null);
    setGuardando(fila.clave);

    try {
      const ruta = fila.variante ? `/api/variantes/${fila.variante.id}/stock` : `/api/productos/${fila.producto.id}/stock`;
      const respuesta = await pedirApi(ruta, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setProductos((lista) => lista.map((p) => (p.id === datos.id ? datos : p)));
      setBorradores((actuales) => {
        const resto = { ...actuales };
        delete resto[fila.clave];
        return resto;
      });

      const cantidad = stock === null ? "sin límite" : `${stock} ${stock === 1 ? "unidad" : "unidades"}`;
      setAviso({ tipo: "ok", texto: `Stock de "${nombreFila(fila)}" actualizado: ${cantidad}.` });
      onStockCambiado();
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    } finally {
      setGuardando(null);
    }
  }

  const estados = filas.map(estadoStock);
  const sinStock = estados.filter((estado) => estado.orden === 0).length;
  const pocas = estados.filter((estado) => estado.orden === 1).length;

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <section className="tarjeta">
        {!cargando && (
          <p className="resumen-stock">
            {sinStock === 0 && pocas === 0
              ? "Todos los productos físicos tienen stock."
              : `${sinStock} sin stock · ${pocas} con pocas unidades (${STOCK_BAJO} o menos)`}
          </p>
        )}

        <div className="tabla-contenedor" role="region" aria-label="Stock de productos" tabIndex={0}>
          <table>
            <caption>Stock ({productos.length} productos)</caption>
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Producto</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="num">Stock</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={5} role="status">Cargando productos...</td>
                </tr>
              )}

              {!cargando && productos.length === 0 && (
                <tr>
                  <td colSpan={5}>Todavía no hay productos.</td>
                </tr>
              )}

              {filas.map((fila, i) => {
                const { producto, variante } = fila;
                const estado = estados[i];
                const cambiado = borrador(fila) !== valorGuardado(fila);
                const estaGuardando = guardando === fila.clave;
                const nombre = nombreFila(fila);

                return (
                  <tr key={fila.clave}>
                    <td>
                      <ProductoImagen imagen={producto.imagenes[0]?.ruta} className="miniatura" />
                    </td>
                    <th scope="row">
                      {producto.nombre}
                      {variante && <small className="fila-variante">{etiquetaVariante(producto, variante)}</small>}
                    </th>
                    <td>{producto.tipo === "digital" ? "Digital" : "Físico"}</td>
                    <td className="num">
                      {producto.tipo === "digital" ? (
                        "—"
                      ) : (
                        <form className="stock-form" onSubmit={(e) => guardarStock(e, fila)}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="Sin límite"
                            value={borrador(fila)}
                            onChange={(e) => cambiarBorrador(fila, e.target.value)}
                            aria-label={`Stock de ${nombre}`}
                          />
                          <button
                            type="submit"
                            className="boton boton-secundario"
                            disabled={!cambiado || estaGuardando}
                            aria-label={`Guardar el stock de ${nombre}`}
                          >
                            {estaGuardando ? "Guardando..." : "Guardar"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td>
                      <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="nota">
          Escribí las unidades disponibles para vender y tocá Guardar (o Enter). Vacío significa "sin límite". No cuentes
          las unidades de pedidos que todavía no enviaste: la tienda ya las descontó.
        </p>
      </section>
    </main>
  );
}

export default AdminStock;
