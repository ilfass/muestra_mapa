document.addEventListener("DOMContentLoaded", () => {
    inicializarMapa();
    obtenerDatosDesdeSheet(datos => {
      const paises = new Set();
  
      datos.forEach(d => {
        paises.add(d.Pais);
        agregarMarcador(d);
      });
  
      const filtro = document.getElementById("filtro-pais");
      [...paises].sort().forEach(p => {
        const opcion = document.createElement("option");
        opcion.value = p;
        opcion.textContent = p;
        filtro.appendChild(opcion);
      });
  
      filtro.addEventListener("change", e => {
        filtrarPorPais(e.target.value);
      });
    });
  });