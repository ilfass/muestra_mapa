/**
 * Mapa Dinámico - JS v1.0.3
 * 
 * Características:
 * - Carga datos desde Google Sheets usando el endpoint gviz/tq
 * - Geolocalización automática con Nominatim
 * - Sistema de caché para coordenadas en localStorage
 * - Filtros por país y búsqueda por texto
 * - Clustering de marcadores cercanos
 * - Manejo de errores robusto
 * - Retraso configurable entre geocodificaciones
 */

// Verificar que la variable global esté disponible
if (typeof MapaDinamico === 'undefined') {
    console.error('La variable global MapaDinamico no está definida');
    MapaDinamico = {
        geocodingDelay: 500,
        nominatimUrl: 'https://nominatim.openstreetmap.org/search'
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar mapa
    const container = document.getElementById("mapa-dinamico");
    if (!container) {
        console.warn("No se encontró el contenedor del mapa");
        return;
    }

    const sheetId = container.dataset.sheetId;
    if (!sheetId) {
        container.innerHTML = "<p style='color:red;'>⚠️ Falta el ID de la hoja de cálculo</p>";
        return;
    }

    // Inicializar mapa con vista mundial
    const map = L.map(container).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Inicializar cluster de marcadores
    const markers = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: `<div class="cluster-count">${cluster.getChildCount()}</div>`,
                className: 'marker-cluster',
                iconSize: L.point(40, 40)
            });
        }
    });
    map.addLayer(markers);

    // Cache de coordenadas desde localStorage
    const coordsCache = JSON.parse(localStorage.getItem('coordsCache') || '{}');
    let allMarkers = [];

    // Cargar datos de la hoja usando el endpoint gviz/tq
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    
    fetch(sheetUrl)
        .then(res => {
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            return res.text();
        })
        .then(text => {
            try {
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
                const buscador = document.getElementById("buscador-mapa");
                
                if (!selectPais || !buscador) {
                    console.warn("No se encontraron los elementos de filtrado");
                    return;
                }

                paises.forEach(pais => {
                    const option = document.createElement("option");
                    option.value = pais;
                    option.textContent = pais;
                    selectPais.appendChild(option);
                });

                // Función para procesar una universidad
                function processUniversity(university, entry) {
                    if (!university) return;
                    
                    // Verificar caché
                    if (coordsCache[university]) {
                        addMarker(coordsCache[university], entry, university);
                        return Promise.resolve();
                    }

                    // Si no está en caché, geocodificar
                    return new Promise(resolve => {
                        fetch(`${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(university)}&format=json&limit=1`)
                            .then(res => {
                                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                                return res.json();
                            })
                            .then(data => {
                                if (data.length) {
                                    const coords = {
                                        lat: parseFloat(data[0].lat),
                                        lng: parseFloat(data[0].lon)
                                    };
                                    // Guardar en caché
                                    coordsCache[university] = coords;
                                    localStorage.setItem('coordsCache', JSON.stringify(coordsCache));
                                    // Añadir marcador
                                    addMarker(coords, entry, university);
                                } else {
                                    console.warn("No se encontró ubicación para:", university);
                                }
                                resolve();
                            })
                            .catch(err => {
                                console.error("Error geocodificando:", university, err);
                                resolve();
                            });
                    });
                }

                // Función para añadir marcador con popup
                function addMarker(coords, entry, university) {
                    const popupContent = `
                        <div class="info">
                            <h4>${university}</h4>
                            ${Object.entries(entry)
                                .filter(([key, val]) => val && key !== "Universidad contraparte" && key !== "Nombre")
                                .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
                                .join("<br>")}
                        </div>
                    `;
                    
                    const marker = L.marker([coords.lat, coords.lng])
                        .bindPopup(popupContent);
                    
                    allMarkers.push({
                        marker,
                        entry,
                        searchText: `${university} ${entry["País"] || ""}`.toLowerCase()
                    });
                    
                    markers.addLayer(marker);
                }

                // Función para actualizar marcadores según filtros
                function updateMarkers() {
                    const paisSeleccionado = selectPais.value;
                    const busqueda = buscador.value.toLowerCase();
                    
                    markers.clearLayers();
                    
                    allMarkers.forEach(({ marker, entry, searchText }) => {
                        const matchPais = !paisSeleccionado || entry["País"] === paisSeleccionado;
                        const matchBusqueda = !busqueda || searchText.includes(busqueda);
                        
                        if (matchPais && matchBusqueda) {
                            markers.addLayer(marker);
                        }
                    });
                }

                // Eventos de cambio en los filtros
                selectPais.addEventListener("change", updateMarkers);
                buscador.addEventListener("input", updateMarkers);

                // Procesar cada entrada
                const processPromises = rows.map((entry, index) => {
                    const universities = entry["Universidad contraparte"]?.split(/\s*,\s*|\s*y\s*/) || [];
                    return Promise.all(universities.map((univ, i) => 
                        new Promise(resolve => 
                            setTimeout(() => 
                                processUniversity(univ.trim(), entry).then(resolve),
                                (index * universities.length + i) * MapaDinamico.geocodingDelay
                            )
                        )
                    ));
                });

                // Esperar a que todas las geocodificaciones terminen
                Promise.all(processPromises).then(() => {
                    console.log("Todas las geocodificaciones completadas");
                });

            } catch (err) {
                throw new Error(`Error procesando datos: ${err.message}`);
            }
        })
        .catch(err => {
            console.error("Error al procesar el sheet:", err);
            container.innerHTML = `
                <p style='color:red;'>
                    Error al cargar los datos del mapa.<br>
                    Detalles: ${err.message}
                </p>`;
        });
}); 