# Mapa Dinámico para WordPress

Plugin de WordPress para mostrar un mapa interactivo con datos de Google Sheets usando LeafletJS.

## Características

- 🌍 Muestra datos de cualquier hoja de cálculo pública de Google Sheets
- 📍 Geolocalización automática usando Nominatim
- 🔄 Sistema de caché para coordenadas
- 🌐 Filtros por país
- 🎨 Diseño responsive y personalizable
- 📱 Compatible con dispositivos móviles

## Instalación

1. Descarga el plugin y colócalo en la carpeta `wp-content/plugins/` de tu instalación de WordPress
2. Activa el plugin desde el panel de administración de WordPress
3. Usa el shortcode `[mapa_dinamico sheet="ID_DE_TU_HOJA"]` en cualquier página o post

## Uso

### Shortcode Básico
```
[mapa_dinamico sheet="ID_DE_TU_HOJA"]
```

### Estructura de la Hoja de Cálculo

La hoja de cálculo debe tener las siguientes columnas:
- `Universidad Contraparte` o `Nombre`: Nombre de la institución a geolocalizar
- `País`: País de la institución (para filtros)
- Cualquier otra columna se mostrará en el popup del marcador

### Personalización

El plugin incluye estilos CSS personalizables. Puedes sobrescribirlos en tu tema:

```css
.mapa-dinamico {
    height: 500px;
    width: 100%;
}

.mapa-dinamico .info {
    /* Estilos del popup */
}

.mapa-dinamico-filtros select {
    /* Estilos del selector de países */
}
```

## Versiones

- Plugin: 1.0.0
- JavaScript: 1.0.0
- Leaflet: 1.9.3

## Contribuir

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Soporte

Si encuentras algún problema o tienes sugerencias, por favor:
1. Revisa la [documentación](https://github.com/ilfass/muestra_mapa/wiki)
2. Abre un issue en GitHub
3. Contacta al equipo de soporte
