import { NavLink } from "react-router-dom";

function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Secciones del panel">
      <NavLink to="/admin" end>Dashboard</NavLink>
      <NavLink to="/admin/productos">Productos</NavLink>
      <NavLink to="/admin/categorias">Categorías</NavLink>
      <NavLink to="/admin/pedidos">Pedidos</NavLink>
      <NavLink to="/admin/clientes">Clientes</NavLink>
      <NavLink to="/admin/stock">Stock</NavLink>
      <NavLink to="/admin/cupones">Cupones</NavLink>
      <NavLink to="/admin/mensajes">Mensajes</NavLink>
    </nav>
  );
}

export default AdminNav;
