import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { leerJson, pedirApi } from "../api";
import AdminNav from "../components/AdminNav";
import { arbolDeCategorias } from "../categorias";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo.";

// Select "Dentro de": ninguna (categoría principal) o una de las principales.
function SelectUbicacion({ id, valor, onCambiar, principales, excluir }) {
  return (
    <select id={id} value={valor} onChange={(e) => onCambiar(e.target.value)}>
      <option value="">Ninguna: es una categoría principal</option>
      {principales
        .filter((categoria) => categoria.id !== excluir)
        .map((categoria) => (
          <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
        ))}
    </select>
  );
}

function AdminCategorias({ onCategoriasCambiadas }) {
  const [categorias, setCategorias] = useState([]);
  const [version, setVersion] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState({ nombre: "", padreId: "" });
  const [editando, setEditando] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/categorias`)
      .then(leerJson)
      .then((datos) => setCategorias(datos))
      .catch((err) => {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar las categorías. Probá de nuevo." });
      })
      .finally(() => setCargando(false));
  }, [version]);

  const arbol = arbolDeCategorias(categorias);

  async function pedirCambio(ruta, metodo, cuerpo) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(ruta, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return null;
      }

      // Se vuelve a leer la lista: así los totales y las subcategorías quedan siempre al día.
      setVersion((v) => v + 1);
      onCategoriasCambiadas();
      return datos;
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
      return null;
    }
  }

  function nombreDe(id) {
    return categorias.find((categoria) => categoria.id === Number(id))?.nombre;
  }

  async function crear(e) {
    e.preventDefault();
    const creada = await pedirCambio("/api/categorias", "POST", { nombre: nueva.nombre, padreId: nueva.padreId || null });

    if (creada) {
      setAviso({
        tipo: "ok",
        texto: creada.padreId
          ? `Subcategoría "${creada.nombre}" creada dentro de "${nombreDe(creada.padreId)}".`
          : `Categoría "${creada.nombre}" creada.`,
      });
      setNueva({ nombre: "", padreId: nueva.padreId });
    }
  }

  function empezarEdicion(categoria) {
    setAviso(null);
    setConfirmandoId(null);
    setEditando({ id: categoria.id, nombre: categoria.nombre, padreId: categoria.padreId ?? "" });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    const editada = await pedirCambio(`/api/categorias/${editando.id}`, "PUT", {
      nombre: editando.nombre,
      padreId: editando.padreId || null,
    });

    if (editada) {
      setEditando(null);
      setAviso({ tipo: "ok", texto: `Categoría "${editada.nombre}" guardada.` });
    }
  }

  async function eliminar(categoria) {
    const eliminada = await pedirCambio(`/api/categorias/${categoria.id}`, "DELETE");
    setConfirmandoId(null);

    if (eliminada) {
      setAviso({ tipo: "ok", texto: `Categoría "${categoria.nombre}" eliminada.` });
    }
  }

  function textoConfirmacion(categoria) {
    const subcategorias = categoria.subcategorias ?? [];
    const productos = categoria.productos + subcategorias.reduce((suma, sub) => suma + sub.productos, 0);
    const partes = [
      subcategorias.length > 0
        ? `¿Eliminar "${categoria.nombre}" y ${subcategorias.length === 1 ? "su subcategoría" : `sus ${subcategorias.length} subcategorías`}?`
        : `¿Eliminar "${categoria.nombre}"?`,
    ];
    if (productos > 0) partes.push(`${productos === 1 ? "Su producto queda" : `Sus ${productos} productos quedan`} sin categoría (no se borran).`);
    return partes.join(" ");
  }

  function fila(categoria, padre) {
    const enEdicion = editando?.id === categoria.id;
    const tieneSubcategorias = (categoria.subcategorias ?? []).length > 0;
    const enSubcategorias = (categoria.subcategorias ?? []).reduce((suma, sub) => suma + sub.productos, 0);

    return (
      <tr
        key={categoria.id}
        className={`${padre ? "fila-subcategoria" : ""} ${confirmandoId === categoria.id ? "confirmando" : ""}`}
      >
        <th scope="row">
          {enEdicion ? (
            <form className="edicion-categoria" onSubmit={guardarEdicion}>
              <label className="solo-lector" htmlFor={`editar-nombre-${categoria.id}`}>Nombre</label>
              <input
                id={`editar-nombre-${categoria.id}`}
                type="text"
                maxLength={60}
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                autoFocus
                required
              />
              {!tieneSubcategorias && (
                <>
                  <label className="solo-lector" htmlFor={`editar-ubicacion-${categoria.id}`}>Dentro de</label>
                  <SelectUbicacion
                    id={`editar-ubicacion-${categoria.id}`}
                    valor={editando.padreId}
                    onCambiar={(padreId) => setEditando({ ...editando, padreId })}
                    principales={arbol}
                    excluir={categoria.id}
                  />
                </>
              )}
              <div className="acciones-fila">
                <button type="submit" className="boton">Guardar</button>
                <button type="button" className="boton boton-secundario" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              {padre && (
                <>
                  <span className="marca-subcategoria" aria-hidden="true" />
                  <span className="solo-lector">Subcategoría de {padre.nombre}: </span>
                </>
              )}
              {categoria.nombre}
            </>
          )}
        </th>
        <td className="num">
          {categoria.productos}
          {enSubcategorias > 0 && <small className="detalle-cantidad">+{enSubcategorias} en subcategorías</small>}
        </td>
        <td>
          {confirmandoId === categoria.id ? (
            <div className="acciones-fila">
              <span>{textoConfirmacion(categoria)}</span>
              <button className="boton boton-peligro" onClick={() => eliminar(categoria)}>
                Sí, eliminar
              </button>
              <button className="boton boton-secundario" onClick={() => setConfirmandoId(null)} autoFocus>
                Cancelar
              </button>
            </div>
          ) : (
            !enEdicion && (
              <div className="acciones-fila">
                <button
                  className="boton boton-secundario"
                  onClick={() => empezarEdicion(categoria)}
                  aria-label={`Editar ${categoria.nombre}`}
                >
                  Editar
                </button>
                <button
                  className="boton-quitar"
                  onClick={() => {
                    setEditando(null);
                    setConfirmandoId(categoria.id);
                  }}
                  aria-label={`Eliminar ${categoria.nombre}`}
                >
                  Eliminar
                </button>
              </div>
            )
          )}
        </td>
      </tr>
    );
  }

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`aviso aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <form className="tarjeta formulario-admin" onSubmit={crear}>
        <h2>Nueva categoría</h2>
        <div className="campo">
          <label htmlFor="categoria-nueva">Nombre</label>
          <input
            id="categoria-nueva"
            type="text"
            maxLength={60}
            value={nueva.nombre}
            onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
            placeholder="Por ejemplo Hilos o Hilos gross"
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="categoria-ubicacion">Dentro de</label>
          <SelectUbicacion
            id="categoria-ubicacion"
            valor={nueva.padreId}
            onCambiar={(padreId) => setNueva({ ...nueva, padreId })}
            principales={arbol}
          />
          <p className="nota">Para crear una subcategoría (por ejemplo Hilos gross), elegí en qué categoría va.</p>
        </div>
        <button type="submit" className="boton">Crear categoría</button>
      </form>

      <section className="tarjeta">
        <div className="tabla-contenedor" role="region" aria-label="Lista de categorías" tabIndex={0}>
          <table>
            <caption>
              Categorías ({arbol.length}) y subcategorías ({categorias.length - arbol.length})
            </caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col" className="num">Productos</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={3} role="status">Cargando categorías...</td>
                </tr>
              )}

              {!cargando && categorias.length === 0 && (
                <tr>
                  <td colSpan={3}>Todavía no hay categorías. Creá la primera con el formulario de arriba.</td>
                </tr>
              )}

              {arbol.flatMap((categoria) => [fila(categoria, null), ...categoria.subcategorias.map((sub) => fila(sub, categoria))])}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminCategorias;
