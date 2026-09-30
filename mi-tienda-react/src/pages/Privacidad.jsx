import PaginaLegal from "../components/PaginaLegal";
import { TIENDA } from "../tienda";

function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>
        En {TIENDA.nombre} cuidamos tus datos personales según la Ley 25.326 de Protección de los Datos Personales. El
        responsable de los datos es {TIENDA.razonSocial}, con domicilio en {TIENDA.ubicacion}.
      </p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>De tu cuenta: nombre, email y contraseña (la guardamos cifrada, nadie puede leerla).</li>
        <li>De tus pedidos: productos, montos, estado y medio de pago elegido.</li>
        <li>Para la entrega: nombre de quien recibe, teléfono y dirección.</li>
        <li>De los formularios de contacto y de arrepentimiento: los datos y el mensaje que nos mandes.</li>
      </ul>
      <p>
        Los datos de tu tarjeta los procesa Mercado Pago directamente: nosotros no los vemos ni los guardamos.
      </p>

      <h2>Para qué los usamos</h2>
      <p>
        Para gestionar tu cuenta, tus pedidos, los pagos y los envíos, responder tus consultas y cumplir con nuestras
        obligaciones legales. No vendemos ni alquilamos tus datos.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con quienes necesitamos para completar tu compra: Mercado Pago (si pagás por ese medio) y la empresa de
        envíos (los datos de entrega).
      </p>

      <h2>Lo que se guarda en tu navegador</h2>
      <p>
        Guardamos en tu navegador tu sesión y tu carrito, para que no se pierdan al recargar la página. No usamos
        cookies de publicidad. La tienda usa fuentes de Google Fonts y, en la página de pago, el sistema de Mercado
        Pago; estos servicios pueden recibir datos técnicos, como tu dirección IP.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>Mientras tengas tu cuenta y durante el tiempo que exija la ley (por ejemplo, para registros contables).</p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir ver, corregir, actualizar o borrar tus datos escribiendo a {TIENDA.email}.
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme
        lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública,
        en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y
        reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
        materia de protección de datos personales.
      </p>

      <h2>Seguridad</h2>
      <p>Tomamos medidas razonables para proteger tus datos, por ejemplo guardar las contraseñas cifradas.</p>

      <h2>Cambios en esta política</h2>
      <p>Podemos actualizar esta política. La versión vigente es la publicada en esta página.</p>
    </PaginaLegal>
  );
}

export default Privacidad;
