// Diapositivas del banner del inicio (pasan solas cada 6 segundos).
// - imagen: una foto en public/banner/, por ejemplo "/banner/lanas.jpg". Sin foto se usa el color de "fondo".
// - fondo: "denim", "cinta" o "rojo" (solo cuando no hay foto).
// - boton y link: el texto del botón y a dónde lleva, por ejemplo "/productos", "/productos?q=lana"
//   o "/productos?categoria=3" (el número de una categoría es el que aparece en la dirección al elegirla).
export const DIAPOSITIVAS = [
  {
    boton: "Ver todos los productos",
    link: "/productos",
    imagen: "/entretejidas-banner.webp",
    alt: "Entretejidas: Hilos, telas, moldes y proyectos para tejer y coser, todo en un solo lugar.",
  },
  {
    boton: "Ver lanas",
    link: "/productos?q=lana",
    imagen: "/lanas-merceria.webp",
    alt: "Lanas y mercería: suaves, resistentes y de colores variados, ideales para tus proyectos de tejido y costura.",
  },
  {
    boton: "Ver lanas",
    link: "/productos?q=lana",
    imagen: "/accesorios-merceria.webp",
    alt: "Accesorios de mercería: hilos, agujas, ganchillos, lanas, cintas y accesorios para tejer y coser.",
  },
];
