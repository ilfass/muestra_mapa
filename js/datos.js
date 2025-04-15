
// async function obtenerDatos() {
//   const url = 'https://script.google.com/macros/s/AKfycbzR_qp1oRS3aRRebiCC6dPQAHilYlmwpQgN_Ng4a-EZnhSWWfGilFJzJ3gAKT_eGG6BfA/exec';
//   const respuesta = await fetch(url);
//   const datos = await respuesta.json();
//   return datos;
// }
async function obtenerDatos() {
  const defaultURL = 'https://script.google.com/macros/s/AKfycbzR_qp1oRS3aRRebiCC6dPQAHilYlmwpQgN_Ng4a-EZnhSWWfGilFJzJ3gAKT_eGG6BfA/exec';
  const url = typeof googleSheetURL !== 'undefined' ? googleSheetURL : defaultURL;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return datos;
  } catch (error) {
    console.error("Error al obtener datos:", error);
    return [];
  }
}
