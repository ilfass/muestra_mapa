class MapManager {
    constructor(system) {
        this.system = system;
        this.map = null;
        this.cluster = null;
    }

    async render(data) {
        this.map = L.map(this.system.container, {
            center: [0, 0],
            zoom: 2,
            preferCanvas: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        this.cluster = L.markerClusterGroup({
            iconCreateFunction: cluster => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    className: 'custom-cluster',
                    html: `<div>${count}</div>`,
                    iconSize: [40, 40]
                });
            }
        });

        data.filter(item => item.lat && item.lon).forEach(item => {
            const marker = L.marker([item.lat, item.lon], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).bindPopup(this.createPopup(item));
            
            this.cluster.addLayer(marker);
        });

        this.map.addLayer(this.cluster);
        this.map.fitBounds(this.cluster.getBounds());
    }

    createPopup(item) {
        return `
            <div class="map-popup">
                <h3>${item.Universidad}</h3>
                <p>${item.País}${item.Región ? ` · ${item.Región}` : ''}</p>
                ${item.Web ? `<a href="${item.Web}" target="_blank" rel="noopener">🌐 Sitio Web</a>` : ''}
            </div>
        `;
    }
}