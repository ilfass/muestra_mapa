/**
 * Versión: 1.0.8
 * Última actualización: 2024-03-19
 * Descripción: Script para acceder a datos de Google Sheets con geocodificación automática
 */

// Configuración global
const CONFIG = {
  VERSION: "1.0.8",
  CACHE_DURATION: 21600, // 6 horas en segundos
  GEOCODING_DELAY: 1000, // 1 segundo entre solicitudes de geocodificación
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org/search',
  SHEET_CACHE_KEY: 'SHEET_DATA_',
  COORDS_CACHE_KEY: 'COORDS_DATA',
  DEFAULT_SHEET_NAME: 'Sheet1'
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
    const sheetName = params.sheetName || params.sheet || CONFIG.DEFAULT_SHEET_NAME;
    const format = params.format || "json";
    
    // Obtener y procesar datos
    const data = getProcessedData(sheetName);
    
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
 * Obtiene y procesa los datos con caché
 * @param {string} sheetName - Nombre de la hoja
 * @return {Array} Datos procesados
 */
function getProcessedData(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = CONFIG.SHEET_CACHE_KEY + sheetName;
  
  // Intentar obtener datos del caché
  let data = cache.get(cacheKey);
  if (data != null) {
    return JSON.parse(data);
  }
  
  // Si no hay caché, obtener datos frescos
  data = getSheetData(sheetName);
  
  // Procesar coordenadas
  data = processCoordinates(data);
  
  // Guardar en caché
  cache.put(cacheKey, JSON.stringify(data), CONFIG.CACHE_DURATION);
  
  return data;
}

/**
 * Obtiene datos de la hoja
 * @param {string} sheetName - Nombre de la hoja
 * @return {Array} Datos de la hoja
 */
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(sheetName);
    
  if (!sheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada`);
  }
  
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  
  return values.slice(1)
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    })
    .filter(item => {
      const universidad = item['Universidad'] || item['Universidad contraparte'];
      return universidad && universidad.toString().trim() !== '';
    });
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
    const universidad = item['Universidad'] || item['Universidad contraparte'];
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
  
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  sheets.forEach(sheet => {
    cache.remove(CONFIG.SHEET_CACHE_KEY + sheet.getName());
  });
}

/**
 * Actualiza los datos manualmente
 */
function updateData() {
  clearCache();
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  sheets.forEach(sheet => {
    getProcessedData(sheet.getName());
  });
}

/**
 * Crea el menú personalizado
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Mapa Dinámico')
    .addItem('Actualizar Datos', 'updateData')
    .addItem('Limpiar Caché', 'clearCache')
    .addToUi();
}
