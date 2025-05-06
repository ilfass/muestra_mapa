<?php
/*
Plugin Name: Mapa de Universidades
Description: Muestra un mapa interactivo de universidades usando Google Maps
Version: 1.0
Author: Tu Nombre
*/

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Registrar shortcode
function mapa_universidades_shortcode($atts) {
    // Extraer atributos
    $atts = shortcode_atts(array(
        'sheet' => '', // URL del Google Sheet
    ), $atts);

    // Verificar que se proporcionó la URL del sheet
    if (empty($atts['sheet'])) {
        return '<p style="color: red;">Error: Debes proporcionar la URL del Google Sheet usando el atributo "sheet"</p>';
    }

    // Generar ID único para el contenedor
    $container_id = 'mapa-universidades-' . uniqid();

    // Incluir los archivos CSS y JS necesarios
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), null, true);
    wp_enqueue_script('geocoder-js', 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js', array('leaflet-js'), null, true);
    wp_enqueue_script('data-loader-js', plugins_url('js/data-loader.js', __FILE__), array('leaflet-js', 'geocoder-js'), null, true);

    // Construir el HTML
    $html = '
    <div id="' . esc_attr($container_id) . '" style="height: 600px; width: 100%;"></div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Configurar el mapa
            const map = L.map("' . esc_js($container_id) . '").setView([0, 0], 2);
            
            // Agregar capa de OpenStreetMap
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors"
            }).addTo(map);

            // Inicializar el geocoder
            window.geocoder = L.Control.geocoder({
                defaultMarkGeocode: false,
                geocoder: L.Control.Geocoder.nominatim()
            });

            // Inicializar el cargador de datos
            const dataLoader = new DataLoader();
            
            // Cargar datos
            dataLoader.loadData("' . esc_js($atts['sheet']) . '")
                .then(data => {
                    console.log("Datos cargados exitosamente:", data);
                })
                .catch(error => {
                    console.error("Error cargando datos:", error);
                    document.getElementById("' . esc_js($container_id) . '").innerHTML = 
                        "<p style=\'color: red; padding: 20px;\'>Error cargando datos: " + 
                        esc_js($error->getMessage()) + "</p>";
                });
        });
    </script>';

    return $html;
}
add_shortcode('mapa_v3', 'mapa_universidades_shortcode'); 