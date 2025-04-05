
const coloresPorPais = {};
function obtenerColorParaPais(pais) {
  if (!coloresPorPais[pais]) {
    const color = '#' + Math.floor(Math.random()*16777215).toString(16);
    coloresPorPais[pais] = color;
  }
  return coloresPorPais[pais];
}
