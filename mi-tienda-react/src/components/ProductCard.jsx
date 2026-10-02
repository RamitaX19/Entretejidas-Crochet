import { Link } from "react-router-dom";
import ProductoImagen from "./ProductoImagen";
import Precio from "./Precio";
import { hayStock, textoPrecio, textoPrecioOriginal } from "../variantes";

function ProductCard({ producto }) {
  const esDigital = producto.tipo === "digital";

  return (
    <li className="producto">
      <ProductoImagen imagen={producto.imagenes[0]?.ruta} className="producto-imagen" />
      <div className="producto-cuerpo">
        {producto.categoria && <p className="producto-categoria">{producto.categoria}</p>}
        <h3>
          <Link to={`/producto/${producto.id}`} className="producto-link">{producto.nombre}</Link>
        </h3>
        <Precio
          className="producto-precio"
          final={textoPrecio(producto)}
          original={textoPrecioOriginal(producto)}
          oferta={producto.oferta}
        />
        <p className={`insignia ${esDigital ? "digital" : ""}`}>
          {esDigital ? "Descarga" : "Con envío"}
        </p>
        {!hayStock(producto) && <p className="insignia agotado">Sin stock</p>}
      </div>
    </li>
  );
}

export default ProductCard;
