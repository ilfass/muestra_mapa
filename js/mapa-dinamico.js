/**
 * Mapa Dinámico - JS v1.4.2 (Versión Funcional y Estable)
 * Fecha: 2025-05-07
 * 
 * - Compatible con cualquier Google Sheet público
 * - Geocodificación con Nominatim (OpenStreetMap)
 * - Prioriza URL OSM > Lat/Lng > País
 * - Marca con color por país
 * - Control de errores y debug activable
 */

if (typeof MapaDinamico === 'undefined') {
  console.warn("MapaDinamico config no encontrada. Se define por defecto.");
  var MapaDinamico = {
    geocodingDelay: 1500,
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    maxRetries: 3,
    chunkSize: 3,
    debug: true
  };
}

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

function extractCoordsFromOSMUrl(url) {
  if (!url) return null;
  const match = url.match(/[?&]mlat=(-?\d+\.\d+)&mlon=(-?\d+\.\d+)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  return null;
}

async function geocodeAddress(query, retries = 0) {
  const url = `${MapaDinamico.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  debugLog('🔍 Geocodificando:', query);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } else {
      return null;
    }
  } catch (err) {
    if (retries < MapaDinamico.maxRetries) {
      debugLog(`⚠️ Reintentando geocodificación: ${query}`);
      return new Promise(resolve => setTimeout(() => resolve(geocodeAddress(query, retries + 1)), 1000));
    } else {
      console.error('❌ Falló la geocodificación:', query, err);
      return null;
    }
  }
}

function iniciarMapaDinamico() {
    const container = document.getElementById("mapa-dinamico-container");
    if (!container) return;

    const sheetId = container.dataset.sheetId;
    if (!sheetId) return console.error("Falta el atributo data-sheet-id");

    // Crear el div interno para Leaflet
    let mapDiv = document.createElement("div");
    mapDiv.id = "map";
    mapDiv.style.height = container.style.height || "500px";
    container.appendChild(mapDiv);

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

    const map = L.map("map").setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

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

        // Geolocalizar cada universidad por nombre
        rows.forEach((entry, index) => {
          const nombreUni = entry["Universidad Contraparte"];
          if (nombreUni) {
            setTimeout(() => {
              fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nombreUni)}&format=json&limit=1`)
                .then(res => res.json())
                .then(data => {
                  if (data.length) {
                    const { lat, lon } = data[0];
                    // Generar popup genérico excluyendo ciertos campos
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
                    L.marker([lat, lon]).addTo(map).bindPopup(popupContent);
                  } else {
                    console.warn("No se encontró ubicación para:", nombreUni);
                  }
                });
            }, index * 1000); // delay para evitar ser bloqueado por Nominatim
          }
        });
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

// Si el div ya existe, ejecuta directamente
if (document.getElementById("mapa-dinamico-container")) {
    iniciarMapaDinamico();
} else {
    iniciarObserver();
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
            Logger.info(`📍 Usando coordenadas de lat/lon para: ${entry["Universidad Contraparte"]}`);
            return coords;
        }
    }

    // 2. Si tiene enlace a OpenStreetMap con mlat/mlon
    const osmLink = entry["Enlace a OpenStreetMap"];
    if (osmLink) {
        coords = this.extractCoordsFromOSM(osmLink);
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
                Logger.info(`📍 Usando coordenadas del país para: ${entry["Universidad Contraparte"]} (${country})`);
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
    try {
        // Usar un proxy CORS para evitar problemas de CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&format=json&limit=1`;
        
        const response = await fetch(proxyUrl + nominatimUrl, {
            headers: {
                'User-Agent': 'Universidad de Chile - Mapa de Convenios',
                'Origin': window.location.origin
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
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