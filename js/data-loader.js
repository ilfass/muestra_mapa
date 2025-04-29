class DataLoader {
    constructor(system) {
        this.system = system;
        this.sheetUrl = system.container.dataset.sheet;
    }

    async fetchData() {
        try {
            // 🖐️ Manejo de caché con validación CORS
            const response = await fetch(this.sheetUrl, {
                mode: 'cors',
                headers: {'Content-Type': 'application/json'}
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            return await response.json();
        } catch (error) {
            console.error('DataLoader Error:', error);
            this.system.modules.mapManager.showErrorModal();
            return [];
        }
    }
}