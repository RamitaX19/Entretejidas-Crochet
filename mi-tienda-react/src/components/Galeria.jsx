import { useRef, useState } from "react";
import { API_URL } from "../config";
import ProductoImagen from "./ProductoImagen";

function Galeria({ imagenes, nombre }) {
  const pista = useRef(null);
  const [actual, setActual] = useState(0);

  if (imagenes.length <= 1) {
    return (
      <ProductoImagen
        imagen={imagenes[0]?.ruta}
        alt={nombre}
        className="detalle-imagen"
        lazy={false}
      />
    );
  }

  function irA(indice) {
    const total = imagenes.length;
    const destino = (indice + total) % total;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    pista.current.scrollTo({
      left: destino * pista.current.clientWidth,
      behavior: reducirMovimiento ? "auto" : "smooth",
    });
    setActual(destino);
  }

  function alDesplazar() {
    const indice = Math.round(pista.current.scrollLeft / pista.current.clientWidth);
    if (indice !== actual) setActual(indice);
  }

  return (
    <section className="galeria" aria-label={`Fotos de ${nombre}`}>
      <div className="galeria-principal">
        <div
          className="galeria-pista"
          ref={pista}
          onScroll={alDesplazar}
          tabIndex={0}
          role="group"
          aria-label="Fotos, deslizá para ver más"
        >
          {imagenes.map((imagen, i) => (
            <img
              key={imagen.id}
              src={`${API_URL}${imagen.ruta}`}
              alt={`${nombre}, foto ${i + 1} de ${imagenes.length}`}
              className="galeria-foto"
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>

        <button className="galeria-flecha anterior" onClick={() => irA(actual - 1)} aria-label="Foto anterior">
          ‹
        </button>
        <button className="galeria-flecha siguiente" onClick={() => irA(actual + 1)} aria-label="Foto siguiente">
          ›
        </button>

        <p className="galeria-contador" aria-live="polite">
          {actual + 1} / {imagenes.length}
        </p>
      </div>

      <div className="galeria-miniaturas">
        {imagenes.map((imagen, i) => (
          <button
            key={imagen.id}
            className="galeria-miniatura"
            onClick={() => irA(i)}
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === actual ? "true" : undefined}
          >
            <img src={`${API_URL}${imagen.ruta}`} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default Galeria;