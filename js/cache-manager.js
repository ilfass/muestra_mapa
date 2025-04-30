/**
 * 🖐️ Gestor de caché para coordenadas geocodificadas
 * Utiliza localStorage para almacenar las coordenadas ya resueltas
 */
class CacheManager {
    constructor() {
        this.CACHE_KEY = 'mapa_v3_geocode_cache';
        this.cache = this.loadCache();
    }

    // 🖐️ Cargar caché desde localStorage
    loadCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.error('Error al cargar caché:', error);
            return {};
        }
    }

    // 🖐️ Guardar caché en localStorage
    saveCache() {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
        } catch (error) {
            console.error('Error al guardar caché:', error);
        }
    }

    // 🖐️ Obtener coordenadas de la caché
    get(key) {
        return this.cache[key];
    }

    // 🖐️ Guardar coordenadas en la caché
    set(key, value) {
        this.cache[key] = value;
        this.saveCache();
    }

    // 🖐️ Verificar si existe en caché
    has(key) {
        return key in this.cache;
    }

    // 🖐️ Limpiar caché
    clear() {
        this.cache = {};
        localStorage.removeItem(this.CACHE_KEY);
    }
}

// Exportar instancia única
window.cacheManager = new CacheManager(); 