// main.js
function inicializarApp() {
  console.log("✅ Iniciando app...");

  inicializarMapa();
  obtenerDatos().then(datos => {
    const filtro = document.getElementById('filtro-pais');
    if (!filtro) {
      console.warn("⚠️ No se encontró el filtro. Se saltea el filtrado.");
    }

    const paisesUnicos = [...new Set(datos.map(d => d.Pais))];

    if (filtro) {
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
    }

    datos.forEach(agregarMarcador);
  });
}

// Esperar a que exista el contenedor del mapa
function esperarElemento(selector, callback, intentos = 0) {
  const elemento = document.querySelector(selector);
  if (elemento) {
    console.log(`✅ Elemento ${selector} encontrado. Iniciando...`);
    callback();
  } else if (intentos < 50) {
    console.log(`⏳ Esperando que aparezca ${selector}... intento ${intentos}`);
    setTimeout(() => esperarElemento(selector, callback, intentos + 1), 200);
  } else {
    console.error(`❌ No se encontró ${selector} después de varios intentos.`);
  }
}

window.addEventListener('load', () => {
  esperarElemento('#map', inicializarApp);
});
