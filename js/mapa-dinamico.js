/**
 * Mapa Dinámico - JS v1.0.2
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
        geocodingDelay: 500, // Reducido para mayor velocidad
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

                // Función para añadir marcador con popup
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
                    
                    allMarkers.push({
                        marker,
                        entry,
                        searchText: `${entry["Universidad Contraparte"] || ""} ${entry["Nombre"] || ""} ${entry["País"] || ""}`.toLowerCase()
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

                // Geolocalizar cada entrada con retraso configurable
                const geocodePromises = rows.map((entry, index) => {
                    const nombre = entry["Universidad Contraparte"] || entry["Nombre"];
                    if (!nombre) {
                        console.warn("Entrada sin nombre:", entry);
                        return Promise.resolve();
                    }

                    // Verificar caché
                    if (coordsCache[nombre]) {
                        addMarker(coordsCache[nombre], entry);
                        return Promise.resolve();
                    }

                    // Si no está en caché, geocodificar con retraso
                    return new Promise(resolve => {
                        setTimeout(() => {
                            fetch(`${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(nombre)}&format=json&limit=1`)
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
                                        coordsCache[nombre] = coords;
                                        localStorage.setItem('coordsCache', JSON.stringify(coordsCache));
                                        // Añadir marcador
                                        addMarker(coords, entry);
                                    } else {
                                        console.warn("No se encontró ubicación para:", nombre);
                                    }
                                    resolve();
                                })
                                .catch(err => {
                                    console.error("Error geocodificando:", nombre, err);
                                    // Reintentar después de un error
                                    setTimeout(() => {
                                        delete coordsCache[nombre];
                                        localStorage.setItem('coordsCache', JSON.stringify(coordsCache));
                                    }, 5000);
                                    resolve();
                                });
                        }, index * MapaDinamico.geocodingDelay);
                    });
                });

                // Esperar a que todas las geocodificaciones terminen
                Promise.all(geocodePromises).then(() => {
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