let mapa;
let marcadores = [];

function inicializarMapa() {
  mapa = L.map('map').setView([-34.6037, -58.3816], 3);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
}

function agregarMarcador(dato) {
  const direccion = `${dato.Contraparte}, ${dato.Pais}`;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const color = obtenerColorParaPais(dato.Pais);
        const icono = L.divIcon({
          className: 'custom-icon',
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%"></div>`
        });

        const marcador = L.marker([lat, lon], { icon: icono })
          .addTo(mapa)
          .bindPopup(`<b>${dato.Contraparte}</b><br>
                      País: ${dato.Pais}<br>
                      Tipo de convenio: ${dato["Tipo de convenio"]}<br>
                      Año de firma: ${dato["Año de firma"]}<br>
                      Vigente: ${dato["Vigente/No vigente"]}<br>
                      Expediente: ${dato.Expediente}<br>
                      <a href="${dato["Acceso en PDF"]}" target="_blank">Ver PDF</a>`);

        marcadores.push({ marcador, pais: dato.Pais });
      }
    });
}

function filtrarPorPais(pais) {
  marcadores.forEach(obj => {
    if (!pais || obj.pais === pais) {
      mapa.addLayer(obj.marcador);
    } else {
      mapa.removeLayer(obj.marcador);
    }
  });
}