/**
 * 🖐️ Archivo principal que inicializa el sistema del mapa
 */
class MapSystem {
    constructor() {
        this.mapManager = window.mapManager;
        this.dataLoader = window.dataLoader;
    }

    // 🖐️ Inicializar el sistema
    async init() {
        try {
            // Obtener configuración del WordPress
            const { sheetUrl, filtroDefault } = window.mapaConfig || {};
            
            if (!sheetUrl) {
                throw new Error('URL del Google Sheet no especificada');
            }

            // Inicializar mapa
            this.mapManager.init();

            // Cargar datos
            const data = await this.dataLoader.loadData(sheetUrl);
            
            // Actualizar marcadores
            this.mapManager.updateMarkers(data);

            // Generar filtros
            this.mapManager.generateFilters(filtroDefault || 'País');

            // Inicializar búsqueda
            this.mapManager.initSearch();

        } catch (error) {
            console.error('Error inicializando el sistema:', error);
            this.showError(error.message);
        }
    }

    // 🖐️ Mostrar error
    showError(message) {
        const container = document.getElementById('mapa-v3');
        if (container) {
            container.innerHTML = `
                <div class="mapa-error">
                    <p>❌ Error: ${message}</p>
                    <p>Por favor, verifica la configuración del mapa.</p>
                </div>
            `;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const system = new MapSystem();
    system.init();
});