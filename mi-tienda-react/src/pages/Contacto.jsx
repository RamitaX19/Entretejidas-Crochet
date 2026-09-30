import FormularioMensaje from "../components/FormularioMensaje";
import { TIENDA } from "../tienda";

function Contacto({ usuario }) {
  return (
    <main className="pagina">
      <h1>Contacto</h1>
      <p>¿Tenés una consulta sobre un producto, un pedido o un encargo? Escribinos y te respondemos por email.</p>

      <div className="contacto-cuerpo">
        <section className="tarjeta" aria-label="Formulario de contacto">
          <FormularioMensaje tipo="contacto" usuario={usuario} />
        </section>

        <aside className="tarjeta contacto-datos" aria-labelledby="titulo-otros-medios">
          <h2 id="titulo-otros-medios">Otros medios</h2>
          <ul>
            <li><strong>Teléfono:</strong> {TIENDA.telefono}</li>
            <li><strong>Email:</strong> {TIENDA.email}</li>
            <li><strong>Ubicación:</strong> {TIENDA.ubicacion}</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

export default Contacto;
