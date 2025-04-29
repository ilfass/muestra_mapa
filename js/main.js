class MapSystem {
  constructor(container) {
      this.container = container;
      this.modules = {
          loader: new DataLoader(this),
          geocoder: new Geocoder(this),
          map: new MapManager(this),
          cache: new CacheManager('mapCache')
      };
      this.init().catch(console.error);
  }

  async init() {
      try {
          const rawData = await this.modules.loader.fetch();
          const geoData = await this.modules.geocoder.process(rawData);
          await this.modules.map.render(geoData);
          this.container.querySelector('.mapa-loading').remove();
      } catch (error) {
          this.container.innerHTML = `<div class="mapa-error">⚠️ Error: ${error.message}</div>`;
          throw error;
      }
  }
}

document.querySelectorAll('.mapa-container').forEach(container => {
  new MapSystem(container);
});