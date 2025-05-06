document.addEventListener("DOMContentLoaded", () => {
    // Inicializar mapa
    const map = L.map("mapa-convenios").setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Cargar datos de la hoja
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${mapaConveniosConfig.sheetId}/gviz/tq?tqx=out:json`;
    
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

            // Cache de coordenadas
            const coordsCache = JSON.parse(localStorage.getItem('coordsCache') || '{}');
            let markers = [];

            // Función para añadir marcador
            function addMarker(coords, entry) {
                const popupContent = `
                    <div class="info">
                        <h4>${entry["Universidad Contraparte"]}</h4>
                        <strong>País:</strong> ${entry["País"]}<br>
                        <strong>Tipo:</strong> ${entry["Tipo de convenio"]}<br>
                        <strong>Año:</strong> ${entry["Año de firma"]}<br>
                        <strong>Vigente:</strong> ${entry["Vigente/No vigente"]}<br>
                        ${entry["Web"] ? `<a href="${entry["Web"]}" target="_blank">Sitio web</a><br>` : ''}
                        ${entry["Acceso en PDF"] ? `<a href="${entry["Acceso en PDF"]}" target="_blank">Ver PDF</a>` : ''}
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

            // Geolocalizar cada universidad
            rows.forEach((entry, index) => {
                const nombreUni = entry["Universidad Contraparte"];
                if (!nombreUni) return;

                // Verificar caché
                if (coordsCache[nombreUni]) {
                    addMarker(coordsCache[nombreUni], entry);
                    return;
                }

                // Si no está en caché, geocodificar
                setTimeout(() => {
                    fetch(`${mapaConveniosConfig.nominatimUrl}?q=${encodeURIComponent(nombreUni)}&format=json&limit=1`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.length) {
                                const coords = {
                                    lat: parseFloat(data[0].lat),
                                    lng: parseFloat(data[0].lon)
                                };
                                // Guardar en caché
                                coordsCache[nombreUni] = coords;
                                localStorage.setItem('coordsCache', JSON.stringify(coordsCache));
                                // Añadir marcador
                                addMarker(coords, entry);
                            } else {
                                console.warn("No se encontró ubicación para:", nombreUni);
                            }
                        })
                        .catch(err => console.error("Error geocodificando:", nombreUni, err));
                }, index * mapaConveniosConfig.geocodingDelay);
            });
        })
        .catch(err => console.error("Error cargando datos:", err));
}); 