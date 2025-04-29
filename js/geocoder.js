class Geocoder {
    constructor() {
        this.cache = new CacheManager('geo_cache');
        this.endpoint = 'https://nominatim.openstreetmap.org/search';
    }

    async geocode(query) {
        // 🖐️ Sistema de caché multi-nivel
        const cached = await this.cache.get(query);
        if (cached) return cached;
        
        // Limitar solicitudes para cumplir con los términos de Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: 1,
            addressdetails: 1
        });
        
        const response = await fetch(`${this.endpoint}?${params}`);
        const data = await response.json();
        
        if (data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            await this.cache.set(query, result);
            return result;
        }
        
        return { lat: null, lon: null };
    }
}