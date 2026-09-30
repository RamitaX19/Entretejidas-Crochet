import { Navigate } from "react-router-dom";

function RutaProtegida({ usuario, children }) {
  if (!usuario || !usuario.esAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RutaProtegida;