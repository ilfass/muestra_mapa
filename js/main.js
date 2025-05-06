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
            console.log('Iniciando sistema...');
            
            // Crear instancia del cargador de datos
            const dataLoader = new DataLoader();
            
            // Configurar para el sheet de COIL
            dataLoader.configure({
                scriptUrl: CONFIG.scriptUrl,
                sheetId: CONFIG.sheets.coil.id,
                sheetName: CONFIG.sheets.coil.name
            });
            
            // Intentar cargar datos
            console.log('Cargando datos de COIL...');
            const data = await dataLoader.load();
            
            if (!data || data.length === 0) {
                throw new Error('No se recibieron datos del sheet');
            }
            
            console.log(`Datos cargados correctamente: ${data.length} registros`);
            
            // Inicializar el mapa con los datos
            this.mapManager.updateMarkers(data);

            // Generar filtros
            this.mapManager.generateFilters('País');

            // Inicializar búsqueda
            this.mapManager.initSearch();

        } catch (error) {
            console.error('Error inicializando el sistema:', error);
            this.showError('Error cargando datos: ' + error.message);
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

// Configuración global
const CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbzV8gZByPVGzBqPaxsJ7oOTnm6GfI28yetyUXqOtG6RTDPdROXhdebHx4od1rOYvj3muA/exec',
    sheets: {
        coil: {
            id: '1bVkzcTS-q18VVIcXhXnnEbOOsdwDnsJ0688oqc4qiNiASb8HI7Bl9U04',
            name: 'COMPLETO'
        },
        convenios: {
            id: '1J2AfaXSXBZMOaoi8TOwlEHX5kt98MlDpgdQlAvsnWuE',
            name: 'Hoja 1'
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const system = new MapSystem();
    system.init();
});