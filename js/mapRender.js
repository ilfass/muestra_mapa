// 🗺️ Renderiza el mapa con Leaflet
let map;

function renderMap(data) {
    const container = document.getElementById("mapa-v3");
    if (!map) {
        map = L.map(container).setView([0, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
    } else {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });
    }

    data.forEach(entry => {
        const marker = L.marker([entry.coords.lat, entry.coords.lon]).addTo(map);
        marker.bindPopup(`
            <strong>${entry["Universidad"]}</strong><br/>
            ${entry["País"] || ""}
        `);
    });
}
