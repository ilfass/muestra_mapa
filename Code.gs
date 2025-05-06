/**
 * Versión: 1.0.7
 * Última actualización: 2024-03-19
 * Descripción: Script para acceder a datos de Google Sheets de forma genérica
 */

// Configuración global
const CONFIG = {
  VERSION: "1.0.7",
  DEFAULT_SHEET_ID: "15cC7TpXzNfRWoyn8yn_pkHN1-A2NeXAsEA9HDy37MFU",
  DEFAULT_SHEET_NAME: "Sheet1"
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
    const sheetId = params.sheetId || CONFIG.DEFAULT_SHEET_ID;
    const sheetName = params.sheetName || CONFIG.DEFAULT_SHEET_NAME;
    const format = params.format || "json";
    
    // Obtener hoja y datos
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("No se pudo acceder a la hoja de cálculo");
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // Preparar respuesta según formato
    let output;
    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...data.slice(1).map(row => row.join(","))
      ].join("\n");
      output = ContentService.createTextOutput(csvContent)
        .setMimeType(ContentService.MimeType.CSV);
    } else {
      const jsonResponse = {
        success: true,
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        data: rows
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
