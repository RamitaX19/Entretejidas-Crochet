import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { hayStock, preciosDe, rangoPrecios, tieneVariantes } from "../variantes";

// Sin tildes y en minúsculas, para que "patron" encuentre "Patrón".
function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Los filtros de opciones van en la dirección como v_color=Rojo.
const PREFIJO_OPCION = "v_";

// Opciones de todas las variantes (Color, Talle...) con sus valores, para armar los filtros.
function opcionesDisponibles(productos) {
  const opciones = new Map();

  for (const producto of productos) {
    for (const opcion of producto.opciones ?? []) {
      const clave = normalizar(opcion.nombre);
      if (!opciones.has(clave)) opciones.set(clave, { clave, nombre: opcion.nombre, valores: new Map() });
      const valores = opciones.get(clave).valores;
      for (const valor of opcion.valores) {
        if (!valores.has(normalizar(valor))) valores.set(normalizar(valor), valor);
      }
    }
  }

  return [...opciones.values()].map((opcion) => ({ ...opcion, valores: [...opcion.valores.values()] }));
}

// Hay una variante que cumple todos los filtros de opciones (y tiene stock si se pidió).
function coincideVariantes(producto, filtrosOpcion, soloConStock) {
  if (filtrosOpcion.length === 0) return !soloConStock || hayStock(producto);
  if (!tieneVariantes(producto)) return false;

  return producto.variantes.some(
    (variante) =>
      (!soloConStock || variante.stock !== 0) &&
      filtrosOpcion.every(([clave, valor]) => {
        const opcion = producto.opciones.find((o) => normalizar(o.nombre) === clave);
        return opcion && normalizar(variante.valores[opcion.nombre]) === normalizar(valor);
      }),
  );
}

const ORDENES = {
  nuevos: (a, b) => b.id - a.id,
  "precio-asc": (a, b) => rangoPrecios(a).minimo - rangoPrecios(b).minimo,
  "precio-desc": (a, b) => rangoPrecios(b).minimo - rangoPrecios(a).minimo,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
};

function Catalogo({ productos, categorias, cargando, error }) {
  const [parametros, setParametros] = useSearchParams();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const q = parametros.get("q") ?? "";
  const categoria = parametros.get("categoria") ?? "";
  const tipo = parametros.get("tipo") ?? "";
  const minimo = parametros.get("min") ?? "";
  const maximo = parametros.get("max") ?? "";
  const soloConStock = parametros.get("stock") === "1";
  const orden = ORDENES[parametros.get("orden")] ? parametros.get("orden") : "nuevos";
  const filtrosOpcion = [...parametros.entries()]
    .filter(([nombre, valor]) => nombre.startsWith(PREFIJO_OPCION) && valor)
    .map(([nombre, valor]) => [nombre.slice(PREFIJO_OPCION.length), valor]);

  const palabras = normalizar(q).split(/\s+/).filter(Boolean);
  const categoriaElegida = categorias.find((c) => String(c.id) === categoria);

  // Búsqueda, categoría, tipo y precio. Los filtros de opciones se arman con estos productos.
  const candidatos = productos.filter((producto) => {
    const textoProducto = normalizar(`${producto.nombre} ${producto.descripcion} ${producto.categoria ?? ""}`);
    // Con variantes de distinto precio, alcanza con que una entre en el rango.
    const precioEnRango = preciosDe(producto).some(
      (precio) => (minimo === "" || precio >= Number(minimo)) && (maximo === "" || precio <= Number(maximo)),
    );

    return (
      palabras.every((palabra) => textoProducto.includes(palabra)) &&
      (!categoria || String(producto.categoriaId) === categoria) &&
      (!tipo || producto.tipo === tipo) &&
      precioEnRango
    );
  });

  const resultados = candidatos
    .filter((producto) => coincideVariantes(producto, filtrosOpcion, soloConStock))
    .sort(ORDENES[orden]);

  // Solo las opciones de estos productos, más las ya elegidas (así se ven y se pueden sacar).
  const opciones = opcionesDisponibles(candidatos);
  for (const [clave, valor] of filtrosOpcion) {
    let opcion = opciones.find((o) => o.clave === clave);
    if (!opcion) {
      opcion = opcionesDisponibles(productos).find((o) => o.clave === clave) ?? { clave, nombre: clave, valores: [] };
      opciones.push(opcion);
    }
    if (!opcion.valores.includes(valor)) opcion.valores.push(valor);
  }

  function cambiar(nombre, valor) {
    const nuevos = new URLSearchParams(parametros);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    setParametros(nuevos, { replace: true });
  }

  function limpiarFiltros() {
    setParametros(orden === "nuevos" ? {} : { orden }, { replace: true });
  }

  const hayFiltros = q || categoria || tipo || minimo || maximo || soloConStock || filtrosOpcion.length > 0;
  const valorOpcion = (clave) => parametros.get(`${PREFIJO_OPCION}${clave}`) ?? "";

  return (
    <main className="catalogo">
      <div className="catalogo-encabezado">
        <h1>{categoriaElegida ? categoriaElegida.nombre : "Productos"}</h1>
        <button
          type="button"
          className="boton boton-secundario boton-filtros"
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          aria-expanded={filtrosAbiertos}
          aria-controls="filtros"
        >
          Filtros
        </button>
      </div>

      <div className="catalogo-cuerpo">
        <aside id="filtros" className={`filtros tarjeta ${filtrosAbiertos ? "abiertos" : ""}`} aria-label="Filtros">
          <div className="campo">
            <label htmlFor="filtro-busqueda">Buscar</label>
            <input
              id="filtro-busqueda"
              type="search"
              value={q}
              placeholder="Nombre o descripción"
              onChange={(e) => cambiar("q", e.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="filtro-categoria">Categoría</label>
            <select id="filtro-categoria" value={categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="filtro-tipo">Tipo</label>
            <select id="filtro-tipo" value={tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
              <option value="">Todos</option>
              <option value="fisico">Físicos (con envío)</option>
              <option value="digital">Digitales (descarga)</option>
            </select>
          </div>

          <fieldset className="filtro-precio">
            <legend>Precio</legend>
            <div className="filtro-precio-campos">
              <input
                type="number"
                min="0"
                placeholder="Mínimo"
                value={minimo}
                onChange={(e) => cambiar("min", e.target.value)}
                aria-label="Precio mínimo"
              />
              <input
                type="number"
                min="0"
                placeholder="Máximo"
                value={maximo}
                onChange={(e) => cambiar("max", e.target.value)}
                aria-label="Precio máximo"
              />
            </div>
          </fieldset>

          {opciones.map((opcion) => (
            <div key={opcion.clave} className="campo">
              <label htmlFor={`filtro-${opcion.clave}`}>{opcion.nombre}</label>
              <select
                id={`filtro-${opcion.clave}`}
                value={valorOpcion(opcion.clave)}
                onChange={(e) => cambiar(`${PREFIJO_OPCION}${opcion.clave}`, e.target.value)}
              >
                <option value="">Todos</option>
                {opcion.valores.map((valor) => (
                  <option key={valor} value={valor}>{valor}</option>
                ))}
              </select>
            </div>
          ))}

          <label className="filtro-check">
            <input type="checkbox" checked={soloConStock} onChange={(e) => cambiar("stock", e.target.checked ? "1" : "")} />
            Solo con stock
          </label>

          {hayFiltros && (
            <button type="button" className="boton-enlace" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </aside>

        <section className="catalogo-resultados" aria-labelledby="titulo-resultados">
          <div className="resultados-barra">
            <p id="titulo-resultados" role="status">
              {cargando ? "Cargando productos..." : `${resultados.length} ${resultados.length === 1 ? "producto" : "productos"}`}
            </p>
            <div className="campo campo-orden">
              <label htmlFor="orden">Ordenar por</label>
              <select id="orden" value={orden} onChange={(e) => cambiar("orden", e.target.value === "nuevos" ? "" : e.target.value)}>
                <option value="nuevos">Más nuevos</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="nombre">Nombre (A-Z)</option>
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="aviso aviso-error">
              No pudimos cargar los productos. Probá de nuevo en un rato.
            </p>
          )}

          {!cargando && !error && resultados.length === 0 && (
            <div className="sin-resultados">
              <p>No encontramos productos con esos filtros.</p>
              {hayFiltros && (
                <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          <ul className="grid-productos">
            {resultados.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default Catalogo;
