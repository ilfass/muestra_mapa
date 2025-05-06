/**
 * Mapa Dinámico - JS v1.0.0
 * 
 * Características:
 * - Carga datos desde Google Sheets
 * - Geolocalización automática con Nominatim
 * - Sistema de caché para coordenadas
 * - Filtros por país
 * - Manejo de errores robusto
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar mapa
    const container = document.getElementById("mapa-dinamico");
    if (!container) return;

    const sheetId = container.dataset.sheetId;
    if (!sheetId) {
        container.innerHTML = "<p style='color:red;'>⚠️ Falta el ID de la hoja de cálculo</p>";
        return;
    }

    const map = L.map(container).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Cache de coordenadas
    const coordsCache = JSON.parse(localStorage.getItem('coordsCache') || '{}');
    let markers = [];

    // Cargar datos de la hoja
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    
    fetch(sheetUrl)
        .then(res => res.ok ? res.text() : Promise.reject("Error al cargar hoja"))
        .then(text => {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            const cols = json.table.cols.map(col => col.label);
            const rows = json.table.rows.map(row => {
                const obj = {};
                row.c.forEach((cell, i) => {
                    obj[cols[i]] = cell?.v || "";
                });
                return obj;
            });

            // Llenar select de países
            const paises = [...new Set(rows.map(row => row["País"]).filter(Boolean))].sort();
            const selectPais = document.getElementById("filtro-pais");
            paises.forEach(pais => {
                const option = document.createElement("option");
                option.value = pais;
                option.textContent = pais;
                selectPais.appendChild(option);
            });

            // Función para añadir marcador
            function addMarker(coords, entry) {
                const popupContent = `
                    <div class="info">
                        <h4>${entry["Universidad Contraparte"] || entry["Nombre"] || "Sin nombre"}</h4>
                        ${Object.entries(entry)
                            .filter(([key, val]) => val && key !== "Universidad Contraparte" && key !== "Nombre")
                            .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
                            .join("<br>")}
                    </div>
                `;
                
                const marker = L.marker([coords.lat, coords.lng])
                    .bindPopup(popupContent);
                markers.push({ marker, entry });
                marker.addTo(map);
            }

            // Función para actualizar marcadores según filtro
            function updateMarkers() {
                const paisSeleccionado = selectPais.value;
                markers.forEach(({ marker, entry }) => {
                    if (!paisSeleccionado || entry["País"] === paisSeleccionado) {
                        marker.addTo(map);
                    } else {
                        marker.remove();
                    }
                });
            }

            // Evento de cambio en el filtro
            selectPais.addEventListener("change", updateMarkers);

            // Geolocalizar cada entrada
            rows.forEach((entry, index) => {
                const nombre = entry["Universidad Contraparte"] || entry["Nombre"];
                if (!nombre) return;

                // Verificar caché
                if (coordsCache[nombre]) {
                    addMarker(coordsCache[nombre], entry);
                    return;
                }

                // Si no está en caché, geocodificar
                setTimeout(() => {
                    fetch(`${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(nombre)}&format=json&limit=1`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.length) {
                                const coords = {
                                    lat: parseFloat(data[0].lat),
                                    lng: parseFloat(data[0].lon)
                                };
                                // Guardar en caché
                                coordsCache[nombre] = coords;
                                localStorage.setItem('coordsCache', JSON.stringify(coordsCache));
                                // Añadir marcador
                                addMarker(coords, entry);
                            } else {
                                console.warn("No se encontró ubicación para:", nombre);
                            }
                        })
                        .catch(err => console.error("Error geocodificando:", nombre, err));
                }, index * MapaDinamico.geocodingDelay);
            });
        })
        .catch(err => {
            console.error("Error al procesar el sheet:", err);
            container.innerHTML = "<p style='color:red;'>Error al cargar los datos del mapa.</p>";
        });
}); 