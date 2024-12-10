function add_mls_integration_script() {
    if (is_page('advanced-search')) {
        wp_enqueue_script(
            'mls-integration',
            get_stylesheet_directory_uri() . '/js/wordpress-integration.js',
            array('jquery'), // añadir jQuery como dependencia
            '1.0.0',
            true
        );
        
        // Añadir variables localizadas
        wp_localize_script('mls-integration', 'mlsConfig', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'homeUrl' => home_url(),
            'nonce' => wp_create_nonce('mls-integration')
        ));
    }
}
add_action('wp_enqueue_scripts', 'add_mls_integration_script');