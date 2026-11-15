/**
 * ==============================================================================
 * CineLumina — Lógica de Aplicación y Conexión a API Pública
 * 
 * Cumplimiento de requerimientos:
 * 1. Estructura básica y selectores del DOM
 * 2. Conexión a API mediante fetch(), construcción dinámica de URLs y prevención de recarga
 * 3. Renderizado en el DOM de Título, Año y Sinopsis (más póster y detalles)
 * 4. Manejo completo de errores (No encontrada, Error de red, Validación vacía)
 * 5. Buenas prácticas: Arquitectura desacoplada, async/await y sanitización
 * ==============================================================================
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
// ==========================================
const CONFIG = {
  // Clave opcional para TMDb (puede configurarse en la UI y se guarda en localStorage)
  tmdbApiKey: localStorage.getItem('cinelumica_tmdb_key') || '',
  // Fuente activa por defecto: 'tvmaze' (100% pública, no requiere API key ni registros)
  activeSource: localStorage.getItem('cinelumina_source') || 'tvmaze',
  tmdbImageBase: 'https://image.tmdb.org/t/p/w500',
  defaultLanguage: 'es-ES'
};

// Estado centralizado de la app
const state = {
  currentQuery: '',
  movies: [],
  isLoading: false,
  selectedMovie: null
};

// ==========================================
// 2. REFERENCIAS A ELEMENTOS DEL DOM
// ==========================================
const DOM = {
  // Formulario y Controles de búsqueda
  searchForm: document.getElementById('search-form'),
  movieInput: document.getElementById('movie-input'),
  searchBtn: document.getElementById('search-btn'),
  clearInputBtn: document.getElementById('clear-input-btn'),
  tagChips: document.querySelectorAll('.tag-chip'),

  // Selector y Configuración de Fuente de Datos
  apiSourceSelect: document.getElementById('api-source-select'),
  apiConfigBtn: document.getElementById('api-config-btn'),
  apiModal: document.getElementById('api-modal'),
  apiModalClose: document.getElementById('api-modal-close'),
  tmdbKeyInput: document.getElementById('tmdb-key-input'),
  saveApiKeyBtn: document.getElementById('save-api-key-btn'),
  useTvmazeFallbackBtn: document.getElementById('use-tvmaze-fallback-btn'),
  currentSourcePill: document.getElementById('current-source-pill'),

  // Secciones y Estados de Visualización
  resultsHeader: document.getElementById('results-header'),
  resultsCountText: document.getElementById('results-count-text'),
  activeQueryBadge: document.getElementById('active-query-badge'),
  resultsGrid: document.getElementById('results-grid'),
  initialState: document.getElementById('initial-state'),
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  errorTitle: document.getElementById('error-title'),
  errorDescription: document.getElementById('error-description'),
  errorEmoji: document.getElementById('error-emoji'),
  retryBtn: document.getElementById('retry-btn'),

  // Modal de Detalle
  movieModal: document.getElementById('movie-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalPoster: document.getElementById('modal-poster'),
  modalRating: document.getElementById('modal-rating'),
  modalRatingBadge: document.getElementById('modal-rating-badge'),
  modalYear: document.getElementById('modal-year'),
  modalTitle: document.getElementById('modal-title'),
  modalGenres: document.getElementById('modal-genres'),
  modalSynopsis: document.getElementById('modal-synopsis'),
  modalExternalLink: document.getElementById('modal-external-link')
};

// ==========================================
// 3. CAPA DE SERVICIO: LLAMADAS A LAS APIS (Paso 2)
// ==========================================

/**
 * Función principal para buscar películas usando la API fetch()
 * Construye la URL según la fuente seleccionada y maneja las respuestas JSON.
 * 
 * @param {string} query Término de búsqueda introducido por el usuario
 * @returns {Promise<Array>} Lista normalizada de películas
 */
async function fetchMovies(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Decidir qué proveedor de API utilizar
  if (CONFIG.activeSource === 'tmdb') {
    return await fetchFromTMDB(cleanQuery);
  } else {
    return await fetchFromTVmaze(cleanQuery);
  }
}

/**
 * Consulta a la API pública de TVmaze (Sin API Key requerida, CORS habilitado)
 */
async function fetchFromTVmaze(query) {
  // Construcción dinámica de la URL con encodeURIComponent para evitar errores con caracteres especiales
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;

  try {
    // Paso 2: Uso de fetch()
    const response = await fetch(url);

    // Validación de código de estado HTTP
    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status} ${response.statusText}`);
    }

    // Parseo de la respuesta en formato JSON
    const data = await response.json();

    // Normalización de los datos recibidos a un modelo estándar
    return data.map(item => {
      const show = item.show || {};
      
      // Limpiar etiquetas HTML de la sinopsis que entrega TVmaze
      const cleanSynopsis = stripHtml(show.summary) || 'Sin descripción disponible para este título.';

      return {
        id: `tvm-${show.id}`,
        title: show.name || 'Título desconocido',
        year: show.premiered ? show.premiered.slice(0, 4) : 'Año no disponible',
        synopsis: cleanSynopsis,
        poster: show.image ? (show.image.medium || show.image.original) : null,
        rating: show.rating && show.rating.average ? show.rating.average.toFixed(1) : null,
        genres: show.genres || [],
        externalUrl: show.url || `https://www.google.com/search?q=${encodeURIComponent(show.name + ' movie')}`,
        source: 'TVmaze'
      };
    });

  } catch (error) {
    // Propagación del error para que sea capturado y mostrado en la interfaz
    throw error;
  }
}

/**
 * Consulta a The Movie Database (TMDB v3 API)
 */
async function fetchFromTMDB(query) {
  // Si no hay API key configurada, advertimos al usuario
  if (!CONFIG.tmdbApiKey) {
    openApiConfigModal();
    throw new Error('CONFIG_REQUIRED: Se requiere una API Key de TMDB para consultar este servicio.');
  }

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(CONFIG.tmdbApiKey)}&query=${encodeURIComponent(query)}&language=${CONFIG.defaultLanguage}`;

  try {
    const response = await fetch(url);

    if (response.status === 401) {
      throw new Error('API_KEY_INVALID: La clave de TMDB proporcionada no es válida.');
    }

    if (!response.ok) {
      throw new Error(`Error en el servidor de TMDB: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results) {
      return [];
    }

    return data.results.map(movie => ({
      id: `tmdb-${movie.id}`,
      title: movie.title || movie.original_title || 'Título desconocido',
      year: movie.release_date ? movie.release_date.slice(0, 4) : 'Año no disponible',
      synopsis: movie.overview && movie.overview.trim() ? movie.overview : 'Sin sinopsis disponible en español.',
      poster: movie.poster_path ? `${CONFIG.tmdbImageBase}${movie.poster_path}` : null,
      rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
      genres: [],
      externalUrl: `https://www.themoviedb.org/movie/${movie.id}`,
      source: 'TMDB'
    }));

  } catch (error) {
    throw error;
  }
}

// ==========================================
// 4. MANIPULACIÓN DEL DOM Y RENDERIZADO (Paso 3)
// ==========================================

/**
 * Renderiza los resultados en el contenedor vacío del DOM (Paso 3)
 * @param {Array} movies Lista de películas a mostrar
 */
function renderResults(movies) {
  // Limpiar contenedor previo (manipulación del DOM)
  DOM.resultsGrid.innerHTML = '';

  // Actualizar contador y cabecera de resultados
  DOM.resultsHeader.style.display = 'flex';
  DOM.resultsCountText.textContent = `${movies.length} resultado${movies.length === 1 ? '' : 's'}`;
  DOM.activeQueryBadge.textContent = `"${state.currentQuery}"`;
  DOM.currentSourcePill.textContent = `API: ${CONFIG.activeSource === 'tmdb' ? 'The Movie Database' : 'TVmaze (Pública)'}`;

  // Iterar por cada película y crear su estructura en el DOM
  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, index);
    DOM.resultsGrid.appendChild(card);
  });

  // Mostrar la cuadrícula y ocultar otros estados
  DOM.resultsGrid.classList.remove('hidden');
  DOM.initialState.classList.add('hidden');
  DOM.loadingState.classList.add('hidden');
  DOM.errorState.classList.add('hidden');
}

/**
 * Crea el elemento HTML de una tarjeta de película con sanitización y eventos
 */
function createMovieCard(movie, index) {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.style.animationDelay = `${index * 0.05}s`;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Ver detalles de ${movie.title}`);

  // Poster con manejo seguro de imagen ausente
  const posterHTML = movie.poster 
    ? `<img src="${escapeHtml(movie.poster)}" alt="Póster de ${escapeHtml(movie.title)}" class="movie-poster" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'poster-fallback\\'><span class=\\'icon\\'>🎬</span><span>Sin póster</span></div>'">`
    : `<div class="poster-fallback"><span class="icon">🎬</span><span>Póster no disponible</span></div>`;

  // Rating badge
  const ratingHTML = movie.rating && movie.rating > 0
    ? `<div class="badge-rating">★ ${escapeHtml(movie.rating)}</div>`
    : '';

  // Chips de géneros
  const genresHTML = (movie.genres && movie.genres.length > 0)
    ? `<div class="card-genres">${movie.genres.slice(0, 3).map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('')}</div>`
    : '';

  card.innerHTML = `
    <div class="poster-container">
      ${posterHTML}
      <div class="card-badges-top">
        <span class="badge-year">${escapeHtml(movie.year)}</span>
        ${ratingHTML}
      </div>
      <div class="poster-gradient"></div>
    </div>
    
    <div class="card-content">
      <h3 class="card-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h3>
      ${genresHTML}
      <p class="card-synopsis">${escapeHtml(movie.synopsis)}</p>
      
      <div class="card-footer">
        <span class="details-link">Ver información completa →</span>
      </div>
    </div>
  `;

  // Evento al hacer clic o presionar Enter en la tarjeta
  const openDetails = () => openMovieModal(movie);
  card.addEventListener('click', openDetails);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetails();
    }
  });

  return card;
}

// ==========================================
// 5. GESTIÓN DE ESTADOS Y MANEJO DE ERRORES (Paso 4)
// ==========================================

/**
 * Muestra el estado de carga con skeletons animados
 */
function showLoading() {
  state.isLoading = true;
  DOM.resultsHeader.style.display = 'none';
  DOM.initialState.classList.add('hidden');
  DOM.resultsGrid.classList.add('hidden');
  DOM.errorState.classList.add('hidden');
  DOM.loadingState.classList.remove('hidden');

  DOM.searchBtn.disabled = true;
  DOM.searchBtn.style.opacity = '0.7';
}

/**
 * Oculta el estado de carga
 */
function hideLoading() {
  state.isLoading = false;
  DOM.loadingState.classList.add('hidden');
  DOM.searchBtn.disabled = false;
  DOM.searchBtn.style.opacity = '1';
}

/**
 * Maneja y muestra en pantalla los diferentes tipos de errores (Paso 4)
 */
function showError(type, customMessage = '') {
  hideLoading();
  DOM.resultsGrid.classList.add('hidden');
  DOM.resultsHeader.style.display = 'none';
  DOM.initialState.classList.add('hidden');
  DOM.errorState.classList.remove('hidden');

  if (type === 'NOT_FOUND') {
    // Si la película no existe (Requerimiento Paso 4)
    DOM.errorEmoji.textContent = '🔍';
    DOM.errorTitle.textContent = 'Película no encontrada';
    DOM.errorDescription.textContent = customMessage || `No encontramos ningún resultado para "${state.currentQuery}". Verifica que el título esté bien escrito o prueba con otro término.`;
    DOM.retryBtn.textContent = 'Intentar otra búsqueda';
    DOM.retryBtn.onclick = () => {
      DOM.movieInput.focus();
      DOM.movieInput.select();
    };
  } else if (type === 'EMPTY_INPUT') {
    // Validación de campo vacío
    DOM.errorEmoji.textContent = '✍️';
    DOM.errorTitle.textContent = 'Escribe un nombre para buscar';
    DOM.errorDescription.textContent = 'Por favor ingresa el título de la película o serie que deseas consultar.';
    DOM.retryBtn.textContent = 'Escribir ahora';
    DOM.retryBtn.onclick = () => DOM.movieInput.focus();
  } else if (type === 'CONFIG_ERROR') {
    // Falta clave en TMDB
    DOM.errorEmoji.textContent = '🔑';
    DOM.errorTitle.textContent = 'Configuración requerida';
    DOM.errorDescription.textContent = customMessage || 'Para usar TMDB necesitas ingresar tu clave API v3 gratuita, o puedes alternar a TVmaze que no requiere clave.';
    DOM.retryBtn.textContent = 'Abrir configuración de API';
    DOM.retryBtn.onclick = openApiConfigModal;
  } else {
    // Si ocurre un error de conexión (Requerimiento Paso 4)
    DOM.errorEmoji.textContent = '📡';
    DOM.errorTitle.textContent = 'Error de conexión';
    DOM.errorDescription.textContent = customMessage || 'No fue posible comunicarse con la API. Revisa tu conexión a internet o intenta nuevamente en unos momentos.';
    DOM.retryBtn.textContent = 'Reintentar conexión';
    DOM.retryBtn.onclick = () => executeSearch(state.currentQuery);
  }
}

// ==========================================
// 6. CONTROLADOR DE BÚSQUEDA Y FLUJO DE EVENTOS
// ==========================================

/**
 * Orquesta la búsqueda: valida, muestra loaders, hace el fetch y renderiza o maneja errores.
 */
async function executeSearch(query) {
  const searchTerm = (query || '').trim();

  // Validación: campo vacío
  if (!searchTerm) {
    showError('EMPTY_INPUT');
    DOM.movieInput.focus();
    return;
  }

  state.currentQuery = searchTerm;
  DOM.movieInput.value = searchTerm;
  toggleClearButton(true);

  // Paso 4: Actualización sin recargar la página
  showLoading();

  try {
    const movies = await fetchMovies(searchTerm);
    hideLoading();

    // Paso 4: Si la película no existe
    if (!movies || movies.length === 0) {
      showError('NOT_FOUND');
      return;
    }

    state.movies = movies;
    renderResults(movies);

  } catch (error) {
    console.error('Error durante la búsqueda de películas:', error);

    if (error.message && error.message.startsWith('CONFIG_REQUIRED')) {
      showError('CONFIG_ERROR', error.message.replace('CONFIG_REQUIRED: ', ''));
    } else if (error.message && error.message.startsWith('API_KEY_INVALID')) {
      showError('CONFIG_ERROR', 'La clave API de TMDB ingresada es inválida o expiró. Por favor verifícala.');
    } else {
      // Error de conexión o red
      showError('NETWORK_ERROR', 'Ocurrió un error al conectar con el servicio. Por favor comprueba tu conexión y vuelve a intentar.');
    }
  }
}

// ==========================================
// 7. VENTANAS MODALES (Detalle y Configuración)
// ==========================================

function openMovieModal(movie) {
  state.selectedMovie = movie;

  DOM.modalTitle.textContent = movie.title;
  DOM.modalYear.textContent = `Estreno: ${movie.year}`;
  DOM.modalSynopsis.textContent = movie.synopsis;
  DOM.modalExternalLink.href = movie.externalUrl;
  DOM.modalExternalLink.textContent = `Ver en ${movie.source} ↗`;

  if (movie.poster) {
    DOM.modalPoster.src = movie.poster;
    DOM.modalPoster.alt = `Póster de ${movie.title}`;
    DOM.modalPoster.style.display = 'block';
  } else {
    DOM.modalPoster.src = '';
    DOM.modalPoster.style.display = 'none';
  }

  if (movie.rating) {
    DOM.modalRating.textContent = movie.rating;
    DOM.modalRatingBadge.style.display = 'block';
  } else {
    DOM.modalRatingBadge.style.display = 'none';
  }

  // Géneros
  DOM.modalGenres.innerHTML = '';
  if (movie.genres && movie.genres.length > 0) {
    movie.genres.forEach(g => {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = g;
      DOM.modalGenres.appendChild(tag);
    });
  }

  DOM.movieModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
}

function closeMovieModal() {
  DOM.movieModal.classList.add('hidden');
  document.body.style.overflow = '';
  state.selectedMovie = null;
}

function openApiConfigModal() {
  DOM.tmdbKeyInput.value = CONFIG.tmdbApiKey;
  DOM.apiModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeApiConfigModal() {
  DOM.apiModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ==========================================
// 8. FUNCIONES DE UTILIDAD Y SANITIZACIÓN
// ==========================================

/**
 * Limpia etiquetas HTML provenientes de descripciones (como en TVmaze)
 */
function stripHtml(htmlString) {
  if (!htmlString) return '';
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  return (doc.body.textContent || '').trim();
}

/**
 * Sanitiza texto para evitar inyecciones XSS al insertar en el DOM
 */
function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toggleClearButton(forceShow) {
  const hasText = DOM.movieInput.value.trim().length > 0;
  if (forceShow !== undefined ? forceShow : hasText) {
    DOM.clearInputBtn.classList.remove('hidden');
  } else {
    DOM.clearInputBtn.classList.add('hidden');
  }
}

// ==========================================
// 9. INICIALIZACIÓN Y EVENT LISTENERS
// ==========================================

function initApp() {
  // Configurar valor inicial del selector de fuente
  DOM.apiSourceSelect.value = CONFIG.activeSource;

  // Paso 2: Evento al enviar el formulario (Clic en botón "Buscar" o presionar Enter)
  DOM.searchForm.addEventListener('submit', (e) => {
    // Prevenir la recarga del navegador (Requerimiento fundamental SPA)
    e.preventDefault();
    executeSearch(DOM.movieInput.value);
  });

  // Manejo de input y botón limpiar
  DOM.movieInput.addEventListener('input', () => {
    toggleClearButton();
  });

  DOM.clearInputBtn.addEventListener('click', () => {
    DOM.movieInput.value = '';
    toggleClearButton(false);
    DOM.movieInput.focus();
  });

  // Chips de sugerencia rápida
  DOM.tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      executeSearch(query);
    });
  });

  // Cambio de fuente de API (TVmaze vs TMDB)
  DOM.apiSourceSelect.addEventListener('change', (e) => {
    CONFIG.activeSource = e.target.value;
    localStorage.setItem('cinelumina_source', CONFIG.activeSource);

    if (CONFIG.activeSource === 'tmdb' && !CONFIG.tmdbApiKey) {
      openApiConfigModal();
    } else if (state.currentQuery) {
      // Re-ejecutar búsqueda actual con la nueva API
      executeSearch(state.currentQuery);
    }
  });

  // Botón abrir configuración
  DOM.apiConfigBtn.addEventListener('click', openApiConfigModal);
  DOM.apiModalClose.addEventListener('click', closeApiConfigModal);

  // Guardar clave TMDB
  DOM.saveApiKeyBtn.addEventListener('click', () => {
    const key = DOM.tmdbKeyInput.value.trim();
    CONFIG.tmdbApiKey = key;
    localStorage.setItem('cinelumica_tmdb_key', key);
    CONFIG.activeSource = 'tmdb';
    DOM.apiSourceSelect.value = 'tmdb';
    localStorage.setItem('cinelumina_source', 'tmdb');
    closeApiConfigModal();

    if (state.currentQuery) {
      executeSearch(state.currentQuery);
    }
  });

  // Fallback a TVmaze desde modal
  DOM.useTvmazeFallbackBtn.addEventListener('click', () => {
    CONFIG.activeSource = 'tvmaze';
    DOM.apiSourceSelect.value = 'tvmaze';
    localStorage.setItem('cinelumina_source', 'tvmaze');
    closeApiConfigModal();

    if (state.currentQuery) {
      executeSearch(state.currentQuery);
    }
  });

  // Cierre de modales con botón y fondo
  DOM.modalCloseBtn.addEventListener('click', closeMovieModal);
  DOM.movieModal.addEventListener('click', (e) => {
    if (e.target === DOM.movieModal) closeMovieModal();
  });
  DOM.apiModal.addEventListener('click', (e) => {
    if (e.target === DOM.apiModal) closeApiConfigModal();
  });

  // Soporte de tecla Escape para accesibilidad
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMovieModal();
      closeApiConfigModal();
    }
  });

  console.log('🎬 CineLumina inicializado correctamente. Conexión lista con TVmaze y TMDb.');
}

// Iniciar aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', initApp);
