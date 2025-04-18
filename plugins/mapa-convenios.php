<?php
/**
 * Plugin Name: Mapa de Convenios Internacionales
 * Description: Muestra un mapa interactivo con datos desde Google Sheets. Permite usar múltiples hojas usando shortcodes.
 * Version: 1.1
 * Author: Fabián de Haro
 */

 function mapa_convenios_scripts_remotos() {
    if (!is_singular()) return; // Solo carga scripts en páginas o entradas individuales

    // Estilos
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], null);
    wp_enqueue_style('mapa-style', 'https://ilfass.github.io/muestra_mapa/css/styles.css', [], null);

    // Scripts
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], null, true);
    wp_enqueue_script('helpers-js', 'https://ilfass.github.io/muestra_mapa/js/helpers.js', ['leaflet-js'], null, true);
    wp_enqueue_script('datos-js', 'https://ilfass.github.io/muestra_mapa/js/datos.js', ['helpers-js'], null, true);
    wp_enqueue_script('mapa-js', 'https://ilfass.github.io/muestra_mapa/js/mapa.js', ['datos-js'], null, true);
    wp_enqueue_script('main-js', 'https://ilfass.github.io/muestra_mapa/js/main.js', ['mapa-js'], null, true);
}
add_action('wp_enqueue_scripts', 'mapa_convenios_scripts_remotos');


function mapa_convenios_shortcode($atts) {
    $atts = shortcode_atts([
        'sheet' => '',
    ], $atts);

    $output = '<div id="map" class="mapa-convenios" style="width: 100%; height: 600px;"></div>';
    $output .= '<p id="mensaje-debug">🧪 El contenedor del mapa fue generado</p>';


    if (!empty($atts['sheet'])) {
        $sheet_url = esc_url($atts['sheet']);
        $output = "<script>var googleSheetURL = '$sheet_url';</script>" . $output;
    }

    return $output;
}
add_shortcode('mapa_convenios', 'mapa_convenios_shortcode');
