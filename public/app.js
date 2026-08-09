(function () {
  'use strict';

  // Synonym groups let the search understand related German terms instead of
  // requiring an exact word match ("semantische" Suche im Kleinformat).
  const SYNONYM_GROUPS = [
    ['stift', 'stifte', 'kuli', 'kulis', 'kugelschreiber', 'schreibgeraet', 'schreibgeraete', 'pen', 'filzstift'],
    ['tasse', 'tassen', 'becher', 'kaffeetasse', 'mug', 'trinkbecher', 'kaffeebecher'],
    ['shirt', 'shirts', 'tshirt', 't-shirt', 'poloshirt', 'textil', 'textilien', 'kleidung', 'bekleidung', 'jacke', 'sweatshirt', 'mode'],
    ['tasche', 'taschen', 'rucksack', 'rucksaecke', 'bag', 'beutel', 'kuehltasche', 'umhaengetasche'],
    ['usb', 'stick', 'sticks', 'speicherstick', 'gadget', 'gadgets', 'elektronik', 'tech', 'powerbank', 'lautsprecher'],
    ['flasche', 'flaschen', 'trinkflasche', 'bottle', 'sportflasche', 'thermosflasche', 'trinken'],
    ['schirm', 'schirme', 'regenschirm', 'umbrella', 'taschenschirm', 'regen', 'wetter'],
    ['notizbuch', 'notizbuecher', 'notizblock', 'papier', 'kalender', 'heft', 'terminplaner', 'klebezettel', 'buero'],
  ];

  function normalize(s) {
    return s.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim();
  }

  function expandQuery(query) {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const expanded = new Set(tokens);
    tokens.forEach((tok) => {
      SYNONYM_GROUPS.forEach((group) => {
        if (group.some((w) => w.includes(tok) || tok.includes(w))) {
          group.forEach((w) => expanded.add(w));
        }
      });
    });
    return Array.from(expanded);
  }

  let CATALOG = { categories: [], manufacturers: [], products: [] };
  let activeCategory = null;
  let activeQuery = '';

  const el = (id) => document.getElementById(id);
  const grid = el('results-grid');
  const countEl = el('results-count');

  function stars(rating) {
    const full = Math.round(rating);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }

  function stockLabel(stock) {
    if (stock === 0) return { text: 'Nicht auf Lager', cls: 'stock-out' };
    if (stock < 100) return { text: `${stock} Stück auf Lager`, cls: 'stock-low' };
    return { text: `${stock.toLocaleString('de-DE')} Stück auf Lager`, cls: 'stock-ok' };
  }

  function priceStr(p) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(p);
  }

  function scoreProduct(product, expandedTokens) {
    if (!expandedTokens.length) return 1;
    const haystacks = [
      { text: normalize(product.name), weight: 3 },
      { text: normalize(product.categoryLabel), weight: 2 },
      { text: product.tags.join(' '), weight: 2 },
      { text: normalize(product.description), weight: 1 },
      { text: normalize(product.manufacturerName), weight: 1 },
    ];
    let score = 0;
    expandedTokens.forEach((tok) => {
      haystacks.forEach((h) => {
        if (h.text.includes(tok)) score += h.weight;
      });
    });
    return score;
  }

  function currentFilters() {
    return {
      stock: parseInt(el('filter-stock').value, 10),
      delivery: parseFloat(el('filter-delivery').value),
      rating: parseFloat(el('filter-rating').value),
      sort: el('filter-sort').value,
    };
  }

  function render() {
    const f = currentFilters();
    const expandedTokens = activeQuery ? expandQuery(activeQuery) : [];

    let list = CATALOG.products.map((p) => ({ p, score: scoreProduct(p, expandedTokens) }));

    if (expandedTokens.length) list = list.filter((x) => x.score > 0);
    if (activeCategory) list = list.filter((x) => x.p.category === activeCategory);
    list = list.filter((x) => x.p.stock >= f.stock);
    list = list.filter((x) => x.p.deliveryDays <= f.delivery);
    list = list.filter((x) => x.p.rating >= f.rating);

    switch (f.sort) {
      case 'rating': list.sort((a, b) => b.p.rating - a.p.rating); break;
      case 'delivery': list.sort((a, b) => a.p.deliveryDays - b.p.deliveryDays); break;
      case 'price': list.sort((a, b) => a.p.price - b.p.price); break;
      case 'stock': list.sort((a, b) => b.p.stock - a.p.stock); break;
      default: list.sort((a, b) => b.score - a.score || b.p.rating - a.p.rating);
    }

    countEl.textContent = `${list.length} von ${CATALOG.products.length} Artikeln`;
    grid.innerHTML = '';
    list.forEach(({ p }) => grid.appendChild(renderCard(p)));

    if (!list.length) {
      grid.innerHTML = '<p class="empty-state">Keine Treffer. Versuch einen anderen Suchbegriff oder lockere die Filter.</p>';
    }
  }

  function renderCard(p) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const stock = stockLabel(p.stock);
    card.innerHTML = `
      <div class="card-media"><img src="/${p.image}" alt="${p.categoryLabel}" loading="lazy"></div>
      <div class="card-body">
        <p class="card-category">${p.categoryLabel}</p>
        <h3 class="card-title">${p.name}</h3>
        <p class="card-manufacturer">${p.manufacturerName}</p>
        <p class="card-rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} (${p.reviewCount})</p>
        <p class="card-price">ab ${priceStr(p.price)} <span class="unit">/ Stück</span></p>
        <p class="badge ${stock.cls}">${stock.text}</p>
        <p class="card-delivery">Lieferzeit: ${p.deliveryDays} ${p.deliveryDays === 1 ? 'Tag' : 'Tage'}</p>
        <button type="button" class="btn-compare" data-id="${p.id}">Vergleichen</button>
      </div>
    `;
    card.querySelector('.card-media').addEventListener('click', () => openModal(p.id));
    card.querySelector('.card-title').addEventListener('click', () => openModal(p.id));
    card.querySelector('.btn-compare').addEventListener('click', () => openModal(p.id));
    return card;
  }

  function openModal(productId) {
    const product = CATALOG.products.find((p) => p.id === productId);
    if (!product) return;
    const alternatives = CATALOG.products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .sort((a, b) => (b.rating - a.rating) || (a.deliveryDays - b.deliveryDays))
      .slice(0, 5);

    const bestPrice = Math.min(product.price, ...alternatives.map((a) => a.price));
    const bestDelivery = Math.min(product.deliveryDays, ...alternatives.map((a) => a.deliveryDays));
    const bestRating = Math.max(product.rating, ...alternatives.map((a) => a.rating));
    const bestStock = Math.max(product.stock, ...alternatives.map((a) => a.stock));

    function row(p, isMain) {
      const stock = stockLabel(p.stock);
      return `
        <tr class="${isMain ? 'row-main' : ''}">
          <td>
            <strong>${p.manufacturerName}</strong>
            <div class="row-sub">${p.name}</div>
          </td>
          <td class="${p.price === bestPrice ? 'cell-best' : ''}">${priceStr(p.price)}</td>
          <td class="${p.stock === bestStock ? 'cell-best' : ''}">${stock.text}</td>
          <td class="${p.deliveryDays === bestDelivery ? 'cell-best' : ''}">${p.deliveryDays} ${p.deliveryDays === 1 ? 'Tag' : 'Tage'}</td>
          <td class="${p.rating === bestRating ? 'cell-best' : ''}">${stars(p.rating)} ${p.rating.toFixed(1)}</td>
        </tr>
      `;
    }

    el('modal-content').innerHTML = `
      <div class="modal-head">
        <img src="/${product.image}" alt="${product.categoryLabel}" class="modal-image">
        <div>
          <p class="card-category">${product.categoryLabel}</p>
          <h2>${product.name}</h2>
          <p class="card-manufacturer">${product.manufacturerName} · ${CATALOG.manufacturers.find(m => m.id === product.manufacturerId)?.city || ''}</p>
          <p class="modal-desc">${product.description}</p>
          <p>Mindestbestellmenge: ${product.minOrderQty} Stück</p>
        </div>
      </div>
      <h3 class="compare-title">Vergleich zu Angeboten anderer Hersteller</h3>
      <div class="table-wrap">
        <table class="compare-table">
          <thead><tr><th>Hersteller / Produkt</th><th>Preis / Stück</th><th>Lagerbestand</th><th>Lieferzeit</th><th>Bewertung</th></tr></thead>
          <tbody>
            ${row(product, true)}
            ${alternatives.map((a) => row(a, false)).join('')}
          </tbody>
        </table>
      </div>
    `;
    el('modal-backdrop').classList.remove('hidden');
  }

  function closeModal() {
    el('modal-backdrop').classList.add('hidden');
  }

  function renderCategoryChips() {
    const container = el('category-chips');
    container.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'chip active';
    allChip.textContent = 'Alle Kategorien';
    allChip.addEventListener('click', () => setActiveCategory(null));
    container.appendChild(allChip);

    CATALOG.categories.forEach((c) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = c.label;
      chip.dataset.id = c.id;
      chip.addEventListener('click', () => setActiveCategory(c.id));
      container.appendChild(chip);
    });
  }

  function setActiveCategory(id) {
    activeCategory = id;
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('active', (chip.dataset.id || null) === id);
    });
    render();
  }

  function init() {
    fetch('/api/catalog').then((r) => r.json()).then((data) => {
      CATALOG = data;
      renderCategoryChips();
      render();
    }).catch(() => {
      countEl.textContent = 'Katalog konnte nicht geladen werden.';
    });

    el('search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      activeQuery = el('search-input').value;
      render();
    });
    ['filter-stock', 'filter-delivery', 'filter-rating', 'filter-sort'].forEach((id) => {
      el(id).addEventListener('change', render);
    });
    el('reset-filters').addEventListener('click', () => {
      el('filter-stock').value = '0';
      el('filter-delivery').value = '99';
      el('filter-rating').value = '0';
      el('filter-sort').value = 'relevance';
      el('search-input').value = '';
      activeQuery = '';
      setActiveCategory(null);
    });
    el('modal-close').addEventListener('click', closeModal);
    el('modal-backdrop').addEventListener('click', (e) => {
      if (e.target === el('modal-backdrop')) closeModal();
    });
  }

  init();
})();
