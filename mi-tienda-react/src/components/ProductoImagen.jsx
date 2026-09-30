import { API_URL } from "../config";

function ProductoImagen({ imagen, alt = "", className = "", lazy = true }) {
  if (!imagen) {
    return (
      <div className={`imagen-vacia ${className}`} aria-hidden="true">
        Sin foto
      </div>
    );
  }

  return (
    <img
      src={`${API_URL}${imagen}`}
      alt={alt}
      className={className}
      loading={lazy ? "lazy" : "eager"}
    />
  );
}

export default ProductoImagen;