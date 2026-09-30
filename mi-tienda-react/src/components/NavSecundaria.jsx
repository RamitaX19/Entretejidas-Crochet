import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

function NavSecundaria({ categorias }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // El catálogo (/productos) y el detalle (/producto/:id) marcan "Productos".
  const enProductos = pathname.startsWith("/producto");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const zonaProductos = useRef(null);

  useEffect(() => {
    if (!panelAbierto) return;

    function alHacerClic(e) {
      if (!zonaProductos.current.contains(e.target)) setPanelAbierto(false);
    }

    function alTeclear(e) {
      if (e.key === "Escape") setPanelAbierto(false);
    }

    document.addEventListener("click", alHacerClic);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("click", alHacerClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [panelAbierto]);

  function cerrarPanel() {
    setPanelAbierto(false);
  }

  function buscar(e) {
    e.preventDefault();
    const texto = busqueda.trim();
    navigate(texto ? `/productos?q=${encodeURIComponent(texto)}` : "/productos");
  }

  return (
    <nav className="nav-secundaria" aria-label="Secciones de la tienda">
      <div className="nav-secundaria-contenido">
        <ul className="nav-links">
          <li>
            <NavLink to="/" end>Inicio</NavLink>
          </li>
          <li className="nav-productos" ref={zonaProductos}>
            <button
              type="button"
              className={`nav-boton ${enProductos ? "actual" : ""}`}
              onClick={() => setPanelAbierto(!panelAbierto)}
              aria-expanded={panelAbierto}
              aria-controls="panel-categorias"
            >
              Productos <span aria-hidden="true">▾</span>
            </button>
            {panelAbierto && (
              <div id="panel-categorias" className="panel-categorias">
                <p className="panel-titulo">Categorías</p>
                <ul>
                  <li>
                    <Link to="/productos" onClick={cerrarPanel}>Todos los productos</Link>
                  </li>
                  {categorias.map((categoria) => (
                    <li key={categoria.id}>
                      <Link to={`/productos?categoria=${categoria.id}`} onClick={cerrarPanel}>
                        {categoria.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
          <li>
            <NavLink to="/nosotras">Nosotras</NavLink>
          </li>
          <li>
            <NavLink to="/contacto">Contacto</NavLink>
          </li>
        </ul>

        <form className="buscador" role="search" onSubmit={buscar}>
          <label htmlFor="buscador-general" className="solo-lector">Buscar productos</label>
          <input
            id="buscador-general"
            type="search"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="submit" className="boton">Buscar</button>
        </form>
      </div>
    </nav>
  );
}

export default NavSecundaria;
