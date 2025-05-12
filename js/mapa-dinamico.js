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
        
        return await response.json();
    } catch (error) {
        debugLog(`⚠️ Proxy ${proxyIndex + 1} falló, intentando siguiente...`);
        return tryWithProxy(url, proxyIndex + 1);
    }
}

async function geocodeAddress(query, retries = 0) {
    // Verificar caché primero
    const cached = CoordenadasCache.get(query);
    if (cached) {
        debugLog('📍 Usando coordenadas en caché para:', query);
        return cached;
    }

    const nominatimUrl = `${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    debugLog('🔍 Geocodificando:', query);
    try {
        const data = await tryWithProxy(nominatimUrl);
        if (data && data.length > 0) {
            const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            CoordenadasCache.set(query, coords);
            return coords;
        }
    } catch (error) {
        if (retries < MapaDinamico.maxRetries) {
            const delay = Math.min(500 * Math.pow(2, retries), 5000);
            debugLog(`⚠️ Reintentando geocodificación (${retries + 1}/${MapaDinamico.maxRetries}) después de ${delay}ms: ${query}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return geocodeAddress(query, retries + 1);
        } else {
            console.error('❌ Falló la geocodificación después de', MapaDinamico.maxRetries, 'intentos:', query, error);
            return null;
        }
    }
    return null;
}

async function processDataInChunks(rows, map, markerClusterGroup) {
    const chunks = [];
    for (let i = 0; i < rows.length; i += MapaDinamico.chunkSize) {
        chunks.push(rows.slice(i, i + MapaDinamico.chunkSize));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (entry) => {
            const pais = entry["País"];
            const lat = entry["Latitud"] || entry["latitud"];
            const lon = entry["Longitud"] || entry["longitud"];
            
            if (!lat && !lon && !pais) return; // No hay datos suficientes, salta

            const coords = await getCoords(entry);
            if (coords) {
                const color = colorFromString(entry["País"] || nombreUni);
                const marker = L.marker([coords.lat, coords.lon], {
                    icon: createColoredIcon(color)
                }).bindPopup(generatePopupContent(entry));
                
                markerClusterGroup.addLayer(marker);
            }
        }));
        
        // Pequeña pausa entre chunks para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, MapaDinamico.geocodingDelay));
    }
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

    // Configurar clustering
    const markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: MapaDinamico.maxClusterRadius,
        spiderfyOnMaxZoom: MapaDinamico.spiderfyOnMaxZoom,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    window._leaflet_map.addLayer(markerClusterGroup);

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

            processDataInChunks(rows, window._leaflet_map, markerClusterGroup);
        })
        .catch(err => console.error(err));
}

function iniciarObserver() {
    const target = document.body;
    if (!target) {
        // Esperar a que el DOM esté listo
        if (document.readyState === "loading") {
            document.addEventListener('DOMContentLoaded', iniciarObserver);
        } else {
            // Si el DOM ya está interactivo/completo, reintentar
            setTimeout(iniciarObserver, 50);
        }
        return;
    }
    const observer = new MutationObserver(() => {
        if (document.getElementById("mapa-dinamico-container")) {
            observer.disconnect();
            iniciarMapaDinamico();
        }
    });
    observer.observe(target, { childList: true, subtree: true });
}

function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(() => {
    if (document.getElementById("mapa-dinamico-container")) {
        iniciarMapaDinamico();
    } else {
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

async function getCoords(entry) {
    let coords = null;

    // 1. Si tiene coordenadas explícitas
    const lat = entry["latitud"];
    const lon = entry["longitud"];
    if (lat && lon) {
        coords = {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };
        if (!isNaN(coords.lat) && !isNaN(coords.lon)) {
            Logger.info(`📍 Usando coordenadas de lat/lon para: ${entry["Universidad Contraparte"] || entry["País"] || "Sin nombre"}`);
            return coords;
        }
    }

    // 2. Si tiene enlace a OpenStreetMap con mlat/mlon
    const osmLink = entry["Enlace a OpenStreetMap"];
    if (osmLink) {
        coords = extractCoordsFromOSM(osmLink);
        if (coords) {
            Logger.info(`📍 Usando coordenadas de OpenStreetMap para: ${entry["Universidad Contraparte"]}`);
            return coords;
        }
    }

    // 3. Si no se encontró nada, usar país (requiere geocodificación)
    const country = entry["País"];
    if (country) {
        try {
            coords = await this.getCountryCoords(country);
            if (coords) {
                Logger.info(`📍 Usando coordenadas del país para: ${entry["Universidad Contraparte"] || country}`);
                return coords;
            }
        } catch (error) {
            Logger.error(`❌ Error al obtener coordenadas del país ${country}:`, error);
        }
    }

    // 4. Si tampoco se encuentra, mostrar error
    Logger.warn(`⚠️ No se pudieron obtener coordenadas para: ${entry["Universidad Contraparte"]}`);
    return null;
}

async function getCountryCoords(country) {
    const nominatimUrl = `${MapaDinamico.nominatimUrl}?country=${encodeURIComponent(country)}&format=json&limit=1`;
    
    try {
        const data = await tryWithProxy(nominatimUrl);
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        Logger.error(`❌ Error al obtener coordenadas del país ${country}:`, error);
    }
    return null;
} 