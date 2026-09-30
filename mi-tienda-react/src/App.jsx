import { useState, useEffect, useEffectEvent } from "react";
import { Routes, Route, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import Tienda from "./pages/Tienda";
import AdminPanel from "./pages/AdminPanel";
import AdminPedidos from "./pages/AdminPedidos";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClientes from "./pages/AdminClientes";
import AdminStock from "./pages/AdminStock";
import AdminCupones from "./pages/AdminCupones";
import Checkout from "./pages/Checkout";
import MisPedidos from "./pages/MisPedidos";
import PagarPedido from "./pages/PagarPedido";
import Catalogo from "./pages/Catalogo";
import Nosotras from "./pages/Nosotras";
import Contacto from "./pages/Contacto";
import Arrepentimiento from "./pages/Arrepentimiento";
import Terminos from "./pages/Terminos";
import Privacidad from "./pages/Privacidad";
import Devoluciones from "./pages/Devoluciones";
import Restablecer from "./pages/Restablecer";
import AdminCategorias from "./pages/AdminCategorias";
import AdminMensajes from "./pages/AdminMensajes";
import RutaProtegida from "./components/RutaProtegida";
import Navbar from "./components/Navbar";
import NavSecundaria from "./components/NavSecundaria";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
import ProductoDetalle from "./components/productoDetalle";
import { API_URL } from "./config";
import { leerJson } from "./api";
import { claveCarrito, tieneVariantes } from "./variantes";

const MENSAJES_AUTH = {
  compra: "Iniciá sesión o creá una cuenta para finalizar tu compra.",
  sesion: "Tu sesión venció. Iniciá sesión de nuevo.",
};

// setTimeout no puede esperar más de unos 24 días.
const ESPERA_MAXIMA = 2 ** 31 - 1;

function leerGuardado(clave, valorPorDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

function borrarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

function leerUsuario() {
  const usuario = leerGuardado("usuario", null);

  if (usuario?.expira && usuario.expira <= Date.now()) {
    borrarSesion();
    return null;
  }

  return usuario;
}

function guardarUsuario(datos) {
  const usuario = {
    nombre: datos.nombre,
    email: datos.email,
    esAdmin: datos.esAdmin,
    expira: datos.expira,
  };
  localStorage.setItem("usuario", JSON.stringify(usuario));
  return usuario;
}

// El carrito guardado toma los precios y el stock actuales, y pierde lo que ya no existe
// (incluidas las variantes borradas o los productos que ahora piden elegir una variante).
function actualizarCarrito(carrito, productos) {
  return carrito
    .map((item) => {
      const producto = productos.find((p) => p.id === item.id);
      if (!producto) return null;

      let variante = null;

      if (tieneVariantes(producto)) {
        variante = producto.variantes.find((v) => v.id === item.variante?.id);
        if (!variante) return null;
      }

      const stock = variante ? variante.stock : producto.stock;
      const maximo = producto.tipo === "digital" ? 1 : (stock ?? Infinity);

      return {
        ...producto,
        variante,
        clave: claveCarrito(producto.id, variante),
        cantidad: Math.min(item.cantidad, maximo),
      };
    })
    .filter((item) => item && item.cantidad > 0);
}

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tipoNavegacion = useNavigationType();
  const [productos, setProductos] = useState([]);
  const [versionProductos, setVersionProductos] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [versionCategorias, setVersionCategorias] = useState(0);
  const [carrito, setCarrito] = useState(() => leerGuardado("carrito", []));
  const [cargando, setCargando] = useState(true);
  const [errorProductos, setErrorProductos] = useState(false);
  const [usuario, setUsuario] = useState(leerUsuario);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [authAbierto, setAuthAbierto] = useState(false);
  const [authVista, setAuthVista] = useState("login");
  const [authMotivo, setAuthMotivo] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/productos`)
      .then(leerJson)
      .then((datos) => {
        setProductos(datos);
        setCarrito((carritoActual) => actualizarCarrito(carritoActual, datos));
        setErrorProductos(false);
      })
      .catch((error) => {
        console.error("Error al traer productos:", error);
        setErrorProductos(true);
      })
      .finally(() => setCargando(false));
  }, [versionProductos]);

  useEffect(() => {
    fetch(`${API_URL}/api/categorias`)
      .then(leerJson)
      .then((datos) => setCategorias(datos))
      .catch((error) => console.error("Error al traer categorías:", error));
  }, [versionCategorias]);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // Cada página nueva arranca desde arriba (con "Atrás" el navegador vuelve a donde estaba).
  const alCambiarDePagina = useEffectEvent(() => {
    if (tipoNavegacion !== "POP") window.scrollTo(0, 0);
  });

  useEffect(() => {
    alCambiarDePagina();
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((respuesta) => {
        if (respuesta.status === 401) {
          borrarSesion();
          setUsuario(null);
        } else if (respuesta.ok) {
          return respuesta.json().then((datos) => setUsuario(guardarUsuario(datos)));
        }
      })
      .catch((error) => console.error("No se pudo revisar la sesión:", error));
  }, []);

  const alVencerSesion = useEffectEvent(() => {
    cerrarSesion();
    abrirAuth("login", "sesion");
  });

  useEffect(() => {
    function manejarSesionVencida() {
      alVencerSesion();
    }

    window.addEventListener("sesion-vencida", manejarSesionVencida);
    return () => window.removeEventListener("sesion-vencida", manejarSesionVencida);
  }, []);

  useEffect(() => {
    if (!usuario?.expira) return;

    const espera = usuario.expira - Date.now();
    if (espera > ESPERA_MAXIMA) return;

    const temporizador = setTimeout(() => alVencerSesion(), Math.max(espera, 0));
    return () => clearTimeout(temporizador);
  }, [usuario]);

  function recargarProductos() {
    setVersionProductos((version) => version + 1);
  }

  // Los productos también traen el nombre de su categoría: se recargan los dos.
  function recargarCategorias() {
    setVersionCategorias((version) => version + 1);
    recargarProductos();
  }

  function manejarLoginExitoso(datos) {
    localStorage.setItem("token", datos.token);
    setUsuario(guardarUsuario(datos));
    setAuthAbierto(false);
    setAuthMotivo(null);

    if (authMotivo === "compra") {
      navigate("/checkout");
    }
  }

  function cerrarSesion() {
    borrarSesion();
    setUsuario(null);
  }

  function agregarAlCarrito(producto, cantidad = 1, variante = null) {
    setCarrito((carritoActual) => {
      const esDigital = producto.tipo === "digital";
      const clave = claveCarrito(producto.id, variante);
      const stock = variante ? variante.stock : producto.stock;
      const maximo = esDigital ? 1 : (stock ?? Infinity);
      const yaEsta = carritoActual.some((item) => item.clave === clave);

      if (yaEsta) {
        if (esDigital) return carritoActual;

        return carritoActual.map((item) =>
          item.clave === clave
            ? { ...item, cantidad: Math.min(item.cantidad + cantidad, maximo) }
            : item,
        );
      }

      if (maximo < 1) return carritoActual;

      return [
        ...carritoActual,
        { ...producto, variante, clave, cantidad: esDigital ? 1 : Math.min(cantidad, maximo) },
      ];
    });
  }

  function disminuirCantidad(clave) {
    setCarrito((carritoActual) =>
      carritoActual
        .map((item) =>
          item.clave === clave ? { ...item, cantidad: item.cantidad - 1 } : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  function abrirAuth(vista, motivo = null) {
    setAuthVista(vista);
    setAuthMotivo(motivo);
    setAuthAbierto(true);
    setCarritoAbierto(false);
  }

  function cerrarAuth() {
    setAuthAbierto(false);
    setAuthMotivo(null);
  }

  function finalizarCompra() {
    setCarritoAbierto(false);

    if (usuario) {
      navigate("/checkout");
    } else {
      abrirAuth("login", "compra");
    }
  }

  function pedidoCreado() {
    setCarrito([]);
    recargarProductos();
  }

  return (
    <div className="sitio">
      <Navbar
        usuario={usuario}
        cerrarSesion={cerrarSesion}
        carrito={carrito}
        aumentarCantidad={agregarAlCarrito}
        disminuirCantidad={disminuirCantidad}
        finalizarCompra={finalizarCompra}
        carritoAbierto={carritoAbierto}
        onAlternarCarrito={() => setCarritoAbierto((abierto) => !abierto)}
        onCerrarCarrito={() => setCarritoAbierto(false)}
        onAbrirAuth={abrirAuth}
      />
      <NavSecundaria categorias={categorias} />

      <Routes>
        <Route
          path="/"
          element={<Tienda productos={productos} categorias={categorias} cargando={cargando} error={errorProductos} />}
        />
        <Route
          path="/productos"
          element={
            <Catalogo productos={productos} categorias={categorias} cargando={cargando} error={errorProductos} />
          }
        />
        <Route path="/nosotras" element={<Nosotras />} />
        <Route path="/contacto" element={<Contacto usuario={usuario} />} />
        <Route path="/arrepentimiento" element={<Arrepentimiento usuario={usuario} />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/devoluciones" element={<Devoluciones />} />
        <Route path="/restablecer" element={<Restablecer onAbrirAuth={abrirAuth} />} />
        <Route
          path="/producto/:id"
          element={
            <ProductoDetalle
              productos={productos}
              carrito={carrito}
              cargando={cargando}
              agregarAlCarrito={agregarAlCarrito}
            />
          }
        />
        <Route
          path="/checkout"
          element={
            <Checkout
              carrito={carrito}
              usuario={usuario}
              onPedidoCreado={pedidoCreado}
              onAbrirAuth={abrirAuth}
            />
          }
        />
        <Route
          path="/mis-pedidos"
          element={<MisPedidos usuario={usuario} onAbrirAuth={abrirAuth} />}
        />
        <Route
          path="/pagar/:id"
          element={<PagarPedido usuario={usuario} onAbrirAuth={abrirAuth} />}
        />
        <Route
          path="/admin"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminDashboard />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/productos"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminPanel productos={productos} setProductos={setProductos} categorias={categorias} />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/categorias"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminCategorias onCategoriasCambiadas={recargarCategorias} />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/pedidos"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminPedidos onStockCambiado={recargarProductos} />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminClientes />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/stock"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminStock onStockCambiado={recargarProductos} />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/cupones"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminCupones />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/mensajes"
          element={
            <RutaProtegida usuario={usuario}>
              <AdminMensajes />
            </RutaProtegida>
          }
        />
      </Routes>

      <Footer />

      {authAbierto && (
        <AuthModal
          vista={authVista}
          onCambiarVista={setAuthVista}
          onCerrar={cerrarAuth}
          onLoginExitoso={manejarLoginExitoso}
          mensaje={MENSAJES_AUTH[authMotivo]}
        />
      )}
    </div>
  );
}

export default App;
