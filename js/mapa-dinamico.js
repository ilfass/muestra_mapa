/**
 * Mapa Dinámico - JS v1.1.0
 * 
 * Características:
 * - Carga datos desde Google Sheets usando el endpoint gviz/tq
 * - Geolocalización automática con Nominatim
 * - Sistema de caché para coordenadas en localStorage
 * - Filtros por país y búsqueda por texto
 * - Clustering de marcadores cercanos
 * - Manejo de errores robusto
 * - Detección automática del campo a geocodificar
 * - Separación robusta de múltiples valores
 * - Logs detallados para depuración
 */

// Verificar que la variable global esté disponible
if (typeof MapaDinamico === 'undefined') {
    console.error('La variable global MapaDinamico no está definida');
    MapaDinamico = {
        geocodingDelay: 2000,
        nominatimUrl: 'https://nominatim.openstreetmap.org/search',
        maxRetries: 3,
        chunkSize: 3,
        debug: true // Activar modo debug
    };
}

// Función de log condicional
function debugLog(...args) {
    if (MapaDinamico.debug) {
        console.log('[MapaDinamico]', ...args);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    debugLog('Iniciando carga del mapa...');
    
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

    debugLog('Sheet ID:', sheetId);

    // Mostrar indicador de carga
    container.innerHTML = '<div class="loading">Cargando mapa...</div>';

    // Inicializar mapa con vista mundial
    const map = L.map(container).setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Inicializar cluster de marcadores con configuración mejorada
    const markers = L.markerClusterGroup({
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 6,
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

    // Detección genérica del campo a geocodificar
    function getGeoFieldName(cols) {
        const posibles = [
            'universidad contraparte', 'universidad', 'dirección', 'direccion', 'ubicacion', 'ubicación', 'partner', 'institución', 'institucion', 'address', 'location'
        ];
        for (let posible of posibles) {
            const col = cols.find(c => c.toLowerCase().includes(posible));
            if (col) return col;
        }
        // Si no encuentra, usar la primera columna que no sea año, país, nombre, facultad, equipo, ods, resumen
        return cols.find(c => !/año|pais|país|nombre|facultad|equipo|ods|resumen/i.test(c)) || cols[0];
    }

    // Cargar datos de la hoja usando el endpoint gviz/tq
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    debugLog('URL del sheet:', sheetUrl);
    
    fetch(sheetUrl)
        .then(res => {
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            return res.text();
        })
        .then(text => {
            try {
                debugLog('Respuesta raw del sheet:', text.substring(0, 200) + '...');
                
                const json = JSON.parse(text.substr(47).slice(0, -2));
                const cols = json.table.cols.map(col => col.label);
                debugLog('Columnas del sheet:', cols);
                const geoField = getGeoFieldName(cols);
                debugLog('Campo a geocodificar detectado:', geoField);
                
                const rows = json.table.rows.map(row => {
                    const obj = {};
                    row.c.forEach((cell, i) => {
                        obj[cols[i]] = cleanText(cell?.v || "");
                    });
                    return obj;
                });

                debugLog('Datos procesados:', rows);

                // Llenar select de países
                const paises = [...new Set(rows.map(row => row["País"] || row["pais"]).filter(Boolean))].sort();
                debugLog('Países encontrados:', paises);
                
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
                    
                    debugLog('Procesando para geocodificar:', { campo: geoField, valor: university, entry });
                    debugLog('Datos de la entrada:', entry);
                    
                    // Verificar caché
                    if (coordsCache[university]) {
                        debugLog('Coordenadas encontradas en caché:', coordsCache[university]);
                        addMarker(coordsCache[university], entry, university);
                        return Promise.resolve();
                    }

                    // Si no está en caché, geocodificar
                    return new Promise(resolve => {
                        setTimeout(() => {
                            const searchUrl = `${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(university)}&format=json&limit=1`;
                            debugLog('Buscando en Nominatim:', searchUrl);
                            
                            fetch(searchUrl, {
                                headers: {
                                    'User-Agent': 'MapaDinamico/1.0'
                                }
                            })
                            .then(res => {
                                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                                return res.json();
                            })
                            .then(data => {
                                debugLog('Respuesta de Nominatim:', data);
                                
                                if (data.length) {
                                    const coords = {
                                        lat: parseFloat(data[0].lat),
                                        lng: parseFloat(data[0].lon)
                                    };
                                    debugLog('Coordenadas encontradas:', coords);
                                    
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
                                    debugLog(`Reintentando (${retryCount + 1}/${MapaDinamico.maxRetries})...`);
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
                    debugLog('Añadiendo marcador:', { coords, university });
                    
                    const popupContent = `
                        <div class="info">
                            <h4>${university}</h4>
                            ${Object.entries(entry)
                                .filter(([key, val]) => val && key !== geoField && key !== "Nombre")
                                .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
                                .join("<br>")}
                        </div>
                    `;
                    
                    const marker = L.marker([coords.lat, coords.lng])
                        .bindPopup(popupContent);
                    
                    allMarkers.push({
                        marker,
                        entry,
                        searchText: `${university} ${(entry["País"] || entry["pais"] || "")}`.toLowerCase()
                    });
                    
                    markers.addLayer(marker);
                }

                // Función para actualizar marcadores según filtros
                function updateMarkers() {
                    if (isLoading) return;
                    
                    const paisSeleccionado = selectPais.value;
                    const busqueda = buscador.value.trim().toLowerCase();
                    
                    debugLog('Actualizando marcadores:', { paisSeleccionado, busqueda });
                    
                    markers.clearLayers();
                    
                    allMarkers.forEach(({ marker, entry, searchText }) => {
                        const matchPais = !paisSeleccionado || (entry["País"] || entry["pais"]) === paisSeleccionado;
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

                debugLog('Total de chunks a procesar:', chunks.length);

                let processedChunks = 0;
                function processNextChunk() {
                    if (processedChunks >= chunks.length) {
                        debugLog("Todas las geocodificaciones completadas");
                        updateLoadingState(false);
                        updateMarkers();
                        return;
                    }

                    debugLog(`Procesando chunk ${processedChunks + 1}/${chunks.length}`);
                    const chunk = chunks[processedChunks];
                    const promises = chunk.map(entry => {
                        // Separar múltiples valores por coma, salto de línea, punto y coma, barra, y, etc.
                        let raw = entry[geoField] || '';
                        let universities = raw.split(/,|;|\n|\||\/| y | Y |\s{2,}/).map(u => cleanText(u)).filter(Boolean);
                        debugLog('Valores a geocodificar en esta fila:', universities);
                        return Promise.all(universities.map(univ => 
                            processUniversity(univ, entry)
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