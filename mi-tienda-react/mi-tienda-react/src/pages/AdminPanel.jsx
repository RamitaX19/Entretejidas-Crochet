import { useState, useRef } from "react";
import { API_URL } from "../config";
import { pedirApi } from "../api";
import ProductoImagen from "../components/ProductoImagen";
import AdminNav from "../components/AdminNav";
import EditorVariantes from "../components/EditorVariantes";
import { COMBINACION_NUEVA, claveCombinacion, combinar, limpiarOpciones, nuevaOpcion, tieneVariantes } from "../variantes";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 5 * 1024 * 1024;
const MAX_IMAGENES = 8;
const EXTENSIONES_DIGITALES = ["pdf", "zip"];
const TAMANO_MAXIMO_DIGITAL = 25 * 1024 * 1024;

function AdminPanel({ productos, setProductos, categorias }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState("fisico");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [datosCombinacion, setDatosCombinacion] = useState({});
  const [archivos, setArchivos] = useState([]);
  const [vistasPrevias, setVistasPrevias] = useState([]);
  const [archivoDigital, setArchivoDigital] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const campoNombre = useRef(null);
  const campoArchivos = useRef(null);
  const campoArchivoDigital = useRef(null);

  const productoEditando = productos.find((p) => p.id === editandoId);
  const fotosActuales = productoEditando ? productoEditando.imagenes : [];
  const opcionesLimpias = tipo === "fisico" ? limpiarOpciones(opciones) : [];
  const conVariantes = opcionesLimpias.length > 0;

  function reemplazarProducto(actualizado) {
    setProductos((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)));
  }

  function quitarArchivos() {
    vistasPrevias.forEach((url) => URL.revokeObjectURL(url));
    setArchivos([]);
    setVistasPrevias([]);
    if (campoArchivos.current) campoArchivos.current.value = "";
  }

  function descartarArchivoDigital() {
    setArchivoDigital(null);
    if (campoArchivoDigital.current) campoArchivoDigital.current.value = "";
  }

  function limpiarFormulario() {
    setNombre("");
    setPrecio("");
    setTipo("fisico");
    setDescripcion("");
    setStock("");
    setCategoriaId("");
    setOpciones([]);
    setDatosCombinacion({});
    setEditandoId(null);
    quitarArchivos();
    descartarArchivoDigital();
  }

  // Las combinaciones marcadas para vender, con su precio y stock (vacío: el del producto / sin límite).
  function variantesParaGuardar() {
    return combinar(opcionesLimpias)
      .map((valores) => ({ valores, datos: datosCombinacion[claveCombinacion(opcionesLimpias, valores)] ?? COMBINACION_NUEVA }))
      .filter(({ datos }) => datos.incluida)
      .map(({ valores, datos }) => ({
        valores,
        precio: datos.precio === "" ? null : Number(datos.precio),
        stock: datos.stock === "" ? null : Number(datos.stock),
      }));
  }

  function elegirArchivos(e) {
    const elegidos = Array.from(e.target.files);
    if (elegidos.length === 0) return;

    const invalido = elegidos.find(
      (archivo) => !TIPOS_IMAGEN.includes(archivo.type) || archivo.size > TAMANO_MAXIMO
    );

    if (invalido) {
      setAviso({
        tipo: "error",
        texto: `"${invalido.name}" no se puede usar: tiene que ser JPG, PNG o WEBP de hasta 5 MB.`,
      });
      quitarArchivos();
      return;
    }

    if (fotosActuales.length + elegidos.length > MAX_IMAGENES) {
      setAviso({
        tipo: "error",
        texto: `Cada producto puede tener hasta ${MAX_IMAGENES} fotos. Ya tiene ${fotosActuales.length}.`,
      });
      quitarArchivos();
      return;
    }

    vistasPrevias.forEach((url) => URL.revokeObjectURL(url));
    setAviso(null);
    setArchivos(elegidos);
    setVistasPrevias(elegidos.map((archivo) => URL.createObjectURL(archivo)));
  }

  function elegirArchivoDigital(e) {
    const elegido = e.target.files[0];
    if (!elegido) return;

    const extension = elegido.name.split(".").pop().toLowerCase();

    if (!EXTENSIONES_DIGITALES.includes(extension) || elegido.size > TAMANO_MAXIMO_DIGITAL) {
      setAviso({
        tipo: "error",
        texto: `"${elegido.name}" no se puede usar: tiene que ser PDF o ZIP de hasta 25 MB.`,
      });
      descartarArchivoDigital();
      return;
    }

    setAviso(null);
    setArchivoDigital(elegido);
  }

  async function subirImagenes(idProducto) {
    const formData = new FormData();
    archivos.forEach((archivo) => formData.append("imagenes", archivo));

    const respuesta = await pedirApi(`/api/productos/${idProducto}/imagenes`, {
      method: "POST",
      body: formData,
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error);
    return datos;
  }

  async function subirArchivoDigital(idProducto) {
    const formData = new FormData();
    formData.append("archivo", archivoDigital);

    const respuesta = await pedirApi(`/api/productos/${idProducto}/archivo`, {
      method: "POST",
      body: formData,
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error);
    return datos;
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setAviso(null);
    setGuardando(true);

    const esEdicion = editandoId !== null;
    const ruta = esEdicion ? `/api/productos/${editandoId}` : "/api/productos";

    try {
      const respuesta = await pedirApi(ruta, {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          precio: Number(precio),
          tipo,
          descripcion,
          categoriaId: categoriaId === "" ? null : Number(categoriaId),
          stock: tipo === "fisico" && !conVariantes && stock !== "" ? Number(stock) : null,
          opciones: opcionesLimpias,
          variantes: conVariantes ? variantesParaGuardar() : [],
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      let productoGuardado = datos;
      const erroresSubida = [];

      if (archivos.length > 0) {
        try {
          productoGuardado = await subirImagenes(datos.id);
        } catch (err) {
          erroresSubida.push(`las fotos no se pudieron subir: ${err.message || "error de conexión"}`);
        }
      }

      if (tipo === "digital" && archivoDigital) {
        try {
          productoGuardado = await subirArchivoDigital(datos.id);
        } catch (err) {
          erroresSubida.push(`el archivo no se pudo subir: ${err.message || "error de conexión"}`);
        }
      }

      if (esEdicion) {
        reemplazarProducto(productoGuardado);
      } else {
        setProductos((lista) => [...lista, productoGuardado]);
      }

      if (erroresSubida.length > 0) {
        setAviso({ tipo: "error", texto: `El producto se guardó, pero ${erroresSubida.join(" y ")}` });
      } else {
        setAviso({ tipo: "ok", texto: esEdicion ? "Cambios guardados." : "Producto creado." });
      }

      limpiarFormulario();
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  async function accionFoto(ruta, metodo, mensajeOk) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(ruta, { method: metodo });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      reemplazarProducto(datos);
      setAviso({ tipo: "ok", texto: mensajeOk });
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    }
  }

  function eliminarFoto(idFoto) {
    accionFoto(`/api/imagenes/${idFoto}`, "DELETE", "Foto eliminada.");
  }

  function usarComoPortada(idFoto) {
    accionFoto(`/api/imagenes/${idFoto}/portada`, "PUT", "Portada actualizada.");
  }

  function quitarArchivoGuardado() {
    accionFoto(`/api/productos/${editandoId}/archivo`, "DELETE", "Archivo quitado.");
  }

  function editar(producto) {
    setAviso(null);
    setConfirmandoId(null);
    quitarArchivos();
    descartarArchivoDigital();
    setEditandoId(producto.id);
    setNombre(producto.nombre);
    setPrecio(producto.precio);
    setTipo(producto.tipo);
    setDescripcion(producto.descripcion || "");
    setStock(producto.stock ?? "");
    setCategoriaId(producto.categoriaId === null ? "" : String(producto.categoriaId));

    const opcionesGuardadas = producto.opciones ?? [];
    setOpciones(opcionesGuardadas.map((o) => nuevaOpcion(o.nombre, o.valores.join(", "))));

    // Las combinaciones que no se guardaron como variantes estaban apagadas.
    const datos = {};
    for (const valores of combinar(opcionesGuardadas)) {
      datos[claveCombinacion(opcionesGuardadas, valores)] = { ...COMBINACION_NUEVA, incluida: false };
    }
    for (const variante of producto.variantes ?? []) {
      datos[claveCombinacion(opcionesGuardadas, variante.valores)] = {
        precio: variante.precio ?? "",
        stock: variante.stock ?? "",
        incluida: true,
      };
    }
    setDatosCombinacion(datos);
    campoNombre.current.focus();
  }

  async function eliminar(id) {
    try {
      const respuesta = await pedirApi(`/api/productos/${id}`, { method: "DELETE" });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setAviso({ tipo: "error", texto: datos.error });
        setConfirmandoId(null);
        return;
      }

      setProductos((lista) => lista.filter((p) => p.id !== id));
      if (editandoId === id) limpiarFormulario();
      setConfirmandoId(null);
      setAviso({ tipo: "ok", texto: "Producto eliminado." });
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    }
  }

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {aviso && (
        <p
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`aviso aviso-${aviso.tipo}`}
        >
          {aviso.texto}
        </p>
      )}

      <form className="tarjeta formulario-admin formulario-producto" onSubmit={manejarSubmit}>
        <h2>{editandoId ? "Editar producto" : "Nuevo producto"}</h2>

        <div className="campo">
          <label htmlFor="prod-nombre">Nombre</label>
          <input
            id="prod-nombre"
            ref={campoNombre}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="prod-precio">Precio (en pesos)</label>
          <input
            id="prod-precio"
            type="number"
            min="1"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="prod-tipo">Tipo</label>
          <select id="prod-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="fisico">Físico (se envía)</option>
            <option value="digital">Digital (se descarga)</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="prod-categoria">Categoría</label>
          <select id="prod-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </div>

        {tipo === "fisico" && (
          <EditorVariantes
            opciones={opciones}
            onCambiarOpciones={setOpciones}
            datosCombinacion={datosCombinacion}
            onCambiarDatos={setDatosCombinacion}
            precioBase={precio}
          />
        )}

        {tipo === "fisico" && !conVariantes && (
          <div className="campo">
            <label htmlFor="prod-stock">Stock (unidades disponibles)</label>
            <input
              id="prod-stock"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              aria-describedby="ayuda-stock"
            />
            <p id="ayuda-stock" className="nota">
              Dejalo vacío si no llevás la cuenta, por ejemplo si lo tejés a pedido.
            </p>
          </div>
        )}

        {tipo === "digital" && (
          <div className="campo">
            {productoEditando?.archivoNombre && (
              <p className="archivo-actual">
                Archivo actual: <strong>{productoEditando.archivoNombre}</strong>{" "}
                <button
                  type="button"
                  className="boton-enlace boton-enlace-peligro"
                  onClick={quitarArchivoGuardado}
                  aria-label={`Quitar el archivo ${productoEditando.archivoNombre}`}
                >
                  Quitar
                </button>
              </p>
            )}
            <label htmlFor="prod-archivo">
              {productoEditando?.archivoNombre ? "Reemplazar archivo" : "Archivo para descargar"} (PDF o ZIP, hasta
              25 MB)
            </label>
            <input
              id="prod-archivo"
              ref={campoArchivoDigital}
              type="file"
              accept=".pdf,.zip"
              onChange={elegirArchivoDigital}
            />
          </div>
        )}

        <div className="campo">
          <label htmlFor="prod-descripcion">Descripción</label>
          <textarea
            id="prod-descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        {fotosActuales.length > 0 && (
          <div className="campo">
            <h3>Fotos actuales</h3>
            <ul className="fotos-admin">
              {fotosActuales.map((foto, i) => (
                <li key={foto.id} className="foto-admin">
                  <img src={`${API_URL}${foto.ruta}`} alt={`Foto ${i + 1}`} />
                  {i === 0 ? (
                    <span className="foto-portada">Portada</span>
                  ) : (
                    <button type="button" className="boton-enlace" onClick={() => usarComoPortada(foto.id)}>
                      Usar de portada
                    </button>
                  )}
                  <button
                    type="button"
                    className="boton-enlace boton-enlace-peligro"
                    onClick={() => eliminarFoto(foto.id)}
                    aria-label={`Eliminar foto ${i + 1}`}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="campo">
          <label htmlFor="prod-imagenes">
            Agregar fotos (JPG, PNG o WEBP, hasta 5 MB cada una, máximo {MAX_IMAGENES} por producto)
          </label>
          <input
            id="prod-imagenes"
            ref={campoArchivos}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={elegirArchivos}
          />
        </div>

        {vistasPrevias.length > 0 && (
          <div className="campo">
            <h3>Fotos nuevas para subir</h3>
            <ul className="fotos-admin">
              {vistasPrevias.map((url, i) => (
                <li key={url} className="foto-admin">
                  <img src={url} alt={`Foto nueva ${i + 1}`} />
                </li>
              ))}
            </ul>
            <button type="button" className="boton-enlace" onClick={quitarArchivos}>
              Quitar fotos elegidas
            </button>
          </div>
        )}

        <div className="acciones-form">
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear producto"}
          </button>
          {editandoId && (
            <button type="button" className="boton boton-secundario" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <section className="tarjeta">
        <div className="tabla-contenedor" role="region" aria-label="Lista de productos" tabIndex={0}>
          <table>
            <caption>Productos ({productos.length})</caption>
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="num">Precio</th>
                <th scope="col" className="num">Stock</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 && (
                <tr>
                  <td colSpan={7}>Todavía no hay productos. Creá el primero con el formulario de arriba.</td>
                </tr>
              )}

              {productos.map((producto) => (
                <tr key={producto.id} className={confirmandoId === producto.id ? "confirmando" : ""}>
                  <td>
                    <ProductoImagen imagen={producto.imagenes[0]?.ruta} className="miniatura" />
                  </td>
                  <th scope="row">{producto.nombre}</th>
                  <td>{producto.categoria ?? "—"}</td>
                  <td>
                    {producto.tipo === "digital"
                      ? producto.archivoNombre ? "Digital" : "Digital (sin archivo)"
                      : "Físico"}
                  </td>
                  <td className="num">${producto.precio.toLocaleString("es-AR")}</td>
                  <td className="num">
                    {producto.tipo === "digital"
                      ? "—"
                      : tieneVariantes(producto)
                        ? `${producto.variantes.length} variantes`
                        : (producto.stock ?? "Sin límite")}
                  </td>
                  <td>
                    {confirmandoId === producto.id ? (
                      <div className="acciones-fila">
                        <span>¿Eliminar {producto.nombre}?</span>
                        <button className="boton boton-peligro" onClick={() => eliminar(producto.id)}>
                          Sí, eliminar
                        </button>
                        <button
                          className="boton boton-secundario"
                          onClick={() => setConfirmandoId(null)}
                          autoFocus
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="acciones-fila">
                        <button
                          className="boton boton-secundario"
                          onClick={() => editar(producto)}
                          aria-label={`Editar: ${producto.nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          className="boton-quitar"
                          onClick={() => setConfirmandoId(producto.id)}
                          aria-label={`Eliminar: ${producto.nombre}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminPanel;