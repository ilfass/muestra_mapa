// datos-v2.js
// 🗂 Este archivo se encarga de traer los datos desde un Google Sheet publicado como JSON

// 🖐 Función principal del sistema actual: obtiene los datos usando una URL por defecto o la que viene desde el shortcode PHP
async function obtenerDatos() {
  // 🧩 Esta es la URL por defecto (podés cambiarla si trabajás con otro Sheet)
  const defaultURL = 'https://script.google.com/macros/s/AKfycbz7hnoTbnWoqhewS_9_v_lsXKulb6D3iztuUr5al6Jq8J6BAJJErKxdw2Mnh3-1veo/exec';
  
  // 🧩 Si el PHP del plugin define una variable global "googleSheetURL", la usamos
  const url = typeof googleSheetURL !== 'undefined' ? googleSheetURL : defaultURL;

  try {
    const respuesta = await fetch(url); // 📨 Llamamos al endpoint
    const datos = await respuesta.json(); // 📦 Convertimos la respuesta a JSON
    return datos; // ✅ Devolvemos los datos al resto del sistema
  } catch (error) {
    console.error("❌ Error al obtener datos desde la URL:", error);
    return []; // ❗️Devolvemos un array vacío si hay error, así el código que lo usa no falla
  }
}

// 🧰 Función auxiliar más genérica: podés usarla si querés pasar la URL directamente como parámetro
// 📌 Útil si necesitás pedir datos de otro sheet desde otro lugar del sistema
async function obtenerDatosDesdeGoogleSheet(url) {
  try {
    const respuesta = await fetch(url); // 📨 Pedimos los datos
    const datos = await respuesta.json(); // 📦 Parseamos el JSON
    return datos; // ✅ Devolvemos los datos
  } catch (error) {
    console.error("❌ Error al obtener datos del Google Sheet:", error);
    return []; // ❗️Mismo tratamiento de error
  }
}