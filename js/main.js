
window.onload = async () => {
  inicializarMapa();
  const datos = await obtenerDatos();
  const paisesUnicos = [...new Set(datos.map(d => d.Pais))];
  const filtro = document.getElementById('filtro-pais');

  paisesUnicos.forEach(p => {
    const opcion = document.createElement('option');
    opcion.value = p;
    opcion.textContent = p;
    filtro.appendChild(opcion);
  });

  filtro.addEventListener('change', () => {
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];
    const seleccion = filtro.value;
    const filtrados = seleccion ? datos.filter(d => d.Pais === seleccion) : datos;
    filtrados.forEach(agregarMarcador);
  });

  datos.forEach(agregarMarcador);
};
