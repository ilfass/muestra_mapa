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
        this.scriptUrl = null;
        this.error = null;
        this.debug = true; // Activar modo debug
    }

    /**
     * Configura la URL del script y los parámetros
     * @param {Object} config - Configuración del cargador
     * @param {string} config.scriptUrl - URL base del script
     * @param {string} config.sheetId - ID del Google Sheet
     * @param {string} config.sheetName - Nombre de la hoja
     * @param {string} [config.callback] - Nombre de la función de callback para JSONP
     */
    configure(config) {
        if (this.debug) {
            console.log('Configurando DataLoader con:', config);
        }

        if (!config.scriptUrl) {
            throw new Error('La URL del script es requerida');
        }

        // Construir URL con parámetros
        const params = new URLSearchParams({
            sheetId: config.sheetId,
            sheetName: config.sheetName,
            debug: 'true' // Siempre activar debug
        });

        if (config.callback) {
            params.append('callback', config.callback);
        }

        this.scriptUrl = `${config.scriptUrl}?${params.toString()}`;
        
        if (this.debug) {
            console.log('URL construida:', this.scriptUrl);
        }
    }

    /**
     * Carga los datos del script
     * @returns {Promise<Array>} Datos cargados
     */
    async load() {
        if (!this.scriptUrl) {
            throw new Error('Debe configurar el cargador antes de usar load()');
        }

        this.isLoading = true;
        this.error = null;

        if (this.debug) {
            console.log('Iniciando carga de datos desde:', this.scriptUrl);
        }

        return new Promise((resolve, reject) => {
            // Configurar timeout
            const timeout = setTimeout(() => {
                delete window[this.callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;
                this.error = new Error('Timeout al cargar datos');
                reject(new Error('Timeout al cargar datos'));
            }, 30000);

            // Configurar función de callback
            window[this.callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[this.callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;

                if (this.debug) {
                    console.log('Datos recibidos:', data);
                }

                if (!data.success) {
                    this.error = new Error(data.error || 'Error desconocido al cargar datos');
                    reject(this.error);
                    return;
                }

                this.data = data.data;
                resolve(this.data);
            };

            // Crear y agregar script
            const script = document.createElement('script');
            script.src = this.scriptUrl;
            script.onerror = (error) => {
                clearTimeout(timeout);
                delete window[this.callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;
                this.error = new Error('Error cargando el script. Verifica que la URL sea correcta y el sheet sea accesible públicamente.');
                if (this.debug) {
                    console.error('Error en script:', error);
                }
                reject(this.error);
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Carga los datos usando JSONP
     * @returns {Promise<Array>} Datos cargados
     */
    loadJsonp() {
        if (!this.scriptUrl) {
            throw new Error('Debe configurar el cargador antes de usar loadJsonp()');
        }

        this.isLoading = true;
        this.error = null;

        if (this.debug) {
            console.log('Iniciando carga JSONP desde:', this.scriptUrl);
        }

        return new Promise((resolve, reject) => {
            // Crear función de callback única
            const callbackName = 'jsonpCallback_' + Math.random().toString(36).substr(2, 5);
            
            // Configurar timeout
            const timeout = setTimeout(() => {
                delete window[callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;
                this.error = new Error('Timeout al cargar datos');
                reject(new Error('Timeout al cargar datos'));
            }, 30000);

            // Configurar función de callback
            window[callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;

                if (this.debug) {
                    console.log('Datos recibidos vía JSONP:', data);
                }

                if (!data.success) {
                    this.error = new Error(data.error || 'Error desconocido al cargar datos');
                    reject(this.error);
                    return;
                }

                this.data = data.data;
                resolve(this.data);
            };

            // Crear y agregar script
            const script = document.createElement('script');
            script.src = this.scriptUrl;
            script.onerror = (error) => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                this.isLoading = false;
                this.error = new Error('Error cargando el script. Verifica que la URL sea correcta y el sheet sea accesible públicamente.');
                if (this.debug) {
                    console.error('Error en script:', error);
                }
                reject(this.error);
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Obtiene los datos cargados
     * @returns {Array|null} Datos cargados o null si no hay datos
     */
    getData() {
        return this.data;
    }

    /**
     * Verifica si hay un error
     * @returns {Error|null} Error si existe, null si no hay error
     */
    getError() {
        return this.error;
    }

    /**
     * Verifica si está cargando
     * @returns {boolean} true si está cargando, false si no
     */
    isLoading() {
        return this.isLoading;
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