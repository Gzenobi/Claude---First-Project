/* ==========================================================================
   router.js — Minimal hash-based SPA router. Exposes window.CRM.Router.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var routes = {};
  var defaultRoute = 'dashboard';
  var contentEl = null;
  var currentRoute = null;

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function parseHash() {
    var hash = global.location.hash.replace(/^#\/?/, '');
    return hash || defaultRoute;
  }

  function setActiveNav(routeName) {
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-route') === routeName);
    });
    var topbarTitle = document.querySelector('.topbar-title');
    var topbarSubtitle = document.querySelector('.topbar-subtitle');
    var active = document.querySelector('.nav-item[data-route="' + routeName + '"]');
    if (topbarTitle) topbarTitle.textContent = active ? active.getAttribute('data-label') : 'AkzoNobel CRM';
    if (topbarSubtitle) topbarSubtitle.textContent = active ? active.getAttribute('data-subtitle') || '' : '';
  }

  function handleRoute() {
    var routeName = parseHash();
    if (!routes[routeName]) routeName = defaultRoute;
    currentRoute = routeName;
    setActiveNav(routeName);
    if (!contentEl) contentEl = document.getElementById('app-content');
    contentEl.innerHTML = CRM.UI.loadingStateHTML('Cargando módulo...');
    Promise.resolve(routes[routeName](contentEl)).catch(function (err) {
      console.error(err);
      contentEl.innerHTML = '<div class="panel panel-body">Ocurrió un error al cargar este módulo.</div>';
    });
    var shell = document.querySelector('.app-shell');
    if (shell) shell.classList.remove('sidebar-mobile-open');
    window.scrollTo(0, 0);
  }

  function navigate(routeName) {
    global.location.hash = '#/' + routeName;
  }

  function getCurrentRoute() { return currentRoute; }

  function init(rootContentEl) {
    contentEl = rootContentEl;
    global.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  CRM.Router = {
    register: register,
    init: init,
    navigate: navigate,
    getCurrentRoute: getCurrentRoute,
    refresh: handleRoute
  };

})(window);
