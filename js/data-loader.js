/**
 * 🖐️ Cargador de datos desde Google Sheets
 * Se encarga de obtener y procesar los datos del sheet
 */
class DataLoader {
    constructor() {
        this.data = null;
        this.geocoder = window.geocoder;
        this.isLoading = false;
    }

    // 🖐️ Cargar datos desde Google Sheets
    async loadData(sheetUrl) {
        if (this.isLoading) return this.data;
        
        try {
            this.isLoading = true;
            this.showLoading();

            const response = await fetch(sheetUrl);
            const data = await response.json();
            
            if (!data || !Array.isArray(data)) {
                throw new Error('Formato de datos inválido');
            }

            // Validar y limpiar datos
            const validData = data.filter(item => {
                return item && 
                       typeof item === 'object' && 
                       item.Universidad && 
                       typeof item.Universidad === 'string' &&
                       item.País &&
                       typeof item.País === 'string';
            });

            if (validData.length === 0) {
                throw new Error('No se encontraron datos válidos en el sheet');
            }

            console.log('Datos válidos:', validData);

            // Geocodificar las ubicaciones
            const geocoded = await this.geocoder.batchGeocode(validData);

            // Combinar datos con coordenadas
            this.data = validData.map((item, index) => ({
                ...item,
                coordinates: geocoded[index].error ? null : {
                    lat: geocoded[index].lat,
                    lng: geocoded[index].lng
                }
            }));

            this.hideLoading();
            return this.data;

        } catch (error) {
            console.error('Error cargando datos:', error);
            this.hideLoading();
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    // 🖐️ Mostrar indicador de carga
    showLoading() {
        const container = document.querySelector('.mapa-container');
        if (container) {
            const loading = document.createElement('div');
            loading.className = 'mapa-loading';
            loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando datos...';
            container.appendChild(loading);
        }
    }

    // 🖐️ Ocultar indicador de carga
    hideLoading() {
        const loading = document.querySelector('.mapa-loading');
        if (loading) {
            loading.remove();
        }
    }

    // 🖐️ Obtener valores únicos para filtros
    getUniqueValues(field) {
        if (!this.data) return [];
        return [...new Set(this.data.map(item => item[field]))].filter(Boolean).sort();
    }

    // 🖐️ Filtrar datos
    filterData(field, value) {
        if (!this.data) return [];
        return this.data.filter(item => item[field] === value);
    }

    // 🖐️ Buscar universidades
    searchUniversities(query) {
        if (!this.data || !query) return [];
        const normalizedQuery = query.toLowerCase().trim();
        return this.data.filter(item => 
            item.Universidad.toLowerCase().includes(normalizedQuery) ||
            item.País.toLowerCase().includes(normalizedQuery)
        );
    }
}

// Exportar instancia única
window.dataLoader = new DataLoader();