/**
 * Versión: 1.0.3
 * Última actualización: 2024-03-19
 * Descripción: Script para acceder a datos de Google Sheets de forma genérica
 */

// Configuración global
const CONFIG = {
  VERSION: '1.0.3',
  CACHE_DURATION: 21600, // 6 horas en segundos
  MAX_ROWS: 1000,
  DEFAULT_SHEET_NAME: 'Sheet1',
  ERROR_CODES: {
    INVALID_PARAMS: 'E001',
    SHEET_NOT_FOUND: 'E002',
    ACCESS_DENIED: 'E003',
    INVALID_DATA: 'E004',
    RATE_LIMIT: 'E005'
  }
};

/**
 * Función principal que maneja las peticiones GET
 * @param {Object} e - Objeto de evento de la petición
 * @return {HtmlOutput} Respuesta HTTP
 */
function doGet(e) {
  try {
    // Validar parámetros
    const params = e.parameter || {};
    const sheetId = params.sheetId || params.fileId;
    const sheetName = params.sheetName || params.hoja || CONFIG.DEFAULT_SHEET_NAME;
    const callback = params.callback;
    
    if (!sheetId) {
      throw new Error('Se requiere el ID de la hoja de cálculo');
    }

    // Intentar acceder a la hoja
    const sheet = getSheetById(sheetId, sheetName);
    if (!sheet) {
      throw new Error('No se pudo acceder a la hoja de cálculo');
    }

    // Obtener datos
    const data = getSheetData(sheet);
    
    // Preparar respuesta
    const response = {
      success: true,
      version: CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      data: data
    };

    // Si hay callback, usar JSONP
    if (callback) {
      const jsonString = JSON.stringify(response);
      const content = `${callback}(${jsonString})`;
      return HtmlService.createHtmlOutput(content)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // Si no hay callback, usar JSON normal
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      success: false,
      version: CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      error: {
        code: CONFIG.ERROR_CODES.INVALID_DATA,
        message: error.message,
        details: error.toString()
      }
    };

    if (params.callback) {
      const content = `${params.callback}(${JSON.stringify(errorResponse)})`;
      return HtmlService.createHtmlOutput(content)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtiene una hoja de cálculo por ID y nombre
 * @param {string} sheetId - ID de la hoja de cálculo
 * @param {string} sheetName - Nombre de la hoja
 * @return {Sheet} Objeto de hoja de cálculo
 */
function getSheetById(sheetId, sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    return spreadsheet.getSheetByName(sheetName);
  } catch (error) {
    console.error('Error al acceder a la hoja:', error);
    return null;
  }
}

/**
 * Obtiene y procesa los datos de la hoja
 * @param {Sheet} sheet - Objeto de hoja de cálculo
 * @return {Array} Datos procesados
 */
function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Crea una respuesta en formato CSV
 * @param {Array} data - Datos a convertir
 * @return {TextOutput} Respuesta HTTP
 */
function createCSVResponse(data) {
  if (data.length === 0) {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.CSV);
  }

  const columnHeaders = Object.keys(data[0]);
  const csvContent = [
    columnHeaders.join(','),
    ...data.map(row => columnHeaders.map(header => row[header]).join(','))
  ].join('\n');

  return ContentService.createTextOutput(csvContent)
    .setMimeType(ContentService.MimeType.CSV);
}

/**
 * Crea una respuesta en formato JSON
 * @param {Object} data - Datos a convertir
 * @return {TextOutput} Respuesta HTTP
 */
function createJSONResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja los errores y crea una respuesta de error
 * @param {Error} error - Objeto de error
 * @return {TextOutput} Respuesta HTTP de error
 */
function handleError(error) {
  const errorResponse = {
    success: false,
    version: CONFIG.VERSION,
    timestamp: new Date().toISOString(),
    error: {
      code: CONFIG.ERROR_CODES.INVALID_DATA,
      message: error.message,
      details: error.toString()
    }
  };

  return ContentService.createTextOutput(JSON.stringify(errorResponse))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Configura los headers CORS para la respuesta
 * @param {TextOutput} output - Objeto de respuesta
 * @return {TextOutput} Respuesta con headers CORS
 */
function setCorsHeaders(output) {
  const response = output.getResponse();
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
} 