# Mapa Dinámico para WordPress

✨ **¡Versión funcional estable!** 🟢🟢🟢

> **Versión recomendada:**
> - Tag: `v2024-06-11`
> - Fecha: 2024-06-11
> - Estado: FUNCIONAL y validada en producción

Plugin de WordPress para mostrar un mapa interactivo con datos de Google Sheets usando LeafletJS.

---

## 🚀 Mejoras y Cambios Recientes

- 🟩 **Inicialización robusta:** El mapa solo se crea cuando el contenedor está presente y el DOM está listo.
- 🟢 **Logs automáticos:** Validación automática de logs esperados en la consola, con resumen visual (✔️/❌).
- 🟦 **Sistema de caché:** Coordenadas cacheadas en localStorage para acelerar la carga.
- 🟧 **Clustering de marcadores:** Agrupación visual de marcadores con estilos personalizados.
- 🟨 **Procesamiento optimizado en chunks:** Manejo eficiente de grandes volúmenes de datos.
- 🟠 **Geocodificación optimizada:** Uso de múltiples proxies y reintentos inteligentes.
- 🟣 **Control de errores mejorado:** Logging avanzado y advertencias claras en consola.
- 🟤 **Código modular y limpio:** Separación de funciones, fácil de mantener y extender.
- 🟡 **Validación visual:** Resumen de logs esperados al cargar la página, para asegurar que todo funciona.

---

## Características

- 🌍 Muestra datos de cualquier hoja de cálculo pública de Google Sheets
- 📍 Geolocalización automática usando Nominatim
- 🔄 Sistema de caché para coordenadas
- 🌐 Filtros por país
- 🎨 Diseño responsive y personalizable
- 📱 Compatible con dispositivos móviles
- 📊 Sistema de logging avanzado
- ⏱️ Rate limiting para geocodificación
- 🔒 Manejo seguro de errores
- 🟦 Clustering de marcadores
- 🟨 Procesamiento optimizado en chunks
- 🟢 Validación automática de logs en consola

---

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
- `Latitud` y `Longitud` (opcional): Coordenadas directas
- `Enlace a OpenStreetMap` (opcional): Para extraer coordenadas
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

### Sistema de Logging y Validación

- El plugin incluye un sistema de logging avanzado que registra:
  - Información de inicialización
  - Errores de carga de datos
  - Advertencias de geocodificación
  - Eventos de caché
  - Errores de configuración
- **Validación automática de logs:** Al cargar la página, verás un resumen de logs esperados en la consola con ✔️ (verde) o ❌ (rojo) para cada mensaje clave.

---

## Versiones

- Plugin: 1.5.0
- JavaScript: 1.5.0
- Leaflet: 1.9.3

---

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
