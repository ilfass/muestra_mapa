/**
 * Versión: 1.0.9
 * Última actualización: 2024-03-19
 * Descripción: Script para acceder a datos de Google Sheets con geocodificación automática
 */

// Configuración global
const CONFIG = {
  VERSION: "1.0.9",
  CACHE_DURATION: 21600, // 6 horas en segundos
  GEOCODING_DELAY: 1000, // 1 segundo entre solicitudes de geocodificación
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org/search',
  COORDS_CACHE_KEY: 'COORDS_DATA'
};

/**
 * Función principal que maneja las peticiones GET
 * @param {Object} e - Objeto de evento de la petición
 * @return {TextOutput} Respuesta HTTP
 */
function doGet(e) {
  try {
    // Validar parámetros
    const params = e.parameter || {};
    const sheetId = params.sheetId || SpreadsheetApp.getActiveSpreadsheet().getId();
    const sheetName = params.sheetName || params.sheet || 'Sheet1';
    const format = params.format || "json";
    
    // Obtener datos usando gviz/tq
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
    const response = UrlFetchApp.fetch(gvizUrl);
    const jsonText = response.getContentText();
    const jsonData = JSON.parse(jsonText.substr(47).slice(0, -2));
    
    // Procesar datos
    const cols = jsonData.table.cols.map(col => col.label);
    const rows = jsonData.table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell?.v || "";
      });
      return obj;
    });

    // Procesar coordenadas
    const data = processCoordinates(rows);
    
    // Preparar respuesta según formato
    let output;
    if (format === "csv") {
      const csvContent = convertToCSV(data);
      output = ContentService.createTextOutput(csvContent)
        .setMimeType(ContentService.MimeType.CSV);
    } else {
      const jsonResponse = {
        success: true,
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        data: data
      };
      output = ContentService.createTextOutput(JSON.stringify(jsonResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Configurar headers CORS
    output.setHeader("Access-Control-Allow-Origin", "*");
    output.setHeader("Access-Control-Allow-Methods", "GET");
    output.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return output;

  } catch (error) {
    const errorResponse = {
      success: false,
      version: CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      error: error.message
    };

    const output = ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Configurar headers CORS
    output.setHeader("Access-Control-Allow-Origin", "*");
    output.setHeader("Access-Control-Allow-Methods", "GET");
    output.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return output;
  }
}

/**
 * Procesa las coordenadas de las universidades
 * @param {Array} data - Datos a procesar
 * @return {Array} Datos con coordenadas
 */
function processCoordinates(data) {
  const cache = CacheService.getScriptCache();
  let coordsCache = cache.get(CONFIG.COORDS_CACHE_KEY);
  let coordsData = coordsCache ? JSON.parse(coordsCache) : {};
  
  data = data.map(item => {
    const universidad = item['Universidad'] || item['Universidad Contraparte'];
    if (!universidad) return item;
    
    // Buscar en caché primero
    if (coordsData[universidad]) {
      item.coordinates = coordsData[universidad];
      return item;
    }
    
    // Si no está en caché, geocodificar
    const coords = geocodeUniversity(universidad);
    if (coords) {
      coordsData[universidad] = coords;
      item.coordinates = coords;
    }
    
    return item;
  });
  
  // Actualizar caché de coordenadas
  cache.put(CONFIG.COORDS_CACHE_KEY, JSON.stringify(coordsData), CONFIG.CACHE_DURATION);
  
  return data;
}

/**
 * Geocodifica una universidad usando Nominatim
 * @param {string} universidad - Nombre de la universidad
 * @return {Object|null} Coordenadas o null si no se encuentra
 */
function geocodeUniversity(universidad) {
  try {
    const query = encodeURIComponent(universidad);
    const url = `${CONFIG.NOMINATIM_URL}?q=${query}&format=json&limit=1`;
    
    Utilities.sleep(CONFIG.GEOCODING_DELAY); // Respetar límites de rate
    
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocodificando ${universidad}: ${error.message}`);
    return null;
  }
}

/**
 * Convierte datos a formato CSV
 * @param {Array} data - Datos a convertir
 * @return {string} Datos en formato CSV
 */
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  return [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');
}

/**
 * Limpia el caché manualmente
 */
function clearCache() {
  const cache = CacheService.getScriptCache();
  cache.remove(CONFIG.COORDS_CACHE_KEY);
}

/**
 * Crea el menú personalizado
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Mapa Dinámico')
    .addItem('Limpiar Caché de Coordenadas', 'clearCache')
    .addToUi();
}
