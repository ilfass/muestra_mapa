/**
 * 🖐️ Gestor del mapa usando Leaflet
 * Se encarga de la visualización y interacción con el mapa
 */
class MapManager {
    constructor() {
        this.map = null;
        this.markers = L.markerClusterGroup();
        this.dataLoader = window.dataLoader;
        this.currentFilter = null;
    }

    // 🖐️ Inicializar el mapa
    init(containerId = 'mapa-v3') {
        this.map = L.map(containerId).setView([0, 0], 2);
        
        // Añadir capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Añadir grupo de marcadores
        this.map.addLayer(this.markers);

        // Inicializar controles
        this.initControls();
    }

    // 🖐️ Inicializar controles del mapa
    initControls() {
        // Botón de ubicación actual
        L.control.locate({
            position: 'topleft',
            strings: {
                title: "Mi ubicación"
            }
        }).addTo(this.map);

        // Escala
        L.control.scale({
            imperial: false
        }).addTo(this.map);
    }

    // 🖐️ Crear marcador personalizado
    createMarker(item) {
        if (!item.coordinates) return null;

        const marker = L.marker([item.coordinates.lat, item.coordinates.lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<i class="fas fa-university"></i>',
                iconSize: [30, 30]
            })
        });

        // Obtener las columnas configuradas
        const columnas = window.mapaConfig?.columnas || {};
        
        // Crear popup personalizado con todos los campos disponibles
        const popupContent = `
            <div class="custom-popup">
                <h3>${item[columnas.universidad] || 'Universidad sin nombre'}</h3>
                ${Object.entries(item).map(([key, value]) => {
                    // Excluir coordinates y campos vacíos
                    if (key !== 'coordinates' && value && typeof value === 'string' && value.trim() !== '') {
                        // Limpiar el valor de saltos de línea extras
                        const cleanValue = value.replace(/\\n+/g, ' ').trim();
                        // No mostrar el campo universidad aquí ya que está en el título
                        if (key !== columnas.universidad) {
                            return `<p><strong>${key}:</strong> ${cleanValue}</p>`;
                        }
                    }
                    return '';
                }).join('')}
            </div>
        `;

        marker.bindPopup(popupContent);
        return marker;
    }

    // 🖐️ Actualizar marcadores
    updateMarkers(data) {
        this.markers.clearLayers();
        
        data.forEach(item => {
            const marker = this.createMarker(item);
            if (marker) {
                this.markers.addLayer(marker);
            }
        });

        // Ajustar vista si hay marcadores
        if (this.markers.getLayers().length > 0) {
            this.map.fitBounds(this.markers.getBounds());
        }
    }

    // 🖐️ Generar filtros
    generateFilters(field) {
        const values = this.dataLoader.getUniqueValues(field);
        const container = document.getElementById('mapa-filtros');
        container.innerHTML = '';

        // Crear selector
        const select = document.createElement('select');
        select.id = `filtro-${field}`;
        
        // Opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Seleccionar ${field}`;
        select.appendChild(defaultOption);

        // Añadir opciones
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        // Evento de cambio
        select.addEventListener('change', (e) => {
            const value = e.target.value;
            const filteredData = value ? 
                this.dataLoader.filterData(field, value) : 
                this.dataLoader.data;
            this.updateMarkers(filteredData);
        });

        container.appendChild(select);
    }

    // 🖐️ Inicializar búsqueda
    initSearch() {
        const searchInput = document.getElementById('buscar-universidad');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const results = this.dataLoader.searchUniversities(query);
            this.updateMarkers(results);
        });
    }
}

// Exportar instancia única
window.mapManager = new MapManager();