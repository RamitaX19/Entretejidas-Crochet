import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Banner from "../components/Banner";
import { TIENDA } from "../tienda";
import { arbolDeCategorias, linkDeCategoria } from "../categorias";

const NOVEDADES = 8;

function Tienda({ productos, categorias, cargando, error }) {
  const novedades = [...productos].sort((a, b) => b.id - a.id).slice(0, NOVEDADES);
  const principales = arbolDeCategorias(categorias);

  return (
    <main className="inicio">
      <h1 className="solo-lector">{TIENDA.nombre}</h1>
      <Banner />

      <div className="tienda-productos">
        {principales.length > 0 && (
          <section className="inicio-categorias" aria-labelledby="titulo-categorias">
            <h2 id="titulo-categorias">Categorías</h2>
            <ul className="chips">
              {principales.map((categoria) => (
                <li key={categoria.id}>
                  <Link to={linkDeCategoria(categoria.id)} className="chip">{categoria.nombre}</Link>
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
      </div>
    </main>
  );
}

export default Tienda;
