document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded: el documento está cargado');

  const intentarInicializar = async () => {
    const contenedor = document.querySelector('.mapa-convenios');
    const filtro = document.getElementById('filtro-pais');

    if (!contenedor || !filtro) {
      console.warn('⏳ Esperando a que el contenedor y el filtro existan...');
      setTimeout(intentarInicializar, 200);
      return;
    }

    console.log('✅ Contenedor y filtro encontrados. Inicializando mapa...');

    // Agregamos mensaje visible para confirmar carga del plugin
    const mensaje = document.createElement('p');
    mensaje.textContent = '🗺️ Plugin del mapa cargado correctamente';
    mensaje.style.color = 'green';
    mensaje.style.fontWeight = 'bold';
    contenedor.appendChild(mensaje);

    try {
      inicializarMapa();
    } catch (e) {
      console.error('❌ Error al inicializar el mapa:', e);
      return;
    }

    try {
      const datos = await obtenerDatos();
      console.log('✅ Datos obtenidos del Google Sheet:', datos);

      const paisesUnicos = [...new Set(datos.map(d => d.Pais))];

      paisesUnicos.forEach(p => {
        const opcion = document.createElement('option');
        opcion.value = p;
        opcion.textContent = p;
        filtro.appendChild(opcion);
      });

      filtro.addEventListener('change', () => {
        console.log(`🔍 Filtrando por país: ${filtro.value}`);
        marcadores.forEach(m => mapa.removeLayer(m));
        marcadores = [];
        const seleccion = filtro.value;
        const filtrados = seleccion ? datos.filter(d => d.Pais === seleccion) : datos;
        filtrados.forEach(agregarMarcador);
      });

      datos.forEach(agregarMarcador);
    } catch (e) {
      console.error('❌ Error al obtener datos:', e);
    }
  };

  intentarInicializar();
});
