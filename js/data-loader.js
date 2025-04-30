/**
 * 🖐️ Cargador de datos desde Google Sheets
 * Se encarga de obtener y procesar los datos del sheet
 */
class DataLoader {
    constructor() {
        this.data = null;
        this.geocoder = window.geocoder;
    }

    // 🖐️ Cargar datos desde Google Sheets
    async loadData(sheetUrl) {
        try {
            const response = await fetch(sheetUrl);
            const data = await response.json();
            
            if (!data || !Array.isArray(data)) {
                throw new Error('Formato de datos inválido');
            }

            // Geocodificar las ubicaciones
            const locations = data.map(item => item.Universidad);
            const geocoded = await this.geocoder.batchGeocode(locations);

            // Combinar datos con coordenadas
            this.data = data.map((item, index) => ({
                ...item,
                coordinates: geocoded[index].error ? null : {
                    lat: geocoded[index].lat,
                    lng: geocoded[index].lng
                }
            }));

            return this.data;

        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    }

    // 🖐️ Obtener valores únicos para filtros
    getUniqueValues(field) {
        if (!this.data) return [];
        return [...new Set(this.data.map(item => item[field]))].filter(Boolean);
    }

    // 🖐️ Filtrar datos
    filterData(field, value) {
        if (!this.data) return [];
        return this.data.filter(item => item[field] === value);
    }

    // 🖐️ Buscar universidades
    searchUniversities(query) {
        if (!this.data || !query) return [];
        const normalizedQuery = query.toLowerCase();
        return this.data.filter(item => 
            item.Universidad.toLowerCase().includes(normalizedQuery)
        );
    }
}

// Exportar instancia única
window.dataLoader = new DataLoader();