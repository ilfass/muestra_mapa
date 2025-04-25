// main-v2.js

document.addEventListener("DOMContentLoaded", async function () {
  const map = L.map("map").setView([-34.6, -58.4], 4); // 🖐 Vista inicial centrada en Argentina

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const datos = await obtenerDatos(); // 🖐 Obtenemos datos desde Google Sheets

  const marcadores = [];
  const filtrosContainer = document.getElementById("filtros-container");
  filtrosContainer.innerHTML = ""; // Limpiamos el contenedor

  // 🖐 Detectamos automáticamente las columnas por las que se puede filtrar
  const columnasAFiltrar = Object.keys(datos[0] || {}).filter(
    (col) => col.toLowerCase() !== "lat" && col.toLowerCase() !== "lng"
  );

  columnasAFiltrar.forEach((columna) => {
    const label = document.createElement("label");
    label.textContent = columna + ": ";

    const select = document.createElement("select");
    select.dataset.columna = columna;
    select.innerHTML = `<option value="">Todos</option>`;

    const valoresUnicos = [...new Set(datos.map((fila) => fila[columna]).filter(Boolean))];
    valoresUnicos.sort().forEach((valor) => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;
      select.appendChild(option);
    });

    filtrosContainer.appendChild(label);
    filtrosContainer.appendChild(select);
  });

  function mostrarMarcadores(datosFiltrados) {
    // 🖐 Limpiar marcadores previos
    marcadores.forEach((m) => map.removeLayer(m));
    marcadores.length = 0;

    datosFiltrados.forEach((fila) => {
      const lat = parseFloat(fila.Lat);
      const lng = parseFloat(fila.Lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        const marcador = L.marker([lat, lng], {
          icon: L.icon({ // 🖐 Icono personalizado tipo pin
            iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
            shadowSize: [41, 41],
          }),
        }).addTo(map);

        // 🖐 Contenido dinámico del popup con todos los campos
        let popupContent = "";
        for (const clave in fila) {
          if (fila[clave]) {
            popupContent += `<strong>${clave}:</strong> ${fila[clave]}<br>`;
          }
        }
        marcador.bindPopup(popupContent);
        marcadores.push(marcador);
      }
    });
  }

  mostrarMarcadores(datos); // 🖐 Mostrar todos inicialmente

  // 🖐 Agregar eventos a los filtros
  filtrosContainer.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const criterios = {};
      filtrosContainer.querySelectorAll("select").forEach((s) => {
        if (s.value) criterios[s.dataset.columna] = s.value;
      });

      const filtrados = datos.filter((fila) =>
        Object.entries(criterios).every(([col, val]) => fila[col] === val)
      );

      mostrarMarcadores(filtrados);
    });
  });
});

// 🖐 Función que obtiene los datos desde la URL del Google Sheet pasada desde el shortcode
async function obtenerDatos() {
  const url = typeof googleSheetURL !== "undefined" ? googleSheetURL : "";
  if (!url) {
    console.error("No se definió la URL de Google Sheets");
    return [];
  }

  const res = await fetch(url);
  return await res.json();
}
