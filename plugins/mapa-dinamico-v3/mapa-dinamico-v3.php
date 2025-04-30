<?php
/**
 * Plugin Name: Mapa Dinámico v3
 * Description: Muestra un mapa interactivo con datos de universidades desde Google Sheets
 * Version: 1.0.0
 * Author: Fabián Ariel de Haro
 */

if (!defined('ABSPATH')) exit;

class MapaDinamicoV3 {
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_shortcode('mapa_v3', array($this, 'render_mapa'));
    }

    public function init() {
        // Registrar scripts y estilos desde GitHub Pages
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
    }

    public function register_assets() {
        // 🖐️ Cargamos Leaflet desde CDN
        wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), null, true);
        
        // 🖐️ Cargamos MarkerCluster
        wp_enqueue_style('markercluster-css', 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css');
        wp_enqueue_style('markercluster-default-css', 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css');
        wp_enqueue_script('markercluster-js', 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js', array('leaflet-js'), null, true);

        // 🖐️ Cargamos Locate Control
        wp_enqueue_style('leaflet-locate-css', 'https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.79.0/dist/L.Control.Locate.min.css');
        wp_enqueue_script('leaflet-locate-js', 'https://cdn.jsdelivr.net/npm/leaflet.locatecontrol@0.79.0/dist/L.Control.Locate.min.js', array('leaflet-js'), null, true);

        // 🖐️ Cargamos Font Awesome para los iconos
        wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');

        // 🖐️ Cargamos nuestros archivos desde GitHub Pages
        wp_enqueue_style('mapa-v3-css', 'https://ilfass.github.io/muestra_mapa/css/estilos.css');
        
        // Scripts modulares
        $scripts = array(
            'cache-manager' => 'cache-manager.js',
            'geocoder' => 'geocoder.js',
            'data-loader' => 'data-loader.js',
            'map-manager' => 'map-manager.js',
            'main' => 'main.js'
        );

        foreach ($scripts as $handle => $script) {
            wp_enqueue_script(
                "mapa-v3-$handle",
                "https://ilfass.github.io/muestra_mapa/js/$script",
                array('leaflet-js', 'markercluster-js', 'leaflet-locate-js'),
                null,
                true
            );
        }
    }

    public function render_mapa($atts) {
        // Procesar atributos del shortcode
        $atts = shortcode_atts(array(
            'sheet' => '',
            'filtro' => 'País'
        ), $atts);

        // Validar URL del sheet
        if (empty($atts['sheet'])) {
            return '<p>Error: URL del Google Sheet no especificada</p>';
        }

        // 🖐️ Pasar datos al JavaScript
        wp_localize_script('mapa-v3-main', 'mapaConfig', array(
            'sheetUrl' => $atts['sheet'],
            'filtroDefault' => $atts['filtro']
        ));

        // Contenedor del mapa
        return '<div class="mapa-container">
                    <div id="mapa-filtros" class="filtros-container"></div>
                    <div id="mapa-busqueda" class="busqueda-container">
                        <input type="text" id="buscar-universidad" placeholder="Buscar universidad...">
                    </div>
                    <div id="mapa-v3" class="mapa"></div>
                </div>';
    }
}

// Inicializar el plugin
new MapaDinamicoV3(); 