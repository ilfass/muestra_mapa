class CacheManager {
    constructor(namespace, ttl = 604800000) { // 7 días
        this.namespace = namespace;
        this.ttl = ttl;
        this.storage = window.localStorage;
    }

    get(key) {
        try {
            const entry = JSON.parse(this.storage.getItem(`${this.namespace}_${key}`));
            return entry?.timestamp + this.ttl > Date.now() ? entry.data : null;
        } catch {
            return null;
        }
    }

    set(key, value) {
        const entry = {
            data: value,
            timestamp: Date.now()
        };
        this.storage.setItem(`${this.namespace}_${key}`, JSON.stringify(entry));
        this.cleanup();
    }

    cleanup() {
        Object.keys(this.storage).forEach(key => {
            if (key.startsWith(this.namespace)) {
                const entry = JSON.parse(this.storage.getItem(key));
                if (Date.now() - entry.timestamp > this.ttl) {
                    this.storage.removeItem(key);
                }
            }
        });
    }
}