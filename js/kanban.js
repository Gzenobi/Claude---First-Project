/* ==========================================================================
   kanban.js — Reusable drag & drop Kanban board (SortableJS). Exposes
   window.CRM.Kanban. Used by the Proyectos module for pipeline stages.
   ========================================================================== */
(function (global) {
  'use strict';

  var CRM = global.CRM = global.CRM || {};
  var UI = CRM.UI;

  /**
   * opts: {
   *   columns: [{ key, label, colorVar }],
   *   items: [...],
   *   getColumnKey(item) -> key,
   *   getItemId(item) -> id,
   *   renderCard(item) -> html string,
   *   getValue(item) -> number (for column totals),
   *   onMove(itemId, newColumnKey)
   * }
   */
  function render(container, opts) {
    var board = document.createElement('div');
    board.className = 'kanban-board';

    opts.columns.forEach(function (col) {
      var colItems = opts.items.filter(function (it) { return opts.getColumnKey(it) === col.key; });
      var total = colItems.reduce(function (s, it) { return s + (opts.getValue ? opts.getValue(it) : 0); }, 0);

      var colEl = document.createElement('div');
      colEl.className = 'kanban-col';
      colEl.style.setProperty('--kanban-accent', col.colorVar || 'var(--akzo-navy)');
      colEl.innerHTML =
        '<div class="kanban-col-header"><strong>' + UI.escapeHtml(col.label) + '</strong><span class="count">' + colItems.length + '</span></div>' +
        (opts.getValue ? '<div class="kanban-col-total">' + UI.formatCurrency(total) + '</div>' : '') +
        '<div class="kanban-cards" data-col-key="' + col.key + '"></div>';

      var cardsEl = colEl.querySelector('.kanban-cards');
      colItems.forEach(function (item) {
        var cardEl = document.createElement('div');
        cardEl.className = 'kanban-card';
        cardEl.setAttribute('data-id', opts.getItemId(item));
        cardEl.innerHTML = opts.renderCard(item);
        cardsEl.appendChild(cardEl);
      });

      board.appendChild(colEl);
    });

    container.innerHTML = '';
    container.appendChild(board);
    UI.refreshIcons();

    if (global.Sortable) {
      board.querySelectorAll('.kanban-cards').forEach(function (cardsEl) {
        Sortable.create(cardsEl, {
          group: 'kanban',
          animation: 150,
          ghostClass: 'sortable-ghost',
          onEnd: function (evt) {
            var itemId = evt.item.getAttribute('data-id');
            var newColKey = evt.to.getAttribute('data-col-key');
            var oldColKey = evt.from.getAttribute('data-col-key');
            if (newColKey !== oldColKey && opts.onMove) {
              opts.onMove(itemId, newColKey);
            }
          }
        });
      });
    }

    return board;
  }

  CRM.Kanban = { render: render };

})(window);
