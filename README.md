# 🎬 CineLumina — Buscador Dinámico de Películas

Una aplicación web moderna, interactiva y creativa para la búsqueda de películas y producciones cinematográficas en tiempo real, desarrollada con **HTML5 semántico**, **CSS3 con Glassmorphism y diseño Aurora**, y **Vanilla JavaScript (ES6+)** utilizando la API nativa `fetch()`.

---

## 🌟 Características Principales y Creatividad en el Diseño

A diferencia de las interfaces típicas de fondo negro plano, **CineLumina** implementa una estética de **Cine de Lujo / Editorial**:
- **Ambiente Lumínico Dinámico (Aurora Glow):** Orbes de luz con movimiento fluido y desenfoque gausiano de fondo.
- **Micro-interacciones y Animaciones Fluidas:** Efecto de elevación e inclinación suave al pasar el cursor sobre las tarjetas de películas.
- **Skeleton Loaders:** Animaciones de carga con efecto *shimmer* mientras se procesa la solicitud a la API.
- **Diseño Glassmorphism:** Superficies translúcidas con `backdrop-filter: blur()`, bordes sutiles y gradientes inspirados en neón y violeta cósmico.
- **Sugerencias Rápidas (Chips):** Acceso inmediato con un clic a búsquedas populares (*Interstellar, The Batman, Dune, Spider-Man, Breaking Bad, El Padrino*).
- **Modal Cinematográfico Lightbox:** Vista detallada de la película con sinopsis completa, géneros, calificación en estrellas y enlace oficial.
- **Prevención de XSS y Buenas Prácticas:** Escape de caracteres HTML, sanitización de etiquetas del API y manejo de accesibilidad por teclado (`Tab`, `Enter`, `Escape`).

---

## 📐 Cumplimiento Paso a Paso de los Requerimientos

### 🔹 Paso 1: Crear la estructura básica
- **Archivo HTML:** estructurado semánticamente con `<header>`, `<main>`, `<section>`, `<article>` y `<footer>`.
- **Campo de texto:** `<input type="text" id="movie-input" placeholder="...">` con botón de limpieza rápida (`✕`).
- **Botón que dice Buscar:** `<button type="submit" id="search-btn">Buscar →</button>`.
- **Espacio vacío para resultados:** `<div id="results-grid" class="movies-grid"></div>` preparado para recibir los elementos creados dinámicamente.

### 🔹 Paso 2: Conectar con la API
- **Función `fetch()`:** Implementada con `async/await` para realizar solicitudes HTTP GET asíncronas.
- **Construcción dinámica de URL:**
  ```javascript
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
  ```
  Se utiliza `encodeURIComponent()` para garantizar que títulos con espacios, acentos o caracteres especiales se envíen correctamente.
- **Disparo del evento:** Se escucha el evento `submit` del formulario, activándose tanto al hacer clic en el botón **Buscar** como al pulsar la tecla `Enter`.
- **Prevención de recarga:** Se invoca `e.preventDefault()` para mantener la experiencia de Single Page Application (SPA).

### 🔹 Paso 3: Mostrar los resultados
Cada tarjeta creada y añadida al DOM muestra:
1. **Título de la película:** Extraído de la propiedad del modelo (`movie.title`).
2. **Año de lanzamiento:** Extraído de la fecha de estreno formateada a 4 dígitos (`movie.year`).
3. **Sinopsis o descripción:** Extraída y limpiada de etiquetas HTML (`movie.synopsis`).
4. **Extras añadidos:** Calificación ⭐, póster con resolución adaptativa (y fallback elegante si no existe imagen) y etiquetas de géneros.

### 🔹 Paso 4: Manejar errores
- **Película no encontrada:** Si la API devuelve un arreglo vacío `[]`, se activa la vista con el mensaje `"Película no encontrada"`, sugiriendo revisar la ortografía.
- **Error de conexión / red:** Si el usuario no tiene internet o el servidor falla, el bloque `catch` activa un estado de `"Error de conexión"` con un botón para **Reintentar conexión**.
- **Campo vacío:** Validación preventiva que avisa al usuario antes de enviar peticiones innecesarias.
- **Actualización dinámica sin recarga:** Todo el flujo manipula el árbol del DOM en tiempo real mediante `appendChild`, `innerHTML` controlado y cambios de clases CSS.

---

## 🔌 Compatibilidad Dual de APIs (TVmaze + TMDB)

La aplicación cuenta con un **patrón adaptador** que soporta dos proveedores:

1. **TVmaze (Por defecto • Inmediato y sin clave):**
   - 100% público, sin límites restrictivos ni necesidad de registro.
   - CORS habilitado de forma nativa.
   - Funciona al instante simplemente abriendo `index.html`.

2. **The Movie Database (TMDb - Opcional):**
   - Selector en la barra superior para cambiar a **TMDb**.
   - Permite al usuario o evaluador pegar su propia `API Key v3` gratuita mediante un modal de configuración, guardándola de forma segura en `localStorage`.

---

## 📁 Estructura del Proyecto

```
movie-finder/
├── index.html        # Estructura semántica HTML5, estados y modales
├── style.css         # Sistema de diseño, Glassmorphism, animaciones y CSS Grid
├── app.js            # Lógica con fetch(), consumo de JSON, DOM y manejo de errores
└── README.md         # Documentación técnica completa
```

---

## 🚀 Cómo Ejecutar la Página

No requiere instalación de librerías ni dependencias (cero dependencias externas):

1. **Opción Directa:**
   - Haz doble clic sobre el archivo [`index.html`] para abrirlo directamente en cualquier navegador (Chrome, Edge, Firefox, Safari).

2. **Opción Servidor Local (Recomendado para desarrollo):**
   - Usando la extensión **Live Server** de VS Code.
   - O mediante terminal con Python o Node:
     ```bash
     # Con Python 3
     python -m http.server 8000
     
     # Con npx (Node)
     npx serve .
     ```
   - Abre `http://localhost:8000` en tu navegador.
  
----
## 🎨 Creador

- **Nombre:**: Edgar Alexander Constanza Jovel.
- **Grupo:**: Desarrollador Web Front End "WDFRT2".
- **Actividad: **: Buscador de peliculas.
