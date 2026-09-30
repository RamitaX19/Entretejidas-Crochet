import { Link } from "react-router-dom";
import FormularioMensaje from "../components/FormularioMensaje";
import { TIENDA } from "../tienda";

function Arrepentimiento({ usuario }) {
  return (
    <main className="pagina">
      <h1>Botón de arrepentimiento</h1>
      <p>
        Si compraste en {TIENDA.nombre}, tenés <strong>10 días corridos</strong> para arrepentirte de tu compra, contados
        desde que la hiciste o desde que recibiste el producto (lo último que pase), sin tener que explicar el motivo.
      </p>
      <p>
        Completá el formulario con el número de pedido. Al enviarlo te damos un número de solicitud y te escribimos para
        coordinar la devolución. Tenés más información en <Link to="/devoluciones">Cambios y devoluciones</Link>.
      </p>

      <section className="tarjeta formulario-angosto" aria-label="Formulario de arrepentimiento">
        <FormularioMensaje tipo="arrepentimiento" usuario={usuario} />
      </section>
    </main>
  );
}

export default Arrepentimiento;
