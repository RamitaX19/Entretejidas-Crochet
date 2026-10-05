// Diapositivas del banner del inicio (pasan solas cada 6 segundos).
// - titulo y texto: lo que se lee sobre la foto, a la izquierda (la foto tiene que ser sin texto dibujado).
// - imagen: una foto en public/banner/, por ejemplo "/banner/lanas.jpg". Sin foto se usa el color de "fondo".
// - fondo: "denim", "cinta" o "rojo" (solo cuando no hay foto).
// - boton y link: el texto del botón y a dónde lleva, por ejemplo "/productos", "/productos?q=lana"
//   o "/productos?categoria=3" (el número de una categoría es el que aparece en la dirección al elegirla).
export const DIAPOSITIVAS = [
  {
    titulo: "Entretejidas Mercería",
    texto: "Todo lo que necesitás para crear, en un solo lugar.",
    boton: "Ver todos los productos",
    link: "/productos",
    imagen: "/merceria-entretejidas.webp",
    alt: "Entretejidas: Hilos, telas, moldes y proyectos para tejer y coser, todo en un solo lugar.",
  },
  {
    titulo: "Nuestras lanas",
    texto: "Suaves, resistentes y en una gran variedad de colores para que tus ideas cobren vida.",
    boton: "Ver lanas",
    link: "/productos?q=lana",
    imagen: "/lanas.webp",
    alt: "Lanas y mercería: suaves, resistentes y de colores variados, ideales para tus proyectos de tejido y costura.",
  },
  {
    titulo: "Accesorios de mercería",
    texto: "Botones, cierres, elásticos y todo lo que necesitás para darle forma a tus ideas.",
    boton: "Ver accesorios",
    link: "/productos?q=accesorios",
    imagen: "/accesorios.webp",
    alt: "Accesorios de mercería: hilos, agujas, ganchillos, lanas, cintas y accesorios para tejer y coser.",
  },
];
