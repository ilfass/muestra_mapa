# Mapa Dinámico de Acuerdos Internacionales

Plugin de WordPress que muestra un mapa interactivo de acuerdos internacionales utilizando LeafletJS y datos de Google Sheets.

## 🎯 Características

- Mapa interactivo con LeafletJS
- Datos en tiempo real desde Google Sheets
- Geocodificación automática de universidades
- Filtros dinámicos por país y tipo de acuerdo
- Marcadores personalizados
- Diseño responsivo
- Caché local para optimizar rendimiento

## 📋 Requisitos

- WordPress 5.0 o superior
- Google Sheets con datos de acuerdos
- Google Apps Script desplegado como web app

## 🚀 Instalación

1. Clonar el repositorio en la carpeta de plugins de WordPress:
```bash
cd wp-content/plugins
git clone https://github.com/ilfass/muestra_mapa.git
```

2. Activar el plugin desde el panel de WordPress

3. Configurar el Google Apps Script:
   - Copiar el contenido de `Code.gs` a un nuevo proyecto de Google Apps Script
   - Desplegar como aplicación web
   - Copiar la URL de despliegue

4. Insertar el shortcode en cualquier página:
```
[mapa_dinamico sheet_id="ID_DE_LA_HOJA" sheet_name="NOMBRE_HOJA" filtro="País"]
```

## 📁 Estructura del Proyecto

```
muestra_mapa/
├── Code.gs                 # Script de Google Apps
├── mapa-shortcode.php      # Shortcode de WordPress
├── js/
│   ├── main.js            # Inicialización principal
│   ├── data-loader.js     # Carga de datos desde Sheets
│   ├── map-manager.js     # Gestión del mapa
│   ├── geocoder.js        # Servicio de geocodificación
│   └── cache-manager.js   # Gestión de caché
├── css/
│   └── estilos.css        # Estilos del mapa
└── README.md              # Documentación
```

## 🔧 Configuración

### Google Sheets
La hoja de cálculo debe contener las siguientes columnas:
- Universidad contraparte
- País
- Tipo de acuerdo
- Fecha
- Estado
- Información adicional

### Google Apps Script
1. Crear nuevo proyecto
2. Copiar contenido de `Code.gs`
3. Desplegar como aplicación web
4. Configurar permisos de acceso

## 🎨 Personalización

### Estilos
Los estilos se pueden personalizar editando `css/estilos.css`

### Marcadores
Los marcadores se pueden personalizar en `js/map-manager.js`

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## ✨ Créditos

- [Leaflet](https://leafletjs.com/) - Biblioteca de mapas
- [Nominatim](https://nominatim.org/) - Servicio de geocodificación
- [Google Apps Script](https://developers.google.com/apps-script) - Backend
