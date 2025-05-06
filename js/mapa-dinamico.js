/**
 * Mapa Dinámico - JS v1.0.7
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
        geocodingDelay: 2000, // Aumentado para evitar rate limiting
        nominatimUrl: 'https://nominatim.openstreetmap.org/search',
        maxRetries: 3, // Número máximo de reintentos
        chunkSize: 3 // Reducido para mejor manejo
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

    // Mostrar indicador de carga
    container.innerHTML = '<div class="loading">Cargando mapa...</div>';

    // Inicializar mapa con vista mundial
    const map = L.map(container).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Inicializar cluster de marcadores con configuración mejorada
    const markers = L.markerClusterGroup({
        maxClusterRadius: 20, // Reducido para clusters más pequeños
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 6, // Desactivar clustering en zoom cercano
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 50,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 100) size = 'large';
            else if (count > 10) size = 'medium';
            
            return L.divIcon({
                html: `<div class="cluster-count ${size}">${count}</div>`,
                className: 'marker-cluster',
                iconSize: L.point(40, 40)
            });
        }
    });
    map.addLayer(markers);

    // Cache de coordenadas desde localStorage
    const coordsCache = JSON.parse(localStorage.getItem('coordsCache') || '{}');
    let allMarkers = [];
    let isLoading = true;

    // Función para limpiar texto
    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // Función para actualizar el estado de carga
    function updateLoadingState(loading) {
        isLoading = loading;
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) {
            loadingEl.style.display = loading ? 'block' : 'none';
        }
    }

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
                        obj[cols[i]] = cleanText(cell?.v || "");
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

                // Función para procesar una universidad con reintentos
                function processUniversity(university, entry, retryCount = 0) {
                    if (!university) return Promise.resolve();
                    
                    // Verificar caché
                    if (coordsCache[university]) {
                        addMarker(coordsCache[university], entry, university);
                        return Promise.resolve();
                    }

                    // Si no está en caché, geocodificar
                    return new Promise(resolve => {
                        setTimeout(() => {
                            fetch(`${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(university)}&format=json&limit=1`, {
                                headers: {
                                    'User-Agent': 'MapaDinamico/1.0'
                                }
                            })
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
                                if (retryCount < MapaDinamico.maxRetries) {
                                    // Reintentar con un delay exponencial
                                    setTimeout(() => {
                                        processUniversity(university, entry, retryCount + 1)
                                            .then(resolve);
                                    }, Math.pow(2, retryCount) * MapaDinamico.geocodingDelay);
                                } else {
                                    resolve();
                                }
                            });
                        }, MapaDinamico.geocodingDelay);
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
                    if (isLoading) return; // No actualizar mientras carga
                    
                    const paisSeleccionado = selectPais.value;
                    const busqueda = cleanText(buscador.value);
                    
                    markers.clearLayers();
                    
                    allMarkers.forEach(({ marker, entry, searchText }) => {
                        const matchPais = !paisSeleccionado || entry["País"] === paisSeleccionado;
                        const matchBusqueda = !busqueda || searchText.includes(busqueda);
                        
                        if (matchPais && matchBusqueda) {
                            markers.addLayer(marker);
                        }
                    });
                }

                // Eventos de cambio en los filtros con debounce
                let searchTimeout;
                selectPais.addEventListener("change", updateMarkers);
                buscador.addEventListener("input", () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(updateMarkers, 300);
                });

                // Procesar cada entrada en chunks
                const chunks = [];
                for (let i = 0; i < rows.length; i += MapaDinamico.chunkSize) {
                    chunks.push(rows.slice(i, i + MapaDinamico.chunkSize));
                }

                let processedChunks = 0;
                function processNextChunk() {
                    if (processedChunks >= chunks.length) {
                        console.log("Todas las geocodificaciones completadas");
                        updateLoadingState(false);
                        updateMarkers(); // Actualizar marcadores al terminar
                        return;
                    }

                    const chunk = chunks[processedChunks];
                    const promises = chunk.map(entry => {
                        const universities = entry["Universidad contraparte"]?.split(/\s*,\s*|\s*y\s*/) || [];
                        return Promise.all(universities.map(univ => 
                            processUniversity(univ.trim(), entry)
                        ));
                    });

                    Promise.all(promises)
                        .then(() => {
                            processedChunks++;
                            processNextChunk();
                        })
                        .catch(err => {
                            console.error("Error procesando chunk:", err);
                            processedChunks++;
                            processNextChunk();
                        });
                }

                // Iniciar procesamiento
                processNextChunk();

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
            updateLoadingState(false);
        });
}); 