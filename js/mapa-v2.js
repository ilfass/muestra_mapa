// 🗺️ Este archivo se encarga de inicializar el mapa y mostrar los marcadores con Leaflet

let mapa;
let capaMarcadores;

/**
 * 🗺️ Inicializa el mapa con OpenStreetMap
 */
function inicializarMapa() {
  // 🖐 Creamos el mapa centrado en una ubicación genérica
  mapa = L.map('map').setView([0, 0], 2); // 🌍 Vista global por defecto

  // 📦 Cargamos tiles de OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapa);

  // ✨ Inicializamos la capa de marcadores
  capaMarcadores = L.layerGroup().addTo(mapa);
}

/**
 * 📍 Muestra los marcadores en el mapa usando los datos filtrados
 */
function mostrarMarcadoresEnMapa(datos) {
  capaMarcadores.clearLayers(); // 🧹 Limpiamos los marcadores previos

  datos.forEach(fila => {
    const lat = parseFloat(fila['Latitud']);
    const lng = parseFloat(fila['Longitud']);

    if (!isNaN(lat) && !isNaN(lng)) {
      // 📍 Creamos un ícono personalizado en forma de pin
      const iconoPin = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Pin bonito
        iconSize: [30, 30],
        iconAnchor: [15, 30], // 🧲 Punto de anclaje del ícono
        popupAnchor: [0, -30] // 💬 Punto donde aparece el popup
      });

      // 🖐 Creamos el marcador y lo agregamos
      const marcador = L.marker([lat, lng], { icon: iconoPin });

      // 🗂️ Creamos el contenido del popup
      const popupHTML = `
        <strong>${fila['Universidad'] || 'Sin nombre'}</strong><br>
        ${fila['Ciudad'] || ''} - ${fila['País'] || ''}
      `;

      marcador.bindPopup(popupHTML);
      marcador.addTo(capaMarcadores);
    }
  });

  // 🧭 Si hay puntos, ajustamos el mapa para mostrar todos
  if (datos.length > 0) {
    const grupo = new L.featureGroup(capaMarcadores.getLayers());
    mapa.fitBounds(grupo.getBounds().pad(0.2));
  }
}
