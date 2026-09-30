import { Link } from "react-router-dom";
import { TIENDA } from "../tienda";

const ANIO = new Date().getFullYear();

function Footer() {
  return (
    <footer className="pie">
      <div className="pie-contenido">
        <section aria-labelledby="pie-tienda">
          <p id="pie-tienda" className="pie-marca">{TIENDA.nombre}</p>
          <p>{TIENDA.lema}</p>
        </section>

        <nav aria-labelledby="pie-links">
          <h2 id="pie-links">Links</h2>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/productos">Productos</Link></li>
            <li><Link to="/nosotras">Nosotras</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </nav>

        <section aria-labelledby="pie-envios">
          <h2 id="pie-envios">Formas de envío</h2>
          {TIENDA.envios.length > 0 ? (
            <ul>
              {TIENDA.envios.map((envio) => (
                <li key={envio}>{envio}</li>
              ))}
            </ul>
          ) : (
            <p>Próximamente.</p>
          )}
        </section>

        <section aria-labelledby="pie-contacto">
          <h2 id="pie-contacto">Contacto</h2>
          <ul>
            <li>Teléfono: {TIENDA.telefono}</li>
            <li>Email: {TIENDA.email}</li>
            <li>Ubicación: {TIENDA.ubicacion}</li>
          </ul>
        </section>
      </div>

      <div className="pie-legal">
        <div className="pie-legal-contenido">
          <p>© {ANIO} {TIENDA.nombre}. Todos los derechos reservados.</p>
          <ul>
            <li><Link to="/terminos">Términos y condiciones</Link></li>
            <li><Link to="/privacidad">Política de privacidad</Link></li>
            <li><Link to="/devoluciones">Cambios y devoluciones</Link></li>
            <li><Link to="/arrepentimiento" className="boton-arrepentimiento">Botón de arrepentimiento</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
