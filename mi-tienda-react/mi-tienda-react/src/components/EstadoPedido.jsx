import { nombreEstado } from "../pedidos";

function EstadoPedido({ estado, entrega }) {
  return <span className={`estado estado-${estado}`}>{nombreEstado(estado, entrega)}</span>;
}

export default EstadoPedido;
