/**
 * Script genérico para acceder a datos de Google Sheets
 * Permite acceder a cualquier sheet mediante parámetros en la URL
 */

/**
 * Función principal que será llamada por la URL web
 * Parámetros aceptados:
 * - sheetId o fileId: ID del Google Sheet
 * - sheetName o hoja: Nombre de la hoja dentro del sheet
 * - format: (opcional) Formato de respuesta ('json' o 'csv'). Por defecto es 'json'
 * - callback: (opcional) Nombre de la función de callback para JSONP
 * - debug: (opcional) Si es 'true', incluye información de depuración
 */
function doGet(e) {
  try {
    // Log inicial
    console.log('Iniciando doGet con parámetros:', e ? e.parameter : 'No hay parámetros');
    
    // Validar que e existe
    if (!e) {
      throw new Error('No se recibieron parámetros en la solicitud');
    }

    // Validar parámetros requeridos (aceptar ambos formatos)
    const sheetId = e.parameter.sheetId || e.parameter.fileId;
    const sheetName = e.parameter.sheetName || e.parameter.hoja;
    const format = (e.parameter.format || 'json').toLowerCase();
    const callback = e.parameter.callback;
    const debug = e.parameter.debug === 'true';

    console.log('Parámetros procesados:', {
      sheetId,
      sheetName,
      format,
      callback,
      debug
    });

    if (!sheetId) {
      throw new Error('Se requiere el parámetro sheetId o fileId');
    }
    if (!sheetName) {
      throw new Error('Se requiere el parámetro sheetName o hoja');
    }

    // Intentar abrir el sheet
    console.log('Intentando abrir sheet:', sheetId);
    const ss = SpreadsheetApp.openById(sheetId);
    console.log('Sheet abierto correctamente');

    console.log('Buscando hoja:', sheetName);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`No se encontró la hoja: ${sheetName}`);
    }
    console.log('Hoja encontrada correctamente');
    
    // Obtener datos
    console.log('Obteniendo datos de la hoja');
    const data = sheet.getDataRange().getValues();
    console.log(`Datos obtenidos: ${data.length} filas`);
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Convertir a objetos con nombres de columnas
    const processedData = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    // Preparar respuesta según el formato solicitado
    if (format === 'csv') {
      return createCsvResponse(data);
    } else {
      return createJsonResponse(processedData, {
        sheetId,
        sheetName,
        timestamp: new Date().toISOString(),
        debug: debug ? {
          headers,
          rowCount: data.length,
          parameters: e.parameter
        } : undefined
      }, callback);
    }
      
  } catch (error) {
    // En caso de error, devolver información detallada
    console.error('Error en doGet:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      debug: {
        parameters: e ? e.parameter : 'No hay parámetros',
        errorName: error.name,
        errorStack: error.stack,
        errorMessage: error.message
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET"
      });
  }
}

/**
 * Crea una respuesta en formato JSON
 */
function createJsonResponse(data, metadata, callback) {
  const response = {
    success: true,
    message: "Datos obtenidos correctamente",
    rowCount: data.length,
    data: data,
    ...metadata
  };
  
  const jsonString = JSON.stringify(response);
  
  // Si hay callback, envolver en JSONP
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${jsonString})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET"
      });
  }
  
  // Si no hay callback, devolver JSON normal
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET"
    });
}

/**
 * Crea una respuesta en formato CSV
 */
function createCsvResponse(data) {
  const csvContent = data.map(row => 
    row.map(cell => 
      typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(',')
  ).join('\n');
  
  return ContentService.createTextOutput(csvContent)
    .setMimeType(ContentService.MimeType.CSV)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET"
    });
} 