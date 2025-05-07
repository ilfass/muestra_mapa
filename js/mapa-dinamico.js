/**
 * Mapa Dinámico - JS v1.4.2
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

function cleanText(text) {
    console.log('cleanText recibe:', text, 'tipo:', typeof text);
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
        try {
            text = String(text);
        } catch (e) {
            console.warn('No se pudo convertir a string:', text, e);
            return '';
        }
    }
    return text
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("#mapa-dinamico-container");
  if (!container) return console.error("⚠️ No se encontró el contenedor del mapa");

  const sheetId = container.dataset.sheetId;
  if (!sheetId) return console.error("⚠️ Falta el atributo data-sheet-id");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const rawJson = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(rawJson);

    const cols = parsed.table.cols.map(c => c.label.trim());
    const rows = parsed.table.rows.map(r => {
      const obj = {};
      r.c.forEach((cell, i) => {
        obj[cols[i]] = cleanText(cell?.v ?? '');
      });
      return obj;
    });

    const map = L.map("mapa-dinamico-container").setView([0, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    for (let row of rows) {
      let name = row["Universidad Contraparte"] || row["Nombre"] || "Sin nombre";
      let osmUrl = row["Web"] || row["Mapa"];
      let coords = extractCoordsFromOSMUrl(osmUrl);

      if (!coords && row["Latitud"] && row["Longitud"]) {
        coords = [parseFloat(row["Latitud"]), parseFloat(row["Longitud"])];
      }

      if (!coords) {
        coords = await geocodeAddress(name || row["País"]);
        await new Promise(resolve => setTimeout(resolve, MapaDinamico.geocodingDelay));
      }

      if (coords) {
        const color = colorFromString(row["País"] || "");
        L.marker(coords, { icon: createColoredIcon(color) })
          .addTo(map)
          .bindPopup(`<strong>${name}</strong><br>${row["País"] || ""}`);
      } else {
        debugLog(`❌ No se pudo geolocalizar:`, name);
      }
    }

  } catch (err) {
    console.error("❌ Error al procesar el sheet:", err);
  }
}); 