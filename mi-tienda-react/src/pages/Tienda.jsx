import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { TIENDA } from "../tienda";

const NOVEDADES = 8;

function Tienda({ productos, categorias, cargando, error }) {
  const novedades = [...productos].sort((a, b) => b.id - a.id).slice(0, NOVEDADES);

  return (
    <main className="tienda-productos">
      <section className="hero">
        <h1>{TIENDA.nombre}</h1>
        <p>{TIENDA.lema}</p>
        <Link to="/productos" className="boton">Ver todos los productos</Link>
      </section>

      {categorias.length > 0 && (
        <section className="inicio-categorias" aria-labelledby="titulo-categorias">
          <h2 id="titulo-categorias">Categorías</h2>
          <ul className="chips">
            {categorias.map((categoria) => (
              <li key={categoria.id}>
                <Link to={`/productos?categoria=${categoria.id}`} className="chip">{categoria.nombre}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-productos">
        <h2 id="titulo-productos">Novedades</h2>

        {cargando && <p role="status">Cargando productos...</p>}
        {error && (
          <p role="alert" className="aviso aviso-error">
            No pudimos cargar los productos. Probá de nuevo en un rato.
          </p>
        )}

        <ul className="grid-productos">
          {novedades.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </ul>

        {productos.length > NOVEDADES && (
          <Link to="/productos" className="volver ver-todos">Ver todos los productos</Link>
        )}
      </section>
    </main>
  );
}

export default Tienda;
