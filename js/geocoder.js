/**
 * 🖐️ Servicio de geocodificación usando Nominatim
 * Se encarga de convertir nombres de lugares en coordenadas
 */
class Geocoder {
    constructor() {
        this.BASE_URL = 'https://nominatim.openstreetmap.org/search';
        this.cache = window.cacheManager;
    }

    // 🖐️ Geocodificar una dirección
    async geocode(query) {
        // Verificar caché primero
        if (this.cache.has(query)) {
            return this.cache.get(query);
        }

        try {
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                limit: 1
            });

            const response = await fetch(`${this.BASE_URL}?${params}`, {
                headers: {
                    'User-Agent': 'UniversityMapPlugin/1.0'
                }
            });

            const data = await response.json();

            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                
                // Guardar en caché
                this.cache.set(query, result);
                return result;
            }

            throw new Error('No se encontraron resultados');

        } catch (error) {
            console.error('Error en geocodificación:', error);
            throw error;
        }
    }

    // 🖐️ Geocodificar múltiples direcciones
    async batchGeocode(queries) {
        // Esperar 1 segundo entre cada solicitud para respetar límites de API
        const results = [];
        for (const query of queries) {
            try {
                const result = await this.geocode(query);
                results.push({ query, ...result });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error geocodificando "${query}":`, error);
                results.push({ query, error: true });
            }
        }
        return results;
    }
}

// Exportar instancia única
window.geocoder = new Geocoder();