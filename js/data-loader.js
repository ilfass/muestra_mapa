/**
 * 🖐️ Cargador de datos desde Google Sheets
 * Se encarga de obtener y procesar los datos del sheet
 */
class DataLoader {
    constructor() {
        this.data = null;
        this.geocoder = window.geocoder;
        this.isLoading = false;
        // Las columnas se obtendrán de la configuración
        this.COLUMNAS = window.mapaConfig?.columnas || {
            universidad: 'Universidad contraparte',
            pais: 'País',
            nombreCOIL: 'Nombre COIL',
            facultad: 'Facultad/Dependencia UNICEN',
            año: 'Año'
        };
    }

    // 🖐️ Cargar datos desde Google Sheets
    async loadData(sheetUrl) {
        if (this.isLoading) return this.data;
        
        try {
            this.isLoading = true;
            this.showLoading();

            // Actualizar columnas por si han cambiado
            this.COLUMNAS = window.mapaConfig?.columnas || this.COLUMNAS;

            console.log('🔍 Intentando cargar datos desde:', sheetUrl);
            console.log('📊 Usando configuración de columnas:', this.COLUMNAS);

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
            const validData = rawData.map(item => {
                // Verificar si el item es válido
                if (!item || typeof item !== 'object') {
                    console.log('❌ Item inválido:', item);
                    return null;
                }

                // Mantener todos los campos originales
                const cleanedItem = { ...item };

                // Extraer y limpiar el nombre de la universidad
                const universidad = item[this.COLUMNAS.universidad];
                if (!universidad || typeof universidad !== 'string') {
                    console.log('❌ Universidad inválida:', item);
                    return null;
                }

                // Limpiar el nombre de la universidad (eliminar saltos de línea extras)
                cleanedItem[this.COLUMNAS.universidad] = universidad.split('\n')[0].trim();

                return cleanedItem;
            }).filter(Boolean); // Eliminar items nulos

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
        // Mapear el nombre del campo del shortcode al nombre real de la columna
        const columnaReal = this.COLUMNAS[field.toLowerCase()] || field;
        const valores = this.data.map(item => {
            // Intentar obtener el valor usando el nombre original o el normalizado
            return item[columnaReal] || item[field];
        });
        return [...new Set(valores)].filter(Boolean).sort();
    }

    // 🖐️ Filtrar datos
    filterData(field, value) {
        if (!this.data) return [];
        // Mapear el nombre del campo del shortcode al nombre real de la columna
        const columnaReal = this.COLUMNAS[field.toLowerCase()] || field;
        return this.data.filter(item => {
            // Intentar obtener el valor usando el nombre original o el normalizado
            const itemValue = item[columnaReal] || item[field];
            return itemValue === value;
        });
    }

    // 🖐️ Buscar universidades
    searchUniversities(query) {
        if (!this.data || !query) return [];
        const normalizedQuery = query.toLowerCase().trim();
        return this.data.filter(item => {
            // Buscar en todos los campos de texto
            return Object.entries(item).some(([key, value]) => {
                return typeof value === 'string' && 
                       value.toLowerCase().includes(normalizedQuery);
            });
        });
    }
}

// Exportar instancia única
window.dataLoader = new DataLoader();