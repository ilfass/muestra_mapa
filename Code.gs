// Configuración global
const CONFIG = {
  // Columna que se usará para geocodificación
  LOCATION_COLUMN_KEYWORDS: ['universidad', 'university', 'institution', 'institución'],
  
  // Nombre de la hoja por defecto
  DEFAULT_SHEET_NAME: 'Hoja 1'
};

// Función principal que será llamada por la URL web
function doGet(e) {
  try {
    // Obtener el ID del archivo y callback
    const fileId = e.parameter.fileId;
    const callback = e.parameter.callback;
    
    // Abrir la hoja
    const sheet = SpreadsheetApp.openById(fileId).getActiveSheet();
    
    // Obtener datos
    const data = sheet.getDataRange().getValues();
    
    // Preparar respuesta
    const response = {
      success: true,
      data: data
    };
    
    // Devolver como JSONP si hay callback, sino como JSON
    const output = callback ? 
      `${callback}(${JSON.stringify(response)})` : 
      JSON.stringify(response);
      
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
      
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error.message
    };
    
    const output = e.parameter.callback ? 
      `${e.parameter.callback}(${JSON.stringify(errorResponse)})` : 
      JSON.stringify(errorResponse);
      
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// Procesa los datos de la hoja
function processSheetData(fileId, sheetName) {
  const ss = SpreadsheetApp.openById(fileId);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`No se encontró la hoja: ${sheetName}`);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(header => header.trim().toLowerCase());
  
  // Identificar columna de ubicación
  const locationColumnIndex = findLocationColumn(headers);
  if (locationColumnIndex === -1) {
    throw new Error('No se encontró una columna válida para geocodificación');
  }
  
  // Procesar filas y unificar datos divididos
  const processedData = [];
  let currentItem = null;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Si la primera columna tiene contenido, es una nueva entrada
    if (row[0].toString().trim()) {
      if (currentItem) {
        processedData.push(currentItem);
      }
      
      // Crear nuevo item
      currentItem = {};
      headers.forEach((header, index) => {
        currentItem[header] = row[index].toString().trim();
      });
    } else if (currentItem) {
      // Continuar item anterior con datos adicionales
      headers.forEach((header, index) => {
        if (row[index].toString().trim()) {
          currentItem[header] = (currentItem[header] || '') + ' ' + row[index].toString().trim();
        }
      });
    }
  }
  
  // Agregar último item
  if (currentItem) {
    processedData.push(currentItem);
  }
  
  // Filtrar items válidos (deben tener la columna de ubicación)
  return processedData.filter(item => validateItem(item, headers[locationColumnIndex]));
}

// Encuentra la columna de ubicación
function findLocationColumn(headers) {
  return headers.findIndex(header => 
    CONFIG.LOCATION_COLUMN_KEYWORDS.some(keyword => 
      header.includes(keyword.toLowerCase())
    )
  );
}

// Valida que un item tenga la columna de ubicación
function validateItem(item, locationColumn) {
  return item[locationColumn] && item[locationColumn].trim() !== '';
} 