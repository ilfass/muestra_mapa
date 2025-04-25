// 🖐 Este archivo contiene funciones auxiliares (helpers) que usamos en el resto del código

/**
 * 🧹 Elimina duplicados de un array y lo ordena alfabéticamente.
 */
function obtenerValoresUnicosOrdenados(datos, columna) {
  const valores = datos.map(fila => fila[columna]).filter(Boolean);
  const unicos = [...new Set(valores)];
  return unicos.sort();
}

/**
 * 🧪 Filtra los datos según los filtros seleccionados.
 */
function filtrarDatos(datos, filtrosSeleccionados) {
  return datos.filter(fila => {
    // 🖐 Para cada filtro, verificamos que el valor en la fila coincida con el valor seleccionado
    return Object.entries(filtrosSeleccionados).every(([columna, valor]) => {
      if (!valor || valor === 'Todos') return true; // 🖐 Si no hay filtro, pasamos
      return fila[columna] === valor;
    });
  });
}

/**
 * 🖐 Limpia el contenedor de los filtros para regenerarlos
 */
function limpiarContenedorFiltros(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (contenedor) contenedor.innerHTML = '';
}