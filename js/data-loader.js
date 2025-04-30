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

            console.log('🔍 Intentando cargar datos desde:', sheetUrl);

            const response = await fetch(sheetUrl);
            const data = await response.json();
            
            console.log('📊 Datos recibidos del sheet:', data);

            if (!data) {
                throw new Error('No se recibieron datos del sheet');
            }

            // Si los datos vienen en un objeto con una propiedad específica
            const rawData = Array.isArray(data) ? data : data.items || data.data || data.values || Object.values(data);

            console.log('🔄 Datos procesados:', rawData);

            if (!Array.isArray(rawData)) {
                throw new Error('Los datos no están en un formato válido');
            }

            // Validar y limpiar datos
            const validData = rawData.filter(item => {
                // Verificar si el item es válido
                if (!item || typeof item !== 'object') {
                    console.log('❌ Item inválido:', item);
                    return false;
                }

                // Buscar las propiedades necesarias (pueden estar en diferentes casos)
                const universidad = item.Universidad || item.universidad || item.UNIVERSIDAD;
                const pais = item.País || item.pais || item.PAIS || item.PAÍS;

                const isValid = universidad && typeof universidad === 'string' &&
                              pais && typeof pais === 'string';

                if (!isValid) {
                    console.log('❌ Item con formato incorrecto:', item);
                }

                // Normalizar el formato de los datos
                if (isValid) {
                    item.Universidad = universidad;
                    item.País = pais;
                }

                return isValid;
            });

            console.log('✅ Datos válidos encontrados:', validData.length);
            console.log('📝 Muestra de datos válidos:', validData.slice(0, 2));

            if (validData.length === 0) {
                throw new Error('No se encontraron datos válidos en el sheet. Verifica el formato de los datos.');
            }

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
            console.error('❌ Error cargando datos:', error);
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
        const normalizedField = field.toLowerCase();
        return [...new Set(this.data.map(item => {
            // Buscar el campo en diferentes formatos
            return item[field] || item[field.toLowerCase()] || item[field.toUpperCase()];
        }))].filter(Boolean).sort();
    }

    // 🖐️ Filtrar datos
    filterData(field, value) {
        if (!this.data) return [];
        const normalizedField = field.toLowerCase();
        return this.data.filter(item => {
            const itemValue = item[field] || item[field.toLowerCase()] || item[field.toUpperCase()];
            return itemValue === value;
        });
    }

    // 🖐️ Buscar universidades
    searchUniversities(query) {
        if (!this.data || !query) return [];
        const normalizedQuery = query.toLowerCase().trim();
        return this.data.filter(item => {
            const universidad = (item.Universidad || item.universidad || item.UNIVERSIDAD || '').toLowerCase();
            const pais = (item.País || item.pais || item.PAIS || item.PAÍS || '').toLowerCase();
            return universidad.includes(normalizedQuery) || pais.includes(normalizedQuery);
        });
    }
}

// Exportar instancia única
window.dataLoader = new DataLoader();