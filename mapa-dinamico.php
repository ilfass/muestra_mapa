<?php
/**
 * Plugin Name: Mapa Dinámico
 * Description: Muestra un mapa interactivo con datos de Google Sheets usando LeafletJS.
 * Version: 1.0.2
 * Author: Fabian Ariel de Haro
 * 
 * Características:
 * - Genérico: funciona con cualquier hoja de cálculo pública
 * - Geolocalización automática usando Nominatim
 * - Sistema de caché para coordenadas en localStorage
 * - Filtros por país
 * - Filtros por país
 * - Código modular y versionado
 * - Manejo de errores robusto
 * - Prueba 3
 */

defined('ABSPATH') or die('No script kiddies please!');

// 🟩 Cargar scripts y estilos
function mapa_dinamico_enqueue_assets() {
    // Leaflet CSS y JS
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css', [], '1.9.3');
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js', [], '1.9.3', true);

    // Leaflet.MarkerCluster CSS y JS
    wp_enqueue_style('leaflet-markercluster-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', [], '1.5.3');
    wp_enqueue_style('leaflet-markercluster-default-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css', [], '1.5.3');
    wp_enqueue_script('leaflet-markercluster-js', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', ['leaflet-js'], '1.5.3', true);

    // Script principal desde jsDelivr (CDN)
    wp_enqueue_script(
        'mapa-dinamico-js',
        plugins_url('js/mapa-dinamico.js', __FILE__),
        ['leaflet-js', 'leaflet-markercluster-js'],
        time(),
        true
    );

    // Configuración global
    wp_localize_script('mapa-dinamico-js', 'MapaDinamico', [
        'geocodingDelay' => 1000,
        'nominatimUrl' => 'https://nominatim.openstreetmap.org/search',
        'maxRetries' => 3,
        'chunkSize' => 3,
        'debug' => true
    ]);
}
add_action('wp_enqueue_scripts', 'mapa_dinamico_enqueue_assets');

// 🟦 Estilos CSS personalizados
function mapa_dinamico_styles() {
    ?>
    <style>
        .mapa-dinamico-container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .mapa-dinamico {
            height: 600px;
            width: 100%;
            border-radius: 8px;
            overflow: hidden;
        }
        .mapa-dinamico .info {
            padding: 10px 15px;
            font: 14px/1.4 Arial, Helvetica, sans-serif;
            background: white;
            background: rgba(255,255,255,0.95);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            border-radius: 5px;
            max-width: 300px;
        }
        .mapa-dinamico .info h4 {
            margin: 0 0 8px;
            color: #2c3e50;
            font-size: 16px;
            font-weight: bold;
        }
        .mapa-dinamico-filtros {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .mapa-dinamico-filtros select,
        .mapa-dinamico-filtros input {
            padding: 10px 15px;
            border-radius: 6px;
            border: 1px solid #ddd;
            font-size: 14px;
            min-width: 200px;
            background: #fff;
        }
        .mapa-dinamico-filtros input {
            flex: 1;
            min-width: 300px;
        }
        .mapa-dinamico-filtros select:focus,
        .mapa-dinamico-filtros input:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 5px rgba(52,152,219,0.3);
        }
        .cluster-count {
            background: #3498db;
            color: white;
            border-radius: 50%;
            padding: 5px 10px;
            font-weight: bold;
        }
        @media (max-width: 768px) {
            .mapa-dinamico-container {
                padding: 10px;
            }
            .mapa-dinamico {
                height: 400px;
            }
            .mapa-dinamico-filtros {
                flex-direction: column;
            }
            .mapa-dinamico-filtros select,
            .mapa-dinamico-filtros input {
                width: 100%;
                min-width: 100%;
            }
        }
        #mapa-dinamico .custom-marker {
            cursor: pointer;
        }

        .leaflet-popup-content {
            font-size: 14px;
            line-height: 1.4;
        }

        /* Estilos para los clusters */
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
            background-color: rgba(52, 152, 219, 0.6);
        }
        .marker-cluster-small div,
        .marker-cluster-medium div,
        .marker-cluster-large div {
            background-color: rgba(52, 152, 219, 0.8);
            color: white;
            font-weight: bold;
            text-align: center;
            border-radius: 50%;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .marker-cluster-small div {
            width: 30px;
            height: 30px;
        }
        .marker-cluster-medium div {
            width: 40px;
            height: 40px;
        }
        .marker-cluster-large div {
            width: 50px;
            height: 50px;
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
            <input type="text" id="buscador-mapa" placeholder="Buscar universidad...">
            <select id="filtro-pais">
                <option value="">Todos los países</option>
            </select>
        </div>
        <div id="mapa-dinamico-container" class="mapa-dinamico" data-sheet-id="<?php echo esc_attr($atts['sheet']); ?>"></div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('mapa_dinamico', 'mapa_dinamico_shortcode'); 