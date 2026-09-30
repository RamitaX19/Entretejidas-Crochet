import { useEffect, useState } from "react";
import { pedirApi } from "../api";
import AdminNav from "../components/AdminNav";

const PERIODOS = [
  { clave: "hoy", nombre: "Hoy" },
  { clave: "semana", nombre: "Últimos 7 días" },
  { clave: "mes", nombre: "Últimos 30 días" },
];

// Con qué se compara cada período: la misma duración, cortada a la misma hora que ahora.
const COMPARACION = {
  hoy: "ayer a esta hora",
  semana: "los 7 días anteriores",
  mes: "los 30 días anteriores",
};

function plural(cantidad, singular, varios) {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

function formatearPesos(valor) {
  return `$${valor.toLocaleString("es-AR")}`;
}

function formatearCantidad(valor) {
  return valor.toLocaleString("es-AR");
}

function Variacion({ actual, anterior, periodo, formatear }) {
  const contra = COMPARACION[periodo];

  if (anterior === 0) {
    return (
      <span className="variacion">
        {actual === 0 ? `Igual que ${contra}` : `${contra[0].toUpperCase()}${contra.slice(1)}: ${formatear(0)}`}
      </span>
    );
  }

  const cambio = Math.round(((actual - anterior) / anterior) * 100);

  if (cambio === 0) {
    return (
      <span className="variacion">
        Igual que {contra} ({formatear(anterior)})
      </span>
    );
  }

  const sube = cambio > 0;

  return (
    <span className={`variacion ${sube ? "variacion-sube" : "variacion-baja"}`}>
      <span aria-hidden="true">{sube ? "▲" : "▼"} </span>
      <span className="solo-lector">{sube ? "Subió" : "Bajó"} </span>
      {Math.abs(cambio)}% vs. {contra} ({formatear(anterior)})
    </span>
  );
}

function AdminDashboard() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    pedirApi("/api/dashboard")
      .then((respuesta) => respuesta.json().then((cuerpo) => ({ ok: respuesta.ok, cuerpo })))
      .then(({ ok, cuerpo }) => {
        if (ok) setDatos(cuerpo);
        else setError(cuerpo.error);
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar el resumen. Probá de nuevo.");
      });
  }, []);

  const maximoUnidades = datos ? Math.max(1, ...datos.masVendidos.map((p) => p.unidades)) : 1;

  return (
    <main className="admin">
      <h1>Panel de administrador</h1>
      <AdminNav />

      {error && <p role="alert" className="aviso aviso-error">{error}</p>}
      {!datos && !error && <p role="status">Cargando resumen...</p>}

      {datos && (
        <>
          <section aria-labelledby="titulo-ventas">
            <h2 id="titulo-ventas">Ventas</h2>
            <p className="nota">
              Lo cobrado en pedidos pagados, enviados o entregados, según la fecha del pedido. Cada tarjeta se compara
              con el período anterior de igual duración, hasta la misma hora.
            </p>
            <ul className="indicadores">
              {PERIODOS.map(({ clave, nombre }) => {
                const periodo = datos.periodos[clave];

                return (
                  <li key={clave} className="indicador">
                    <span className="indicador-etiqueta">{nombre}</span>
                    <span className="indicador-valor">{formatearPesos(periodo.ventas)}</span>
                    <Variacion
                      actual={periodo.ventas}
                      anterior={periodo.ventasAnterior}
                      periodo={clave}
                      formatear={formatearPesos}
                    />
                    <span className="indicador-detalle">
                      {plural(periodo.pagados, "pedido cobrado", "pedidos cobrados")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="titulo-pedidos">
            <h2 id="titulo-pedidos">Pedidos</h2>
            <p className="nota">Todos los pedidos hechos en cada período, con su estado actual.</p>
            <ul className="indicadores">
              {PERIODOS.map(({ clave, nombre }) => {
                const periodo = datos.periodos[clave];

                return (
                  <li key={clave} className="indicador">
                    <span className="indicador-etiqueta">{nombre}</span>
                    <span className="indicador-valor">{formatearCantidad(periodo.pedidos)}</span>
                    <Variacion
                      actual={periodo.pedidos}
                      anterior={periodo.pedidosAnterior}
                      periodo={clave}
                      formatear={formatearCantidad}
                    />
                    <span className="indicador-detalle">
                      {plural(periodo.pagados, "pagado", "pagados")} ·{" "}
                      {plural(periodo.pendientes, "pendiente", "pendientes")} ·{" "}
                      {plural(periodo.cancelados, "cancelado", "cancelados")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="tarjeta" aria-labelledby="titulo-mas-vendidos">
            <h2 id="titulo-mas-vendidos">Productos más vendidos</h2>
            <p className="nota">Últimos 30 días, por unidades vendidas en pedidos cobrados. Montos sin descuentos de cupones.</p>

            {datos.masVendidos.length === 0 ? (
              <p>Todavía no hay ventas cobradas en los últimos 30 días.</p>
            ) : (
              <div className="tabla-contenedor" role="region" aria-label="Productos más vendidos" tabIndex={0}>
                <table className="tabla-ranking">
                  <thead>
                    <tr>
                      <th scope="col" className="num">#</th>
                      <th scope="col">Producto</th>
                      <th scope="col">Unidades</th>
                      <th scope="col" className="num">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.masVendidos.map((producto, i) => (
                      <tr key={producto.id}>
                        <td className="num">{i + 1}</td>
                        <th scope="row">
                          {producto.nombre}
                          {producto.tipo === "digital" && <span className="nota"> (digital)</span>}
                        </th>
                        <td>
                          <div className="barra-celda">
                            <span
                              className="barra"
                              style={{ width: `calc((100% - 3rem) * ${producto.unidades / maximoUnidades})` }}
                              aria-hidden="true"
                            />
                            <span className="barra-valor">{producto.unidades}</span>
                          </div>
                        </td>
                        <td className="num">${producto.ingresos.toLocaleString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default AdminDashboard;
