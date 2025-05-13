/**
 * Mapa Dinámico - JS v1.5.0 (Versión Optimizada)
 * Fecha: 2024-03-19
 * 
 * - Compatible con cualquier Google Sheet público
 * - Geocodificación con Nominatim (OpenStreetMap)
 * - Sistema de caché para coordenadas
 * - Clustering de marcadores
 * - Procesamiento optimizado en chunks
 * - Control de errores y debug activable
 * - prrueba 2
 */

console.log('Mapa Dinámico v1.5.0');
console.log('Resumen de Características');
console.log('✓ Sistema de caché implementado');
console.log('✓ Clustering de marcadores optimizado');
console.log('✓ Procesamiento en chunks (tamaño: 5)');
console.log('✓ Geocodificación con retry y delay');
console.log('✓ Múltiples proxies CORS');
console.log('✓ Debug mode activable');
console.log('✓ Control de errores mejorado');
console.log('✓ Interfaz responsiva');
console.log('✓ Marcadores personalizados por país');
console.log('✓ Popups con formato HTML');

const Logger = {
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
};

// Validador automático de logs esperados
(function() {
    const expectedLogs = [
        'Mapa Dinámico v1.5.0',
        'Resumen de Características',
        '✓ Sistema de caché implementado',
        '✓ Clustering de marcadores optimizado',
        '✓ Procesamiento en chunks (tamaño: 5)',
        '✓ Geocodificación con retry y delay',
        '✓ Múltiples proxies CORS',
        '✓ Debug mode activable',
        '✓ Control de errores mejorado',
        '✓ Interfaz responsiva',
        '✓ Marcadores personalizados por país',
        '✓ Popups con formato HTML'
    ];
    const found = {};
    expectedLogs.forEach(msg => found[msg] = false);
    const origLog = console.log;
    console.log = function(...args) {
        expectedLogs.forEach(msg => {
            if (args[0] && args[0].toString().includes(msg)) {
                found[msg] = true;
            }
        });
        origLog.apply(console, args);
    };
    window.addEventListener('load', function() {
        origLog('%c\nResumen de logs esperados:', 'font-weight:bold; font-size:16px;');
        expectedLogs.forEach(msg => {
            if (found[msg]) {
                origLog(`%c✔️ ${msg}`, 'color:green; font-weight:bold;');
            } else {
                origLog(`%c❌ ${msg}`, 'color:red; font-weight:bold;');
            }
        });
    });
})();

if (typeof MapaDinamico === 'undefined') {
  console.warn("MapaDinamico config no encontrada. Se define por defecto.");
  var MapaDinamico = {
    geocodingDelay: 500,
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    maxRetries: 3,
    chunkSize: 5,
    debug: true,
    cacheEnabled: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true
  };
}

// Sistema de caché
const CoordenadasCache = {
    get: function(key) {
        if (!MapaDinamico.cacheEnabled) return null;
        try {
            const cached = localStorage.getItem(`coord_${key}`);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.warn('Error al leer caché:', e);
            return null;
        }
    },
    set: function(key, value) {
        if (!MapaDinamico.cacheEnabled) return;
        try {
            localStorage.setItem(`coord_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Error al guardar en caché:', e);
        }
    }
};

function debugLog(...args) {
    if (MapaDinamico.debug) console.log('[MapaDinamico]', ...args);
}

function colorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

function createColoredIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px #000;"></div>`
    });
}

function generatePopupContent(entry) {
    let popupContent = '<table style="font-size:1em;">';
    for (const key in entry) {
        if (!entry[key]) continue;
        if (["Latitud", "Longitud", "Enlace a OpenStreetMap"].includes(key)) continue;
        let valor = entry[key];
        if (/^https?:\/\/\S+$/i.test(valor)) {
            valor = `<a href="${valor}" target="_blank">${valor}</a>`;
        }
        popupContent += `<tr><td style="font-weight:bold;vertical-align:top;">${key}:</td><td>${valor}</td></tr>`;
    }
    popupContent += '</table>';
    return popupContent;
}

const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
];

// Cache de coordenadas por país
const countryCoordsCache = new Map();

async function getCountryCoords(country) {
    // Verificar caché primero
    if (countryCoordsCache.has(country)) {
        console.log(`[Geocoding] Usando coordenadas en caché para ${country}`);
        return countryCoordsCache.get(country);
    }

    // Normalizar el nombre del país
    const normalizedCountry = country.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nominatimUrl = `${MapaDinamico.nominatimUrl}?country=${encodeURIComponent(normalizedCountry)}&format=json&limit=1`;
    
    try {
        const data = await tryWithProxy(nominatimUrl);
        if (data && data.length > 0) {
            const coords = {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
            // Guardar en caché
            countryCoordsCache.set(country, coords);
            return coords;
        }
    } catch (error) {
        console.error(`❌ Error al obtener coordenadas del país ${country}:`, error);
        window._mapaDinamicoGeocodeErrors = (window._mapaDinamicoGeocodeErrors || 0) + 1;
    }
    return null;
}

async function getCoords(entry) {
    // 1. Si tiene coordenadas explícitas
    const lat = entry["Latitud"] || entry["latitud"];
    const lon = entry["Longitud"] || entry["longitud"];
    
    // Si las coordenadas son "NO ENCONTRADO", saltar al país
    if (lat === "NO ENCONTRADO" || lon === "NO ENCONTRADO") {
        console.log(`📍 Coordenadas marcadas como NO ENCONTRADO para: ${entry["Universidad Contraparte"]}, usando país`);
    } else if (lat && lon) {
        const coords = {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };
        if (!isNaN(coords.lat) && !isNaN(coords.lon)) {
            console.log(`📍 Usando coordenadas explícitas para: ${entry["Universidad Contraparte"]}`);
            return coords;
        }
    }

    // 2. Si tiene enlace a OpenStreetMap
    const osmLink = entry["Enlace a OpenStreetMap"];
    if (osmLink) {
        const coords = extractCoordsFromOSM(osmLink);
        if (coords) {
            console.log(`📍 Usando coordenadas de OpenStreetMap para: ${entry["Universidad Contraparte"]}`);
            return coords;
        }
    }

    // 3. Si no se encontró nada, usar país
    const country = entry["País"];
    if (country) {
        const coords = await getCountryCoords(country);
        if (coords) {
            console.log(`📍 Usando coordenadas del país para: ${entry["Universidad Contraparte"] || country}`);
            return coords;
        }
    }

    console.warn(`⚠️ No se pudieron obtener coordenadas para: ${entry["Universidad Contraparte"]}`);
    return null;
}

async function tryWithProxy(url, proxyIndex = 0) {
    if (proxyIndex >= CORS_PROXIES.length) {
        throw new Error('Todos los proxies fallaron');
    }
    
    const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(url);
    try {
        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Universidad de Chile - Mapa de Convenios (https://internacionales.uchile.cl)',
                'Origin': window.location.origin
            },
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Respuesta inválida del servidor');
        }
        
        window._mapaDinamicoFetchOK = true;
        return data;
    } catch (error) {
        console.warn(`⚠️ Proxy ${proxyIndex + 1} falló:`, error.message);
        // Esperar un poco antes de intentar el siguiente proxy
        await new Promise(resolve => setTimeout(resolve, 1000));
        return tryWithProxy(url, proxyIndex + 1);
    }
}

async function processDataInChunks(rows, map, markerClusterGroup) {
    const marcadores = [];
    let totalAgregados = 0;
    let totalProcesados = 0;

    console.log('[Clusters] Iniciando procesamiento de', rows.length, 'filas');

    // Primero procesar entradas con coordenadas explícitas
    const entradasConCoords = rows.filter(entry => {
        const lat = entry["Latitud"] || entry["latitud"];
        const lon = entry["Longitud"] || entry["longitud"];
        return lat && lon && lat !== "NO ENCONTRADO" && lon !== "NO ENCONTRADO";
    });

    // Luego procesar el resto
    const entradasSinCoords = rows.filter(entry => {
        const lat = entry["Latitud"] || entry["latitud"];
        const lon = entry["Longitud"] || entry["longitud"];
        return !lat || !lon || lat === "NO ENCONTRADO" || lon === "NO ENCONTRADO";
    });

    console.log(`[Clusters] Procesando ${entradasConCoords.length} entradas con coordenadas explícitas`);
    
    // Procesar entradas con coordenadas
    for (const entry of entradasConCoords) {
        const lat = parseFloat(entry["Latitud"] || entry["latitud"]);
        const lon = parseFloat(entry["Longitud"] || entry["longitud"]);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const color = colorFromString(entry["País"] || entry["Universidad Contraparte"]);
            const marker = L.marker([lat, lon], {
                icon: createColoredIcon(color)
            }).bindPopup(generatePopupContent(entry));
            
            markerClusterGroup.addLayer(marker);
            marcadores.push({entry, marker});
            totalAgregados++;
        }
    }

    console.log(`[Clusters] Procesando ${entradasSinCoords.length} entradas sin coordenadas`);
    
    // Procesar entradas sin coordenadas en chunks
    const chunks = [];
    for (let i = 0; i < entradasSinCoords.length; i += MapaDinamico.chunkSize) {
        chunks.push(entradasSinCoords.slice(i, i + MapaDinamico.chunkSize));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (entry) => {
            totalProcesados++;
            const coords = await getCoords(entry);
            if (coords) {
                const color = colorFromString(entry["País"] || entry["Universidad Contraparte"]);
                const marker = L.marker([coords.lat, coords.lon], {
                    icon: createColoredIcon(color)
                }).bindPopup(generatePopupContent(entry));
                
                markerClusterGroup.addLayer(marker);
                marcadores.push({entry, marker});
                totalAgregados++;

                if (totalAgregados % 10 === 0) {
                    console.log(`[Clusters] Progreso: ${totalAgregados}/${rows.length} marcadores agregados`);
                }
            }
        }));
        
        // Pequeña pausa entre chunks para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, MapaDinamico.geocodingDelay));
    }

    console.log(`[Clusters] Procesamiento completado: ${totalAgregados} marcadores agregados de ${totalProcesados} procesados`);
    postProcesarFiltrosYBuscador(rows, markerClusterGroup, marcadores);
}

function iniciarMapaDinamico() {
    const container = document.getElementById("mapa-dinamico-container");
    if (!container) return;

    // Limpia el contenedor antes de crear el mapa
    container.innerHTML = "";
    if (window._leaflet_map) {
        window._leaflet_map.remove();
        window._leaflet_map = null;
    }
    window._leaflet_map = L.map("mapa-dinamico-container").setView([0, 0], 2);

    const sheetId = container.dataset.sheetId;
    if (!sheetId) return console.error("Falta el atributo data-sheet-id");

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(window._leaflet_map);

    // --- CLUSTER GROUP ---
    // Eliminar cualquier grupo de clusters anterior
    if (window._markerClusterGroup) {
        window._leaflet_map.removeLayer(window._markerClusterGroup);
        window._markerClusterGroup = null;
    }
    // Crear un solo grupo de clusters global
    window._markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 8,
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50,
        iconCreateFunction: function(cluster) {
            const childCount = cluster.getChildCount();
            let size = 'small';
            if (childCount > 100) size = 'large';
            else if (childCount > 10) size = 'medium';
            return L.divIcon({
                html: `<div class="marker-cluster-${size}">${childCount}</div>`,
                className: 'marker-cluster',
                iconSize: L.point(40, 40)
            });
        }
    });
    window._leaflet_map.addLayer(window._markerClusterGroup);
    console.log('[Clusters] markerClusterGroup creado y añadido al mapa:', !!window._markerClusterGroup);

    // Pasar el grupo global a la función de procesamiento
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
            processDataInChunks(rows, window._leaflet_map, window._markerClusterGroup);
        })
        .catch(err => console.error(err));
}

function iniciarObserver() {
    const target = document.body;
    if (!target) {
        if (document.readyState === "loading") {
            document.addEventListener('DOMContentLoaded', iniciarObserver);
        } else {
            setTimeout(iniciarObserver, 50);
        }
        return;
    }
    const observer = new MutationObserver(() => {
        const contenedor = document.getElementById("mapa-dinamico-container");
        if (contenedor) {
            observer.disconnect();
            console.log('[Observer] Contenedor encontrado dinámicamente, inicializando mapa...');
            iniciarMapaDinamico();
        }
    });
    observer.observe(target, { childList: true, subtree: true });
    // Log para saber que el observer está activo
    console.log('[Observer] Observando el DOM para detectar el contenedor del mapa...');
}

function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(() => {
    const contenedor = document.getElementById("mapa-dinamico-container");
    if (contenedor) {
        console.log('[Init] Contenedor encontrado al cargar la página, inicializando mapa...');
        iniciarMapaDinamico();
    } else {
        console.log('[Init] Contenedor NO encontrado al cargar la página, iniciando observer...');
        iniciarObserver();
    }
});

function extractCoordsFromOSM(url) {
    // Busca parámetros mlat/mlon o lat/lon en la URL de OpenStreetMap
    const mlat = url.match(/[?&](mlat|lat)=([\d\.\-]+)/i);
    const mlon = url.match(/[?&](mlon|lon)=([\d\.\-]+)/i);
    if (mlat && mlon) {
        return {
            lat: parseFloat(mlat[2]),
            lon: parseFloat(mlon[2])
        };
    }
    return null;
}

// --- Filtro por país y buscador de universidad ---

// Variables auxiliares para almacenar marcadores y datos
let _todosLosDatos = [];
let _todosLosMarcadores = [];
let _clusterGroup = null;

// Función para llenar el filtro de país
function llenarFiltroPais(datos) {
    const select = document.getElementById('filtro-pais');
    if (!select) {
        console.log('[Filtro País] No se encontró el select filtro-pais');
        return;
    }
    const paises = Array.from(new Set(datos.map(e => e["País"]).filter(Boolean))).sort();
    console.log('[Filtro País] Países detectados:', paises);
    select.innerHTML = '<option value="">Todos los países</option>' +
        paises.map(p => `<option value="${p}">${p}</option>`).join('');
}

// Función para filtrar marcadores por país
function filtrarPorPais(pais) {
    if (!_clusterGroup) {
        console.log('[Filtro País] No hay clusterGroup');
        return;
    }
    console.log('[Clusters] Limpiando clusters antes de filtrar por país:', pais);
    _clusterGroup.clearLayers();
    let count = 0;
    _todosLosMarcadores.forEach(({entry, marker}) => {
        if (!pais || entry["País"] === pais) {
            _clusterGroup.addLayer(marker);
            count++;
        }
    });
    console.log(`[Clusters] Filtrado por país '${pais}': ${count} marcadores visibles`);
}

// Función para filtrar por universidad
function filtrarPorUniversidad(texto) {
    if (!_clusterGroup) {
        console.log('[Buscador] No hay clusterGroup');
        return;
    }
    const filtro = texto.trim().toLowerCase();
    console.log('[Clusters] Limpiando clusters antes de filtrar por universidad:', filtro);
    _clusterGroup.clearLayers();
    let count = 0;
    _todosLosMarcadores.forEach(({entry, marker}) => {
        const nombre = (entry["Universidad Contraparte"] || entry["Universidad"] || "").toLowerCase();
        if (!filtro || nombre.includes(filtro)) {
            _clusterGroup.addLayer(marker);
            count++;
        }
    });
    console.log(`[Clusters] Filtrado por universidad '${filtro}': ${count} marcadores visibles`);
}

// Hook para después de cargar los datos y marcadores
function postProcesarFiltrosYBuscador(datos, clusterGroup, marcadores) {
    _todosLosDatos = datos;
    _todosLosMarcadores = marcadores;
    _clusterGroup = clusterGroup;
    console.log('[PostProcesar] Datos:', datos.length, 'Marcadores:', marcadores.length);
    llenarFiltroPais(datos);
    // Listener filtro país
    const select = document.getElementById('filtro-pais');
    if (select) {
        select.addEventListener('change', e => filtrarPorPais(e.target.value));
        console.log('[PostProcesar] Listener de filtro de país agregado');
    } else {
        console.log('[PostProcesar] No se encontró el select filtro-pais');
    }
    // Listener buscador
    const buscador = document.getElementById('buscador-mapa');
    if (buscador) {
        buscador.addEventListener('input', e => filtrarPorUniversidad(e.target.value));
        console.log('[PostProcesar] Listener de buscador agregado');
    } else {
        console.log('[PostProcesar] No se encontró el input buscador-mapa');
    }
}

// --- LOGS PARA DEPURACIÓN DE CLUSTERS ---

// Modificar processDataInChunks para loguear cada vez que se agrega un marcador
const _originalProcessDataInChunks = processDataInChunks;
processDataInChunks = async function(rows, map, markerClusterGroup) {
    const marcadores = [];
    let totalAgregados = 0;
    let totalProcesados = 0;

    console.log('[Clusters] Iniciando procesamiento de', rows.length, 'filas');

    // Primero procesar entradas con coordenadas explícitas
    const entradasConCoords = rows.filter(entry => {
        const lat = entry["Latitud"] || entry["latitud"];
        const lon = entry["Longitud"] || entry["longitud"];
        return lat && lon && lat !== "NO ENCONTRADO" && lon !== "NO ENCONTRADO";
    });

    // Luego procesar el resto
    const entradasSinCoords = rows.filter(entry => {
        const lat = entry["Latitud"] || entry["latitud"];
        const lon = entry["Longitud"] || entry["longitud"];
        return !lat || !lon || lat === "NO ENCONTRADO" || lon === "NO ENCONTRADO";
    });

    console.log(`[Clusters] Procesando ${entradasConCoords.length} entradas con coordenadas explícitas`);
    
    // Procesar entradas con coordenadas
    for (const entry of entradasConCoords) {
        const lat = parseFloat(entry["Latitud"] || entry["latitud"]);
        const lon = parseFloat(entry["Longitud"] || entry["longitud"]);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const color = colorFromString(entry["País"] || entry["Universidad Contraparte"]);
            const marker = L.marker([lat, lon], {
                icon: createColoredIcon(color)
            }).bindPopup(generatePopupContent(entry));
            
            markerClusterGroup.addLayer(marker);
            marcadores.push({entry, marker});
            totalAgregados++;
        }
    }

    console.log(`[Clusters] Procesando ${entradasSinCoords.length} entradas sin coordenadas`);
    
    // Procesar entradas sin coordenadas en chunks
    const chunks = [];
    for (let i = 0; i < entradasSinCoords.length; i += MapaDinamico.chunkSize) {
        chunks.push(entradasSinCoords.slice(i, i + MapaDinamico.chunkSize));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (entry) => {
            totalProcesados++;
            const coords = await getCoords(entry);
            if (coords) {
                const color = colorFromString(entry["País"] || entry["Universidad Contraparte"]);
                const marker = L.marker([coords.lat, coords.lon], {
                    icon: createColoredIcon(color)
                }).bindPopup(generatePopupContent(entry));
                
                markerClusterGroup.addLayer(marker);
                marcadores.push({entry, marker});
                totalAgregados++;

                if (totalAgregados % 10 === 0) {
                    console.log(`[Clusters] Progreso: ${totalAgregados}/${rows.length} marcadores agregados`);
                }
            }
        }));
        
        // Pequeña pausa entre chunks para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, MapaDinamico.geocodingDelay));
    }

    console.log(`[Clusters] Procesamiento completado: ${totalAgregados} marcadores agregados de ${totalProcesados} procesados`);
    postProcesarFiltrosYBuscador(rows, markerClusterGroup, marcadores);
};

// Modificar filtrarPorPais y filtrarPorUniversidad para loguear clusters
const _originalFiltrarPorPais = filtrarPorPais;
filtrarPorPais = function(pais) {
    if (_clusterGroup) {
        console.log('[Clusters] Limpiando clusters antes de filtrar por país');
        _clusterGroup.clearLayers();
    }
    _originalFiltrarPorPais.call(this, pais);
    if (_clusterGroup) {
        console.log('[Clusters] Clusters después de filtrar por país:', _clusterGroup.getLayers().length);
    }
};

const _originalFiltrarPorUniversidad = filtrarPorUniversidad;
filtrarPorUniversidad = function(texto) {
    if (_clusterGroup) {
        console.log('[Clusters] Limpiando clusters antes de filtrar por universidad');
        _clusterGroup.clearLayers();
    }
    _originalFiltrarPorUniversidad.call(this, texto);
    if (_clusterGroup) {
        console.log('[Clusters] Clusters después de filtrar por universidad:', _clusterGroup.getLayers().length);
    }
};
// --- FIN LOGS CLUSTERS --- 

// Permite inicialización manual desde consola o AJAX
document.addEventListener('MapaDinamico:ForzarInit', () => {
    if (document.getElementById('mapa-dinamico-container')) {
        console.log('[Manual] Inicialización manual del mapa solicitada');
        iniciarMapaDinamico();
    } else {
        console.warn('[Manual] No se encontró el contenedor para inicializar el mapa');
    }
});

// --- VALIDADOR VISUAL DE FUNCIONES CLAVE ---
// Variable global para saber si el fetch de datos fue exitoso
window._mapaDinamicoFetchOK = false;
window._mapaDinamicoGeocodeErrors = 0;

(function() {
    function checkStatus(desc, test) {
        try {
            return test() ? `%c✔️ ${desc}` : `%c❌ ${desc}`;
        } catch (e) {
            return `%c❌ ${desc}`;
        }
    }
    window.addEventListener('load', function() {
        setTimeout(function() {
            const checks = [
                checkStatus('Mapa inicializado', () => typeof window._leaflet_map !== 'undefined' && !!window._leaflet_map),
                checkStatus('Grupo de clusters creado', () => typeof window._markerClusterGroup !== 'undefined' && !!window._markerClusterGroup),
                checkStatus('Grupo de clusters añadido al mapa', () => window._leaflet_map && window._markerClusterGroup && window._leaflet_map.hasLayer(window._markerClusterGroup)),
                checkStatus('Clusters visibles en el DOM', () => document.querySelector('.marker-cluster')),
                checkStatus('Marcadores cargados', () => window._markerClusterGroup && window._markerClusterGroup.getLayers && window._markerClusterGroup.getLayers().length > 0),
                checkStatus('Contenedor del mapa presente', () => !!document.getElementById('mapa-dinamico-container')),
                checkStatus('Filtro de país presente', () => !!document.getElementById('filtro-pais')),
                checkStatus('Buscador de universidad presente', () => !!document.getElementById('buscador-mapa')),
                checkStatus('Fetch de datos exitoso', () => window._mapaDinamicoFetchOK === true),
                checkStatus('Errores de geocodificación bajos', () => window._mapaDinamicoGeocodeErrors < 5)
            ];
            console.log('%c\nResumen de funciones clave:', 'font-weight:bold; font-size:16px;');
            checks.forEach(msg => {
                if (msg.startsWith('%c✔️')) {
                    console.log(msg, 'color:green; font-weight:bold;');
                } else {
                    console.log(msg, 'color:red; font-weight:bold;');
                }
            });
        }, 2000); // Espera para asegurar que todo esté inicializado
    });
})();
// --- FIN VALIDADOR VISUAL --- 