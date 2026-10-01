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
          <li className="pie-redes">
          <a rel="noopener noreferrer" target="_blank" href="https://www.instagram.com/entretejidas_crochet" ><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-instagram"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4l0 -8" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M16.5 7.5v.01" /></svg> </a>
          <a rel="noopener noreferrer" target="_blank" href="https://www.facebook.com/share/1C4SGfoXUz/" ><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-facebook"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" /></svg> </a>
          </li>
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
