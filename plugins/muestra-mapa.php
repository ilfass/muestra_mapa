<?php
/*
Plugin Name: Mapa Dinámico v3
Version: 1.3
Description: Mapa interactivo con clustering y carga dinámica desde Google Sheets
Author: Fabián de Haro
*/

add_shortcode('mapa_v3', function($atts) {
    $defaults = [
        'sheet' => 'https://script.google.com/macros/s/AKfycbz7hnoTbnWoqhewS_9_v_lsXKulb6D3iztuUr5al6Jq8J6BAJJErKxdw2Mnh3-1veo/exec',
        'filtro' => 'País',
        'theme' => 'light'
    ];
    
    $args = shortcode_atts($defaults, $atts);
    
    // Validación reforzada
    if (!preg_match('/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{30,}\/exec$/', $args['sheet'])) {
        error_log('[Mapa Dinámico] URL inválida: ' . $args['sheet']);
        return '<div class="mapa-error">❌ Error: Formato URL incorrecto</div>';
    }
    
    // Sanitización profesional
    $safe = [
        'sheet' => esc_url_raw($args['sheet']),
        'filtro' => sanitize_key(str_replace(' ', '_', $args['filtro'])),
        'theme' => in_array(strtolower($args['theme']), ['light', 'dark']) ? strtolower($args['theme']) : 'light'
    ];
    
    // Gestión de recursos
    $version = filemtime(__FILE__);
    $resources = [
        'leaflet' => [
            'js' => 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
            'css' => 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css'
        ],
        'markercluster' => [
            'js' => 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
            'css' => 'https://ilfass.github.io/muestra_mapa/css/cluster.css'
        ]
    ];
    
    wp_enqueue_style('leaflet-main', $resources['leaflet']['css'], [], '1.7.1');
    wp_enqueue_style('leaflet-cluster', $resources['markercluster']['css'], [], '1.4.1');
    wp_enqueue_style('mapa-css', 'https://ilfass.github.io/muestra_mapa/css/estilos.css', [], $version);
    
    wp_enqueue_script('leaflet-core', $resources['leaflet']['js'], [], '1.7.1', true);
    wp_enqueue_script('leaflet-cluster', $resources['markercluster']['js'], ['leaflet-core'], '1.4.1', true);
    wp_enqueue_script('mapa-main', 'https://ilfass.github.io/muestra_mapa/js/main.js', ['leaflet-core', 'leaflet-cluster'], $version, true);
    
    return sprintf(
        '<div class="mapa-container theme-%s" 
            data-sheet="%s"
            data-filter="%s"
            style="height: 65vh; min-height: 500px; border-radius: 12px; margin: 1.5rem 0;">
            <div class="mapa-loading">⌛ Cargando datos...</div>
        </div>',
        $safe['theme'],
        $safe['sheet'],
        $safe['filtro']
    );
});