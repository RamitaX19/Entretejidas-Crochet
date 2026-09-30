import { useEffect, useState } from "react";
import { pedirApi } from "../api";
import AdminNav from "../components/AdminNav";

// Fecha local en formato AAAA-MM-DD (el del input de fecha): no se pueden elegir días pasados.
const HOY = new Date().toLocaleDateString("en-CA");

function formatearDia(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR");
}

function estadoCupon(cupon) {
  if (cupon.vencido) return { texto: "Vencido", clase: "etiqueta-neutra" };
  if (cupon.agotado) return { texto: "Agotado", clase: "etiqueta-alerta" };
  return { texto: "Activo", clase: "etiqueta-ok" };
}

function AdminCupones() {
  const [cupones, setCupones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [usosMaximos, setUsosMaximos] = useState("");
  const [vence, setVence] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    pedirApi("/api/cupones")
      .then((respuesta) => respuesta.json().then((datos) => ({ ok: respuesta.ok, datos })))
      .then(({ ok, datos }) => {
        if (ok) setCupones(datos);
        else setAviso({ tipo: "error", texto: datos.error });
      })
      .catch((err) => {
        console.error(err);
        setAviso({ tipo: "error", texto: "No se pudieron cargar los cupones. Probá de nuevo." });
      })
      .finally(() => setCargando(false));
  }, []);

  async function crearCupon(e) {
    e.preventDefault();
    setAviso(null);
    setGuardando(true);

    try {
      const respuesta = await pedirApi("/api/cupones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, porcentaje: Number(porcentaje), usosMaximos, vence }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setCupones((lista) => [datos, ...lista]);
      setAviso({ tipo: "ok", texto: `Cupón ${datos.codigo} creado.` });
      setCodigo("");
      setPorcentaje("");
      setUsosMaximos("");
      setVence("");
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(cupon) {
    setAviso(null);

    try {
      const respuesta = await pedirApi(`/api/cupones/${cupon.id}`, { method: "DELETE" });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        setAviso({ tipo: "error", texto: datos.error });
        return;
      }

      setCupones((lista) => lista.filter((c) => c.id !== cupon.id));
      setAviso({ tipo: "ok", texto: `Cupón ${cupon.codigo} eliminado.` });
    } catch (err) {
      console.error(err);
      setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Probá de nuevo." });
    } finally {
      setConfirmandoId(null);
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

      <form className="tarjeta formulario-admin" onSubmit={crearCupon}>
        <h2>Nuevo cupón</h2>

        <div className="campo">
          <label htmlFor="cupon-codigo">Código</label>
          <input
            id="cupon-codigo"
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ""))}
            maxLength={30}
            autoComplete="off"
            aria-describedby="ayuda-codigo"
            required
          />
          <p id="ayuda-codigo" className="nota">Por ejemplo INVIERNO10. Letras, números o guiones, sin espacios.</p>
        </div>

        <div className="campo">
          <label htmlFor="cupon-porcentaje">Descuento (%)</label>
          <input
            id="cupon-porcentaje"
            type="number"
            min="1"
            max="100"
            step="1"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="cupon-usos">Usos máximos</label>
          <input
            id="cupon-usos"
            type="number"
            min="1"
            step="1"
            value={usosMaximos}
            onChange={(e) => setUsosMaximos(e.target.value)}
            aria-describedby="ayuda-usos"
          />
          <p id="ayuda-usos" className="nota">Dejalo vacío para que no tenga límite.</p>
        </div>

        <div className="campo">
          <label htmlFor="cupon-vence">Vence</label>
          <input
            id="cupon-vence"
            type="date"
            min={HOY}
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            aria-describedby="ayuda-vence"
          />
          <p id="ayuda-vence" className="nota">Sirve hasta ese día inclusive. Dejalo vacío para que no venza.</p>
        </div>

        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? "Creando..." : "Crear cupón"}
        </button>
      </form>

      <section className="tarjeta">
        <div className="tabla-contenedor" role="region" aria-label="Lista de cupones" tabIndex={0}>
          <table>
            <caption>Cupones ({cupones.length})</caption>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col" className="num">Descuento</th>
                <th scope="col" className="num">Usos</th>
                <th scope="col">Vence</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={6} role="status">Cargando cupones...</td>
                </tr>
              )}

              {!cargando && cupones.length === 0 && (
                <tr>
                  <td colSpan={6}>Todavía no hay cupones. Creá el primero con el formulario de arriba.</td>
                </tr>
              )}

              {cupones.map((cupon) => {
                const estado = estadoCupon(cupon);

                return (
                  <tr key={cupon.id} className={confirmandoId === cupon.id ? "confirmando" : ""}>
                    <th scope="row">{cupon.codigo}</th>
                    <td className="num">{cupon.porcentaje}%</td>
                    <td className="num">
                      {cupon.usos} / {cupon.usosMaximos ?? "sin límite"}
                    </td>
                    <td>{cupon.vence ? formatearDia(cupon.vence) : "No vence"}</td>
                    <td>
                      <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>
                    </td>
                    <td>
                      {confirmandoId === cupon.id ? (
                        <div className="acciones-fila">
                          <span>¿Eliminar {cupon.codigo}?</span>
                          <button className="boton boton-peligro" onClick={() => eliminar(cupon)}>
                            Sí, eliminar
                          </button>
                          <button className="boton boton-secundario" onClick={() => setConfirmandoId(null)} autoFocus>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="boton-quitar"
                          onClick={() => setConfirmandoId(cupon.id)}
                          aria-label={`Eliminar el cupón ${cupon.codigo}`}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="nota">Si se cancela un pedido que usó un cupón, ese uso se devuelve.</p>
      </section>
    </main>
  );
}

export default AdminCupones;
