import { Link } from "react-router-dom";
import PaginaLegal from "../components/PaginaLegal";
import { TIENDA } from "../tienda";

function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones">
      <h2>1. Aceptación</h2>
      <p>
        Al navegar y comprar en {TIENDA.nombre} aceptás estos términos y condiciones. Si no estás de acuerdo con ellos,
        te pedimos que no uses la tienda.
      </p>

      <h2>2. Quiénes somos</h2>
      <p>
        La tienda es operada por {TIENDA.razonSocial}, CUIT {TIENDA.cuit}, con domicilio en {TIENDA.ubicacion}. Podés
        escribirnos a {TIENDA.email} o llamarnos al {TIENDA.telefono}.
      </p>

      <h2>3. Tu cuenta</h2>
      <p>
        Para comprar necesitás crear una cuenta con datos verdaderos. Sos responsable de cuidar tu contraseña y de lo
        que se haga con tu cuenta.
      </p>

      <h2>4. Productos y precios</h2>
      <p>
        Los precios están expresados en pesos argentinos y son precios finales. Las fotos son ilustrativas: como muchos
        productos son artesanales, puede haber pequeñas diferencias de color o de terminación. El stock es limitado y
        se reserva cuando confirmás el pedido.
      </p>

      <h2>5. Compras y pagos</h2>
      <p>
        Podés pagar por transferencia bancaria o con Mercado Pago. El pedido queda confirmado cuando se acredita el
        pago. Si el pago no se acredita, podemos cancelar el pedido y liberar el stock reservado.
      </p>

      <h2>6. Envíos y retiro</h2>
      <p>
        El envío a domicilio es por Correo Argentino: clásico (de 2 a 5 días hábiles) o express (de 1 a 3 días hábiles).
        El costo depende de la provincia de destino, se muestra antes de confirmar la compra y se suma al total. También
        podés retirar tu pedido en persona, coordinando el día y el lugar.
      </p>

      <h2>7. Productos digitales</h2>
      <p>
        Los archivos digitales (patrones, moldes, libros electrónicos) se descargan desde "Mis pedidos" una vez
        acreditado el pago. Son para uso personal: no está permitido revenderlos, compartirlos ni publicarlos.
      </p>

      <h2>8. Cupones de descuento</h2>
      <p>
        Cada cupón tiene el porcentaje, la cantidad de usos y la fecha de vencimiento que se indiquen. Se puede usar un
        cupón por compra y no se puede cambiar por dinero.
      </p>

      <h2>9. Cambios, devoluciones y arrepentimiento</h2>
      <p>
        Las condiciones están en <Link to="/devoluciones">Cambios y devoluciones</Link>. Para arrepentirte de una compra
        podés usar el <Link to="/arrepentimiento">Botón de arrepentimiento</Link>.
      </p>

      <h2>10. Propiedad intelectual</h2>
      <p>
        Los textos, fotos, diseños y patrones de la tienda pertenecen a {TIENDA.nombre} o a sus autores y no se pueden
        usar sin autorización.
      </p>

      <h2>11. Responsabilidad</h2>
      <p>
        Hacemos lo posible para que la información sea correcta y la tienda funcione sin interrupciones, pero puede
        haber errores o pausas por mantenimiento.
      </p>

      <h2>12. Cambios en estos términos</h2>
      <p>Podemos actualizar estos términos. La versión vigente es la publicada en esta página.</p>

      <h2>13. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del
        Consumidor. Si tenés un reclamo, podés hacerlo ante la autoridad de Defensa del Consumidor de tu jurisdicción.
      </p>
    </PaginaLegal>
  );
}

export default Terminos;
