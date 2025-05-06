<?php
/**
 * Plugin Name: Mapa Dinámico
 * Description: Muestra un mapa interactivo con datos de Google Sheets usando LeafletJS.
 * Version: 1.0.1
 * Author: Tu Nombre
 * 
 * Características:
 * - Genérico: funciona con cualquier hoja de cálculo pública
 * - Geolocalización automática usando Nominatim
 * - Sistema de caché para coordenadas en localStorage
 * - Filtros por país
 * - Código modular y versionado
 * - Manejo de errores robusto
 */

defined('ABSPATH') or die('No script kiddies please!');

// 🟩 Cargar scripts y estilos
function mapa_dinamico_enqueue_assets() {
    // Leaflet CSS y JS
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css', [], '1.9.3');
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js', [], '1.9.3', true);

    // Script principal desde jsDelivr (CDN)
    wp_enqueue_script(
        'mapa-dinamico-js',
        'https://cdn.jsdelivr.net/gh/ilfass/muestra_mapa@main/js/mapa-dinamico.js',
        ['leaflet-js'],
        '1.0.1',
        true
    );

    // Configuración global
    wp_localize_script('mapa-dinamico-js', 'MapaDinamico', [
        'geocodingDelay' => 1000,
        'nominatimUrl' => 'https://nominatim.openstreetmap.org/search',
        'ajaxUrl' => admin_url('admin-ajax.php')
    ]);
}
add_action('wp_enqueue_scripts', 'mapa_dinamico_enqueue_assets');

// 🟦 Estilos CSS personalizados
function mapa_dinamico_styles() {
    ?>
    <style>
        .mapa-dinamico {
            height: 500px;
            width: 100%;
            margin: 20px 0;
        }
        .mapa-dinamico .info {
            padding: 6px 8px;
            font: 14px/16px Arial, Helvetica, sans-serif;
            background: white;
            background: rgba(255,255,255,0.8);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            border-radius: 5px;
        }
        .mapa-dinamico .info h4 {
            margin: 0 0 5px;
            color: #777;
        }
        .mapa-dinamico-filtros {
            margin-bottom: 20px;
        }
        .mapa-dinamico-filtros select {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
    </style>
    <?php
}
add_action('wp_head', 'mapa_dinamico_styles');

// 🟨 Shortcode: [mapa_dinamico sheet="ID_DEL_SHEET"]
function mapa_dinamico_shortcode($atts) {
    $atts = shortcode_atts([
        'sheet' => ''
    ], $atts);

    if (!$atts['sheet']) {
        return '<p style="color:red;">⚠️ Faltó el atributo <code>sheet</code></p>';
    }

    ob_start();
    ?>
    <div class="mapa-dinamico-container">
        <div class="mapa-dinamico-filtros">
            <select id="filtro-pais">
                <option value="">Todos los países</option>
            </select>
        </div>
        <div id="mapa-dinamico" class="mapa-dinamico" data-sheet-id="<?php echo esc_attr($atts['sheet']); ?>"></div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('mapa_dinamico', 'mapa_dinamico_shortcode'); 