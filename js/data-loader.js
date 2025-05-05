/**
 * 🖐️ Cargador de datos desde Google Sheets
 * Se encarga de obtener y procesar los datos del sheet
 */
class DataLoader {
    constructor() {
        this.data = null;
        this.geocoder = window.geocoder;
        this.isLoading = false;
        // Columna fija para geocodificación
        this.COLUMNA_UNIVERSIDAD = 'Universidad contraparte';
        this.callbackName = 'jsonpCallback_' + Math.random().toString(36).substr(2, 9);
    }

    // 🖐️ Cargar datos desde Google Sheets
    async loadData(sheetUrl) {
        if (this.isLoading) return this.data;
        
        try {
            this.isLoading = true;
            this.showLoading();

            console.log('🔍 Intentando cargar datos desde:', sheetUrl);

            // Validar URL
            if (!sheetUrl) {
                throw new Error('URL de la hoja no proporcionada');
            }

            // Limpiar URL
            sheetUrl = sheetUrl.trim();

            // Extraer fileId y hoja
            const urlObj = new URL(sheetUrl);
            const fileId = urlObj.searchParams.get('fileId');
            const hoja = urlObj.searchParams.get('hoja');

            if (!fileId) {
                throw new Error('ID de archivo no encontrado en la URL');
            }

            // Construir URL con JSONP
            const scriptUrl = `${sheetUrl}&callback=${this.callbackName}`;

            // Crear promesa para JSONP
            return new Promise((resolve, reject) => {
                // Crear función de callback global
                window[this.callbackName] = (response) => {
                    // Limpiar
                    delete window[this.callbackName];
                    document.body.removeChild(script);
                    
                    if (!response.success) {
                        reject(new Error(response.error || 'Error desconocido'));
                        return;
                    }
                    
                    resolve(response.data);
                };

                // Crear y agregar script
                const script = document.createElement('script');
                script.src = scriptUrl;
                script.onerror = () => {
                    delete window[this.callbackName];
                    document.body.removeChild(script);
                    reject(new Error('Error cargando el script'));
                };
                document.body.appendChild(script);
            });

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
        const valores = this.data.map(item => item[field]);
        return [...new Set(valores)].filter(Boolean).sort();
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