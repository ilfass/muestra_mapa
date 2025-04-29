// 🖐️ Script principal: coordina todo
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("mapa-v3");
  if (!container) return;

  const sheetUrl = container.dataset.sheet;
  const filtro = container.dataset.filtro || "País";

  const rawData = await fetchSheetData(sheetUrl);
  const geocodedData = await geocodeUniversities(rawData);
  const uniqueFilters = getUniqueFilterValues(geocodedData, filtro);

  createFilterControl(uniqueFilters, filtro, filteredValue => {
      const filtered = applyFilter(geocodedData, filtro, filteredValue);
      renderMap(filtered);
  });

  renderMap(geocodedData);
});