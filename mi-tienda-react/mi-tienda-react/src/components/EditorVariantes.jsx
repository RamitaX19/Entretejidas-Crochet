import { COMBINACION_NUEVA, claveCombinacion, combinar, limpiarOpciones, nuevaOpcion } from "../variantes";

const MAX_OPCIONES = 3;
const MAX_COMBINACIONES = 100;

function EditorVariantes({ opciones, onCambiarOpciones, datosCombinacion, onCambiarDatos, precioBase }) {
  const limpias = limpiarOpciones(opciones);
  const combinaciones = limpias.length > 0 ? combinar(limpias) : [];
  const datosDe = (valores) => datosCombinacion[claveCombinacion(limpias, valores)] ?? COMBINACION_NUEVA;
  const incluidas = combinaciones.filter((valores) => datosDe(valores).incluida).length;

  function cambiarOpcion(id, campo, valor) {
    onCambiarOpciones(opciones.map((opcion) => (opcion.id === id ? { ...opcion, [campo]: valor } : opcion)));
  }

  function agregarOpcion() {
    onCambiarOpciones([...opciones, nuevaOpcion()]);
  }

  function quitarOpcion(id) {
    onCambiarOpciones(opciones.filter((opcion) => opcion.id !== id));
  }

  function cambiarDato(valores, campo, valor) {
    const clave = claveCombinacion(limpias, valores);
    onCambiarDatos({ ...datosCombinacion, [clave]: { ...datosDe(valores), [campo]: valor } });
  }

  return (
    <fieldset className="editor-variantes">
      <legend>Variantes (opcional)</legend>
      <p className="nota">
        Por ejemplo, Color: Rojo, Azul y Talle: S, M, L. Cada combinación puede tener su precio y su stock.
      </p>

      {opciones.map((opcion, i) => (
        <div key={opcion.id} className="opcion-fila">
          <div className="campo">
            <label htmlFor={`opcion-nombre-${opcion.id}`}>Opción {i + 1}</label>
            <input
              id={`opcion-nombre-${opcion.id}`}
              type="text"
              maxLength={30}
              placeholder="Color"
              value={opcion.nombre}
              onChange={(e) => cambiarOpcion(opcion.id, "nombre", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor={`opcion-valores-${opcion.id}`}>Valores, separados por coma</label>
            <input
              id={`opcion-valores-${opcion.id}`}
              type="text"
              placeholder="Rojo, Azul, Verde"
              value={opcion.valoresTexto}
              onChange={(e) => cambiarOpcion(opcion.id, "valoresTexto", e.target.value)}
            />
          </div>
          <button
            type="button"
            className="boton-enlace boton-enlace-peligro"
            onClick={() => quitarOpcion(opcion.id)}
            aria-label={`Quitar la opción ${opcion.nombre || i + 1}`}
          >
            Quitar
          </button>
        </div>
      ))}

      {opciones.length < MAX_OPCIONES && (
        <button type="button" className="boton boton-secundario" onClick={agregarOpcion}>
          + Agregar opción
        </button>
      )}

      {combinaciones.length > MAX_COMBINACIONES && (
        <p role="alert" className="mensaje-error">
          Son {combinaciones.length} combinaciones y el máximo es {MAX_COMBINACIONES}. Quitá algunos valores.
        </p>
      )}

      {combinaciones.length > 0 && combinaciones.length <= MAX_COMBINACIONES && (
        <>
          {/* Fuera de la tabla: en el celular la tabla se desplaza de costado y el título quedaría cortado. */}
          <p id="titulo-combinaciones" className="combinaciones-titulo">
            Combinaciones ({incluidas} de {combinaciones.length} a la venta)
          </p>
          <div className="tabla-contenedor" role="region" aria-labelledby="titulo-combinaciones" tabIndex={0}>
            <table className="tabla-combinaciones" aria-labelledby="titulo-combinaciones">
              <thead>
                <tr>
                  <th scope="col">Vender</th>
                  <th scope="col">Combinación</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Stock</th>
                </tr>
              </thead>
              <tbody>
                {combinaciones.map((valores) => {
                  const datos = datosDe(valores);
                  const etiqueta = limpias.map((opcion) => valores[opcion.nombre]).join(" / ");

                  return (
                    <tr key={claveCombinacion(limpias, valores)} className={datos.incluida ? "" : "combinacion-apagada"}>
                      <td>
                        <input
                          type="checkbox"
                          checked={datos.incluida}
                          onChange={(e) => cambiarDato(valores, "incluida", e.target.checked)}
                          aria-label={`Vender ${etiqueta}`}
                        />
                      </td>
                      <th scope="row">{etiqueta}</th>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder={precioBase ? `$${precioBase}` : "Precio"}
                          value={datos.precio}
                          onChange={(e) => cambiarDato(valores, "precio", e.target.value)}
                          disabled={!datos.incluida}
                          aria-label={`Precio de ${etiqueta}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Sin límite"
                          value={datos.stock}
                          onChange={(e) => cambiarDato(valores, "stock", e.target.value)}
                          disabled={!datos.incluida}
                          aria-label={`Stock de ${etiqueta}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="nota">Precio vacío: usa el precio del producto. Stock vacío: sin límite.</p>
        </>
      )}
    </fieldset>
  );
}

export default EditorVariantes;
