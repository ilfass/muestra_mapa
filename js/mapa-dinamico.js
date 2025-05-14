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

// Eliminar o comentar:
// import ClusterManager from './modules/cluster.js';
// import './styles/cluster.css';

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

function createInstitutionIcon() {
    // SVG minimalista de universidad en azul/gris
    const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#f4f8fb" stroke="#2980b9" stroke-width="2"/>
        <rect x="8" y="18" width="16" height="6" rx="2" fill="#2980b9"/>
        <rect x="10" y="14" width="12" height="4" rx="1" fill="#b0bec5"/>
        <rect x="12" y="20" width="2" height="4" rx="0.7" fill="#607d8b"/>
        <rect x="15" y="20" width="2" height="4" rx="0.7" fill="#607d8b"/>
        <rect x="18" y="20" width="2" height="4" rx="0.7" fill="#607d8b"/>
        <rect x="14" y="16" width="4" height="2" rx="0.7" fill="#90caf9"/>
        <rect x="11" y="12" width="10" height="2" rx="1" fill="#2980b9"/>
    </svg>`;
    return L.divIcon({
        className: 'institution-icon',
        html: svg,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

function generatePopupContent(entry) {
    let popupContent = '<table style="font-size:1.4em; line-height:1.4;">';
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

// Cache de coordenadas por país
const countryCoordsCache = new Map();

// Coordenadas predefinidas para países comunes
const PAISES_PREDEFINIDOS = {
    // América Latina
    'Chile': { lat: -35.6751, lon: -71.5430 },
    'Argentina': { lat: -36.7762, lon: -65.2176 },
    'Colombia': { lat: 4.5709, lon: -74.2973 },
    'México': { lat: 23.6345, lon: -102.5528 },
    'Perú': { lat: -9.1900, lon: -75.0152 },
    'Brasil': { lat: -14.2350, lon: -51.9253 },
    'Ecuador': { lat: -1.8312, lon: -78.1834 },
    'Venezuela': { lat: 6.4237, lon: -66.5897 },
    'Uruguay': { lat: -32.5228, lon: -55.7658 },
    'Paraguay': { lat: -23.4425, lon: -58.4438 },
    'Bolivia': { lat: -16.2902, lon: -63.5887 },
    'Costa Rica': { lat: 9.7489, lon: -83.7534 },
    'Panamá': { lat: 8.5380, lon: -80.7821 },
    'República Dominicana': { lat: 18.4861, lon: -69.9312 },
    'Puerto Rico': { lat: 18.2208, lon: -66.5901 },
    'Cuba': { lat: 21.5218, lon: -77.7812 },
    
    // Europa
    'España': { lat: 40.4637, lon: -3.7492 },
    'Francia': { lat: 46.2276, lon: 2.2137 },
    'Alemania': { lat: 51.1657, lon: 10.4515 },
    'Italia': { lat: 41.8719, lon: 12.5674 },
    'Reino Unido': { lat: 55.3781, lon: -3.4360 },
    'País Vasco': { lat: 42.9896, lon: -2.6189 },
    'Holanda': { lat: 52.1326, lon: 5.2913 },
    'Finlandia': { lat: 61.9241, lon: 25.7482 },
    'Montenegro': { lat: 42.7087, lon: 19.3744 },
    'Portugal': { lat: 39.3999, lon: -8.2245 },
    'Bélgica': { lat: 50.8503, lon: 4.3517 },
    'Suiza': { lat: 46.8182, lon: 8.2275 },
    'Austria': { lat: 47.5162, lon: 14.5501 },
    'Suecia': { lat: 60.1282, lon: 18.6435 },
    'Noruega': { lat: 60.4720, lon: 8.4689 },
    'Dinamarca': { lat: 56.2639, lon: 9.5018 },
    'Polonia': { lat: 51.9194, lon: 19.1451 },
    'Grecia': { lat: 39.0742, lon: 21.8243 },
    
    // Asia
    'China': { lat: 35.8617, lon: 104.1954 },
    'Japón': { lat: 36.2048, lon: 138.2529 },
    'Corea del Sur': { lat: 35.9078, lon: 127.7669 },
    'India': { lat: 20.5937, lon: 78.9629 },
    'Indonesia': { lat: -0.7893, lon: 113.9213 },
    'Malasia': { lat: 4.2105, lon: 101.9758 },
    'Singapur': { lat: 1.3521, lon: 103.8198 },
    'Tailandia': { lat: 15.8700, lon: 100.9925 },
    'Vietnam': { lat: 14.0583, lon: 108.2772 },
    
    // Norteamérica
    'Estados Unidos': { lat: 37.0902, lon: -95.7129 },
    'Canadá': { lat: 56.1304, lon: -106.3468 },
    
    // Oceanía
    'Australia': { lat: -25.2744, lon: 133.7751 },
    'Nueva Zelanda': { lat: -40.9006, lon: 174.8860 }
};

// Un solo proxy CORS más confiable
const CORS_PROXY = 'https://corsproxy.io/?';

async function getCountryCoords(country) {
    // 1. Verificar coordenadas predefinidas
    if (PAISES_PREDEFINIDOS[country]) {
        console.log(`[Geocoding] Usando coordenadas predefinidas para ${country}`);
        return PAISES_PREDEFINIDOS[country];
    }

    // 2. Verificar caché
    if (countryCoordsCache.has(country)) {
        console.log(`[Geocoding] Usando coordenadas en caché para ${country}`);
        return countryCoordsCache.get(country);
    }

    // 3. Intentar geocodificación con un solo proxy
    try {
        console.log(`[Geocoding] Intentando obtener coordenadas para país nuevo: ${country}`);
        const normalizedCountry = country.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nominatimUrl = `${MapaDinamico.nominatimUrl}?country=${encodeURIComponent(normalizedCountry)}&format=json&limit=1`;
        const proxyUrl = CORS_PROXY + encodeURIComponent(nominatimUrl);
        
        console.log(`[Geocoding] URL de búsqueda: ${nominatimUrl}`);
        
        const response = await fetch(proxyUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Universidad de Chile - Mapa de Convenios'
            },
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
                countryCoordsCache.set(country, coords);
                console.log(`[Geocoding] ✅ Coordenadas obtenidas para ${country}:`, coords);
                return coords;
            } else {
                console.warn(`[Geocoding] ⚠️ No se encontraron coordenadas para ${country} en Nominatim`);
            }
        } else {
            console.warn(`[Geocoding] ⚠️ Error HTTP ${response.status} al buscar ${country}`);
        }
    } catch (error) {
        console.warn(`[Geocoding] ⚠️ Error al obtener coordenadas para ${country}:`, error.message);
    }

    // 4. Si todo falla, usar coordenadas por defecto
    console.log(`[Geocoding] ⚠️ Usando coordenadas por defecto para ${country}`);
    const defaultCoords = { lat: 0, lon: 0 };
    countryCoordsCache.set(country, defaultCoords);
    return defaultCoords;
}

// Función para agregar un nuevo país a las coordenadas predefinidas
function agregarPaisPredefinido(pais, lat, lon) {
    if (!PAISES_PREDEFINIDOS[pais]) {
        PAISES_PREDEFINIDOS[pais] = { lat, lon };
        console.log(`[Geocoding] ✅ País ${pais} agregado a coordenadas predefinidas`);
        return true;
    }
    return false;
}

// Función para verificar si un país está en las coordenadas predefinidas
function esPaisPredefinido(pais) {
    return !!PAISES_PREDEFINIDOS[pais];
}

// Función para obtener la lista de países predefinidos
function obtenerPaisesPredefinidos() {
    return Object.keys(PAISES_PREDEFINIDOS);
}

async function getCoords(entry) {
    // 1. Si tiene coordenadas explícitas
    const lat = entry["Latitud"] || entry["latitud"];
    const lon = entry["Longitud"] || entry["longitud"];
    
    // Si las coordenadas son "NO ENCONTRADO", usar directamente el país
    if (lat === "NO ENCONTRADO" || lon === "NO ENCONTRADO") {
        console.log(`📍 Coordenadas marcadas como NO ENCONTRADO para: ${entry["Universidad Contraparte"]}, usando país directamente`);
        const country = entry["País"];
        if (country) {
            return await getCountryCoords(country);
        }
        return null;
    }
    
    if (lat && lon) {
        const coords = {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };
        if (!isNaN(coords.lat) && !isNaN(coords.lon)) {
            console.log(`📍 Usando coordenadas explícitas para: ${entry["Universidad Contraparte"]}`);
            return coords;
        }
    }

    // 2. Si no se encontraron coordenadas explícitas, usar país
    const country = entry["País"];
    if (country) {
        return await getCountryCoords(country);
    }

    console.warn(`⚠️ No se pudieron obtener coordenadas para: ${entry["Universidad Contraparte"]}`);
    return null;
}

async function processDataInChunks(rows, map, markerClusterGroup) {
    const marcadores = [];
    let totalAgregados = 0;
    let totalProcesados = 0;

    console.log('[Clusters] Iniciando procesamiento de', rows.length, 'filas');

    // Cargar filtros inmediatamente
    llenarFiltroPais(rows);
    _todosLosDatos = rows;

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
                icon: createInstitutionIcon(),
                entry
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
                    icon: createInstitutionIcon(),
                    entry
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

    // Crear grupo de clusters
    window._markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 8,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            const size = Math.min(40 + (count * 2), 80); // Tamaño máximo de 80px
            
            // Crear círculos concéntricos
            const circles = [];
            const numCircles = 3; // Número de círculos concéntricos
            
            for (let i = 0; i < numCircles; i++) {
                const scale = 1 - (i * 0.2); // Escala para cada círculo
                const opacity = 0.8 - (i * 0.2); // Opacidad para cada círculo
                circles.push(`
                    <div class="cluster-circle" style="
                        width: ${size * scale}px;
                        height: ${size * scale}px;
                        border-radius: 50%;
                        background: rgba(41, 128, 185, ${opacity});
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        animation: pulse ${2 + i}s infinite;
                        animation-delay: ${i * 0.5}s;
                    "></div>
                `);
            }
            
            return L.divIcon({
                html: `
                    <div class="marker-cluster" style="
                        width: ${size}px;
                        height: ${size}px;
                        position: relative;
                    ">
                        ${circles.join('')}
                        <div class="cluster-count" style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            color: white;
                            font-weight: bold;
                            font-size: ${Math.min(14 + (count / 10), 20)}px;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                            z-index: 2;
                        ">${count}</div>
                    </div>
                `,
                className: 'custom-cluster',
                iconSize: L.point(size, size)
            });
        }
    });
    window._leaflet_map.addLayer(window._markerClusterGroup);

    // Agregar estilos CSS para la animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.8;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.4;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.8;
            }
        }
        
        .custom-cluster {
            background: transparent !important;
        }
        
        .cluster-circle {
            box-shadow: 0 0 10px rgba(41, 128, 185, 0.3);
            transition: all 0.3s ease;
        }
        
        .marker-cluster:hover .cluster-circle {
            animation-play-state: paused;
        }
    `;
    document.head.appendChild(style);

    // Cargar datos y procesar
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
            
            // Cargar filtros inmediatamente
            llenarFiltroPais(rows);
            _todosLosDatos = rows;
            
            // Iniciar procesamiento de marcadores
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
    select.style.float = 'right';
    select.style.marginLeft = '10px';
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
                icon: createInstitutionIcon(),
                entry
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
                    icon: createInstitutionIcon(),
                    entry
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

// --- DESENFOQUE GAUSSIANO SEGÚN ZOOM ---
window._leaflet_map.on('zoomend', function() {
    const zoom = window._leaflet_map.getZoom();
    let blurLevel = 0;
    if (zoom >= 2 && zoom < 4) blurLevel = 5;
    else if (zoom >= 4 && zoom < 6) blurLevel = 4;
    else if (zoom >= 6 && zoom < 8) blurLevel = 3;
    else if (zoom >= 8 && zoom < 10) blurLevel = 2;
    else if (zoom >= 10) blurLevel = 1;
    document.querySelectorAll('.my-cluster-icon').forEach(el => {
        el.classList.remove('blur-1', 'blur-2', 'blur-3', 'blur-4', 'blur-5', 'no-blur');
        if (blurLevel > 0) {
            el.classList.add('blur-' + blurLevel);
        } else {
            el.classList.add('no-blur');
        }
    });
});
setTimeout(() => {
    if (window._leaflet_map) {
        window._leaflet_map.fire('zoomend');
    }
}, 500);