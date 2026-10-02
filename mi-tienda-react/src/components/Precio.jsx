// Precio de un producto. Con oferta: arriba el de lista tachado y abajo el que se cobra.
// El tachado solo se ve, así que el lector de pantalla lee "Precio anterior" y "Precio con descuento".
function Precio({ final, original, oferta, className }) {
  if (!oferta || original === final) {
    return <p className={className}>{final}</p>;
  }

  return (
    <p className={`${className} precio-con-oferta`}>
      <s className="precio-anterior">
        <span className="solo-lector">Precio anterior: </span>
        {original}
      </s>
      <span className="precio-final">
        <span className="solo-lector">Precio con {oferta}% de descuento: </span>
        {final}
      </span>
    </p>
  );
}

export default Precio;
