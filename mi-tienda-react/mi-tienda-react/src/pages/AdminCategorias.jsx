import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { leerJson, pedirApi } from "../api";
import AdminNav from "../components/AdminNav";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Probá de nuevo.";

function AdminCategorias({ onCategoriasCambiadas }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
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
  }, []);

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

      onCategoriasCambiadas();
      return datos;
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: ERROR_CONEXION });
      return null;
    }
  }

  async function crear(e) {
    e.preventDefault();
    const creada = await pedirCambio("/api/categorias", "POST", { nombre: nueva });

    if (creada) {
      setCategorias((lista) => [...lista, creada].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setNueva("");
      setAviso({ tipo: "ok", texto: `Categoría "${creada.nombre}" creada.` });
    }
  }

  function empezarEdicion(categoria) {
    setAviso(null);
    setConfirmandoId(null);
    setEditandoId(categoria.id);
    setNombreEditado(categoria.nombre);
  }

  async function guardarEdicion(e, categoria) {
    e.preventDefault();
    const editada = await pedirCambio(`/api/categorias/${categoria.id}`, "PUT", { nombre: nombreEditado });

    if (editada) {
      setCategorias((lista) => lista.map((c) => (c.id === editada.id ? { ...c, nombre: editada.nombre } : c)));
      setEditandoId(null);
      setAviso({ tipo: "ok", texto: `Categoría renombrada a "${editada.nombre}".` });
    }
  }

  async function eliminar(categoria) {
    const eliminada = await pedirCambio(`/api/categorias/${categoria.id}`, "DELETE");
    setConfirmandoId(null);

    if (eliminada) {
      setCategorias((lista) => lista.filter((c) => c.id !== categoria.id));
      setAviso({ tipo: "ok", texto: `Categoría "${categoria.nombre}" eliminada.` });
    }
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
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Por ejemplo Hilos"
            required
          />
        </div>
        <button type="submit" className="boton">Crear categoría</button>
      </form>

      <section className="tarjeta">
        <div className="tabla-contenedor" role="region" aria-label="Lista de categorías" tabIndex={0}>
          <table>
            <caption>Categorías ({categorias.length})</caption>
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

              {categorias.map((categoria) => (
                <tr key={categoria.id} className={confirmandoId === categoria.id ? "confirmando" : ""}>
                  <th scope="row">
                    {editandoId === categoria.id ? (
                      <form className="edicion-fila" onSubmit={(e) => guardarEdicion(e, categoria)}>
                        <input
                          type="text"
                          maxLength={60}
                          value={nombreEditado}
                          onChange={(e) => setNombreEditado(e.target.value)}
                          aria-label={`Nuevo nombre para ${categoria.nombre}`}
                          autoFocus
                          required
                        />
                        <button type="submit" className="boton">Guardar</button>
                        <button type="button" className="boton boton-secundario" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      categoria.nombre
                    )}
                  </th>
                  <td className="num">{categoria.productos}</td>
                  <td>
                    {confirmandoId === categoria.id ? (
                      <div className="acciones-fila">
                        <span>
                          ¿Eliminar "{categoria.nombre}"?
                          {categoria.productos === 1 && " Su producto queda sin categoría (no se borra)."}
                          {categoria.productos > 1 && ` Sus ${categoria.productos} productos quedan sin categoría (no se borran).`}
                        </span>
                        <button className="boton boton-peligro" onClick={() => eliminar(categoria)}>
                          Sí, eliminar
                        </button>
                        <button className="boton boton-secundario" onClick={() => setConfirmandoId(null)} autoFocus>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      editandoId !== categoria.id && (
                        <div className="acciones-fila">
                          <button
                            className="boton boton-secundario"
                            onClick={() => empezarEdicion(categoria)}
                            aria-label={`Renombrar ${categoria.nombre}`}
                          >
                            Renombrar
                          </button>
                          <button
                            className="boton-quitar"
                            onClick={() => {
                              setEditandoId(null);
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminCategorias;
