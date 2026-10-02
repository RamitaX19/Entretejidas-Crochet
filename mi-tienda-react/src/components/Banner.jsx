import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { DIAPOSITIVAS } from "../banner";

const INTERVALO = 6000;
const MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

function suscribirMovimiento(avisar) {
  const consulta = window.matchMedia(MENOS_MOVIMIENTO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function prefiereMenosMovimiento() {
  return window.matchMedia(MENOS_MOVIMIENTO).matches;
}

function Icono({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

// Carrusel del inicio. Se detiene con el mouse encima, con el foco adentro, con el botón de pausa
// o si la persona pidió menos movimiento en su sistema.
function Banner({ diapositivas = DIAPOSITIVAS }) {
  const total = diapositivas.length;
  const [actual, setActual] = useState(0);
  const [enUso, setEnUso] = useState(false);
  const inicioDelToque = useRef(null);
  const menosMovimiento = useSyncExternalStore(suscribirMovimiento, prefiereMenosMovimiento);
  const pausado = menosMovimiento;
  const girando = total > 1 && !pausado && !enUso;

  useEffect(() => {
    if (!girando) return;
    const temporizador = setTimeout(() => setActual((i) => (i + 1) % total), INTERVALO);
    return () => clearTimeout(temporizador);
  }, [girando, actual, total]);

  if (total === 0) return null;

  function ir(indice) {
    setActual((indice + total) % total);
  }

  // En el celular se puede pasar de diapositiva deslizando con el dedo.
  function alTocar(e) {
    if (e.pointerType !== "mouse") inicioDelToque.current = e.clientX;
  }

  function alSoltar(e) {
    if (inicioDelToque.current === null) return;
    const distancia = e.clientX - inicioDelToque.current;
    inicioDelToque.current = null;
    if (Math.abs(distancia) > 50) ir(actual + (distancia < 0 ? 1 : -1));
  }

  return (
    <section
      className="banner"
      aria-roledescription="carrusel"
      aria-label="Novedades y promociones"
      onMouseEnter={() => setEnUso(true)}
      onMouseLeave={() => setEnUso(false)}
      onFocus={() => setEnUso(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setEnUso(false);
      }}
    >
      <div
        className="banner-pista"
        style={{ transform: `translateX(-${actual * 100}%)` }}
        aria-live={girando ? "off" : "polite"}
        onPointerDown={alTocar}
        onPointerUp={alSoltar}
        onPointerCancel={() => {
          inicioDelToque.current = null;
        }}
      >
        {diapositivas.map((diapositiva, i) => (
          <div
            key={i}
            className={`banner-diapositiva banner-${diapositiva.imagen ? "foto" : (diapositiva.fondo ?? "denim")}`}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== actual}
            inert={i !== actual}
          >
            {diapositiva.imagen && (
              <img className="banner-imagen" src={diapositiva.imagen} alt={diapositiva.alt ?? ""} loading={i === 0 ? "eager" : "lazy"} />
            )}
            <div className="banner-contenido">
              {diapositiva.titulo && <h2>{diapositiva.titulo}</h2>}
              {diapositiva.texto && <p>{diapositiva.texto}</p>}
              {diapositiva.boton && diapositiva.link && (
                <Link to={diapositiva.link} className="boton boton-banner">{diapositiva.boton}</Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="banner-controles">
          <button type="button" className="banner-control" onClick={() => ir(actual - 1)} aria-label="Diapositiva anterior">
            <Icono><path d="M15 18l-6-6 6-6" /></Icono>
          </button>
          <div className="banner-puntos">
            {diapositivas.map((diapositiva, i) => (
              <button
                key={i}
                type="button"
                className="banner-punto"
                onClick={() => ir(i)}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === actual ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" className="banner-control" onClick={() => ir(actual + 1)} aria-label="Diapositiva siguiente">
            <Icono><path d="M9 18l6-6-6-6" /></Icono>
          </button>
        </div>
      )}
    </section>
  );
}

export default Banner;
