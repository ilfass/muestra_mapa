<?php
/*
Plugin Name: Mapa dinámico v3
Description: Muestra un mapa interactivo cargando datos desde Google Sheets.
Version: 3.0
Author: Fabián de Haro @ilfass */

function mapa_v3_shortcode($atts) {
    $atts = shortcode_atts(array(
        'sheet' => '',
        'filtro' => 'País',
    ), $atts);

    // Encola el script principal sólo si se usa el shortcode
    add_action('wp_footer', function () use ($atts) {
        wp_enqueue_script('mapa-v3-main');

        wp_localize_script('mapa-v3-main', 'MapaV3Data', array(
            'sheet' => esc_url_raw($atts['sheet']),
            'filtro' => sanitize_text_field($atts['filtro']),
        ));
    });

    // Contenedor HTML limpio
    return '<div id="mapa-v3" class="mapa-v3-contenedor"></div>';
}
add_shortcode('mapa_v3', 'mapa_v3_shortcode');

function mapa_v3_enqueue_scripts() {
    // Leaflet desde CDN
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet/dist/leaflet.css');
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet/dist/leaflet.js', array(), null, true);

    // Tu CSS y JS desde GitHub Pages
    wp_enqueue_style('mapa-v3-css', 'https://ilfass.github.io/muestra_mapa/css/mapa.css');

    // Scripts en orden correcto
    wp_enqueue_script('mapa-v3-fetch', 'https://ilfass.github.io/muestra_mapa/js/fetchData.js', array(), null, true);
    wp_enqueue_script('mapa-v3-geocoder', 'https://ilfass.github.io/muestra_mapa/js/geocoder.js', array(), null, true);
    wp_enqueue_script('mapa-v3-renderer', 'https://ilfass.github.io/muestra_mapa/js/mapRenderer.js', array(), null, true);
    wp_enqueue_script('mapa-v3-filter', 'https://ilfass.github.io/muestra_mapa/js/filter.js', array(), null, true);
    wp_enqueue_script('mapa-v3-main', 'https://ilfass.github.io/muestra_mapa/js/main.js', array('jquery'), null, true);
}
add_action('wp_enqueue_scripts', 'mapa_v3_enqueue_scripts');
