function DatosEntrega({ pedido }) {
  if (pedido.entrega === "envio") {
    return (
      <p>
        <strong>Envío a domicilio:</strong> {pedido.direccion}, {pedido.ciudad}, {pedido.provincia} (CP{" "}
        {pedido.codigoPostal}). Recibe {pedido.destinatario}, tel. {pedido.telefono}.
      </p>
    );
  }

  if (pedido.entrega === "retiro") {
    return (
      <p>
        <strong>Retiro en persona:</strong> {pedido.destinatario}, tel. {pedido.telefono}.
      </p>
    );
  }

  return null;
}

export default DatosEntrega;
