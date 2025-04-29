// 🖐️ Script principal: coordina todo
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("mapa-v3");
  if (!container || typeof MapaV3Data === 'undefined') return;

  const sheetUrl = MapaV3Data.sheet;
  const filtro = MapaV3Data.filtro || "País";

  const rawData = await fetchSheetData(sheetUrl);
  const geocodedData = await geocodeUniversities(rawData);
  const uniqueFilters = getUniqueFilterValues(geocodedData, filtro);

  createFilterControl(uniqueFilters, filtro, filteredValue => {
      const filtered = applyFilter(geocodedData, filtro, filteredValue);
      renderMap(filtered);
  });

  renderMap(geocodedData);
});