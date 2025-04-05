function obtenerDatosDesdeSheet(callback) {
    const url = 'https://script.google.com/macros/s/AKfycbzR_qp1oRS3aRRebiCC6dPQAHilYlmwpQgN_Ng4a-EZnhSWWfGilFJzJ3gAKT_eGG6BfA/exec';
    fetch(url)
      .then(response => response.json())
      .then(data => callback(data))
      .catch(error => console.error("Error al obtener datos:", error));
  }