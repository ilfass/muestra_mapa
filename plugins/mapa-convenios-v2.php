<?php
/**
 * Plugin Name: Mapa de Convenios Internacionales v2
 * Description: Muestra un mapa interactivo con datos desde Google Sheets, con soporte para múltiples filtros.
 * Version: 2.0
 * Author: Fabián de Haro
 */

function mapa_convenios_v2_scripts() {
    if (!is_singular()) return;

    // Estilos
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], null);
    wp_enqueue_style('mapa-v2-style', plugins_url('css/styles-v2.css', __FILE__), [], null);

    // Scripts
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], null, true);
    wp_enqueue_script('mapa-v2-main-js', plugins_url('js/main-v2.js', __FILE__), ['leaflet-js'], null, true);

    // Datos para JS
    $sheet_url = get_option('mapa_convenios_v2_sheet_url', '');
    wp_localize_script('mapa-v2-main-js', 'mapaConveniosV2Data', [
        'defaultSheet' => $sheet_url,
    ]);
}
add_action('wp_enqueue_scripts', 'mapa_convenios_v2_scripts');

function mapa_convenios_v2_shortcode($atts) {
    $atts = shortcode_atts([
        'sheet' => '',
        'filtro' => 'País', // 👈 NUEVO: permite cambiar el filtro
    ], $atts);

    $sheet_url = esc_url($atts['sheet']);
    $columna_filtro = esc_js($atts['filtro']); // 👈 NUEVO: sanitizamos la entrada

    ob_start();
    ?>
    <div class="contenedor-mapa">
        <div id="map-v2" style="height: 600px;"></div>
    </div>

    <script>
        var googleSheetURL = "<?php echo $sheet_url; ?>";
        var columnaFiltro = "<?php echo $columna_filtro; ?>"; // 👈 NUEVO: pasamos la columna a JS
    </script>
    <p style="font-size: 0.9em; color: gray;">🧪 Mapa de Convenios V2 activo con filtro: <strong><?php echo esc_html($columna_filtro); ?></strong></p>
    <?php
    return ob_get_clean();
}
add_shortcode('mapa_convenios_v2', 'mapa_convenios_v2_shortcode');
