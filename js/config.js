/* js/config.js - Dynamic Configuration & API URL Resolution */
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiParam = urlParams.get('api');
  if (apiParam) {
    let cleanUrl = apiParam.trim();
    if (!cleanUrl.endsWith('/api') && !cleanUrl.endsWith('/api/')) {
      cleanUrl = cleanUrl.replace(/\/+$/, '') + '/api';
    }
    localStorage.setItem('EVENTOS_API_BASE', cleanUrl);
  }

  const defaultApi = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : (localStorage.getItem('EVENTOS_API_BASE') || 'http://localhost:3001/api');

  window.EVENTOS_CONFIG = {
    API_BASE: localStorage.getItem('EVENTOS_API_BASE') || defaultApi,
    getHealthUrl: function() {
      const base = window.EVENTOS_CONFIG.API_BASE || defaultApi;
      return base.replace(/\/api\/?$/, '') + '/health';
    },
    setApiBase: function(url) {
      if (!url) return;
      let clean = url.trim();
      if (!clean.endsWith('/api') && !clean.endsWith('/api/')) {
        clean = clean.replace(/\/+$/, '') + '/api';
      }
      localStorage.setItem('EVENTOS_API_BASE', clean);
      window.EVENTOS_CONFIG.API_BASE = clean;
      if (window.EventosAPI && typeof window.EventosAPI.checkHealth === 'function') {
        window.EventosAPI.checkHealth();
      }
    },
    resetApiBase: function() {
      localStorage.removeItem('EVENTOS_API_BASE');
      window.EVENTOS_CONFIG.API_BASE = 'http://localhost:3001/api';
      if (window.EventosAPI && typeof window.EventosAPI.checkHealth === 'function') {
        window.EventosAPI.checkHealth();
      }
    }
  };
})();
