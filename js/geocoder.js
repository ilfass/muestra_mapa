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
    async geocode(item) {
        if (!item || !item.Universidad || !item.País) {
            console.error('Datos inválidos para geocodificación:', item);
            throw new Error('Datos inválidos para geocodificación');
        }

        // Construir una query más específica
        const query = `${item.Universidad} university ${item.País}`;
        
        // Verificar caché primero
        if (this.cache.has(query)) {
            return this.cache.get(query);
        }

        try {
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                limit: 1,
                addressdetails: 1,
                type: 'education',  // Priorizar resultados educativos
                'accept-language': 'es,en'  // Priorizar nombres en español
            });

            const response = await fetch(`${this.BASE_URL}?${params}`, {
                headers: {
                    'User-Agent': 'UniversityMapPlugin/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                
                // Validar coordenadas
                if (isNaN(result.lat) || isNaN(result.lng)) {
                    throw new Error('Coordenadas inválidas');
                }
                
                // Guardar en caché
                this.cache.set(query, result);
                return result;
            }

            // Si no se encuentra, intentar una búsqueda más general
            return this.fallbackGeocode(item);

        } catch (error) {
            console.error('Error en geocodificación:', error);
            return this.fallbackGeocode(item);
        }
    }

    // 🖐️ Búsqueda alternativa si falla la primera
    async fallbackGeocode(item) {
        try {
            const params = new URLSearchParams({
                q: `${item.Universidad} ${item.País}`,
                format: 'json',
                limit: 1
            });

            const response = await fetch(`${this.BASE_URL}?${params}`, {
                headers: {
                    'User-Agent': 'UniversityMapPlugin/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };

                // Validar coordenadas
                if (isNaN(result.lat) || isNaN(result.lng)) {
                    throw new Error('Coordenadas inválidas');
                }
                
                // Guardar en caché
                this.cache.set(`${item.Universidad}, ${item.País}`, result);
                return result;
            }

            throw new Error(`No se encontraron resultados para: ${item.Universidad}`);

        } catch (error) {
            console.error(`Error en geocodificación fallback para ${item.Universidad}:`, error);
            throw error;
        }
    }

    // 🖐️ Geocodificar múltiples elementos
    async batchGeocode(items) {
        if (!Array.isArray(items)) {
            console.error('Se esperaba un array de items:', items);
            throw new Error('Formato de datos inválido para geocodificación por lotes');
        }

        const results = [];
        for (const item of items) {
            try {
                const result = await this.geocode(item);
                results.push({ 
                    query: item.Universidad,
                    ...result 
                });
                // Esperar 1 segundo entre solicitudes para respetar límites de API
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error geocodificando "${item?.Universidad}":`, error);
                results.push({ 
                    query: item?.Universidad || 'Desconocido',
                    error: true 
                });
            }
        }
        return results;
    }
}

// Exportar instancia única
window.geocoder = new Geocoder();