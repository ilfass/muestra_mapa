
async function fetchSheetData(sheetUrl) {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error al cargar datos del sheet:", error);
        return [];
    }
}

// 🌐 Carga datos desde Google Sheets