import { Link } from "react-router-dom";
import PaginaLegal from "../components/PaginaLegal";
import { TIENDA } from "../tienda";

function Devoluciones() {
  return (
    <PaginaLegal titulo="Cambios y devoluciones">
      <h2>Derecho de arrepentimiento</h2>
      <p>
        Como compraste a distancia, la Ley 24.240 de Defensa del Consumidor (artículo 34) y el Código Civil y Comercial
        te dan <strong>10 días corridos</strong> para arrepentirte, contados desde la compra o desde que recibís el
        producto (lo último que pase). No tenés que explicar el motivo y no tiene costo para vos: los gastos de
        devolución corren por nuestra cuenta.
      </p>
      <p>
        Para pedirlo, usá el <Link to="/arrepentimiento">Botón de arrepentimiento</Link>: te damos un número de
        solicitud y te escribimos para coordinar la devolución. El producto tiene que volver en el mismo estado en que
        lo recibiste. Te devolvemos el dinero por el mismo medio de pago que usaste.
      </p>

      <h2>Cuándo no aplica</h2>
      <p>Según el Código Civil y Comercial (artículo 1116), el arrepentimiento no aplica a:</p>
      <ul>
        <li>Productos hechos a pedido o personalizados según tus indicaciones.</li>
        <li>Archivos digitales que se pueden descargar de inmediato (patrones, moldes, libros electrónicos).</li>
      </ul>

      <h2>Cambios de talle o color</h2>
      <p>
        Si querés cambiar un producto por otro talle o color, escribinos dentro de los 30 días de recibido. El producto
        tiene que estar sin uso y con su empaque. Coordinamos con vos el envío del cambio.
      </p>

      <h2>Productos fallados o equivocados</h2>
      <p>
        Si recibiste un producto fallado o distinto al que pediste, escribinos a {TIENDA.email}: te lo cambiamos o te
        devolvemos el dinero, sin costo para vos.
      </p>
    </PaginaLegal>
  );
}

export default Devoluciones;
