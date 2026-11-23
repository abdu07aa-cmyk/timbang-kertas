// ===== Dropdown dengan pencarian cepat (otomatis untuk <select> berisi banyak pilihan) =====
(function () {
  var MIN = 8, pop = null, openedAt = 0, curSel = null;
  var css = document.createElement('style');
  css.textContent = '#ssPop{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:5000;display:flex;align-items:flex-start;justify-content:center;padding:6vh 10px 10px}' +
    '#ssPop .ssBox{background:#fff;border-radius:16px;width:min(520px,100%);max-height:84vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35);overflow:hidden;font-family:Arial,sans-serif}' +
    '#ssPop .ssIn{all:unset;box-sizing:border-box;margin:12px 12px 4px;padding:12px 14px;border:2px solid #3b82f6;border-radius:12px;font-size:16px;color:#0f172a;background:#f8fafc}' +
    '#ssPop .ssCount{padding:2px 16px 6px;font-size:12px;color:#64748b}' +
    '#ssPop .ssList{overflow-y:auto;padding:0 8px 10px;-webkit-overflow-scrolling:touch}' +
    '#ssPop .ssIt{padding:12px 12px;border-radius:10px;font-size:15px;color:#1e293b;cursor:pointer;line-height:1.3}' +
    '#ssPop .ssIt.cur{background:#dbeafe;font-weight:bold}' +
    '#ssPop .ssIt.hl{background:#2563eb;color:#fff}' +
    '#ssPop .ssIt.dis{color:#94a3b8}' +
    '#ssPop .ssNone{padding:18px;text-align:center;color:#64748b;font-size:14px}';
  document.head.appendChild(css);

  function close() { if (pop) { pop.remove(); pop = null; } curSel = null; }
  function qualifies(s) {
    if (!s || s.tagName !== 'SELECT' || s.disabled || s.multiple || s.size > 1) return false;
    if (s.closest && s.closest('#ssPop')) return false;
    return s.dataset.ss === '1' || s.options.length >= MIN;
  }
  function open(sel) {
    close(); curSel = sel; openedAt = Date.now();
    var opts = Array.prototype.map.call(sel.options, function (o, i) { return { i: i, t: (o.textContent || '').trim(), v: o.value, dis: o.disabled, cur: i === sel.selectedIndex }; });
    pop = document.createElement('div'); pop.id = 'ssPop';
    pop.innerHTML = '<div class="ssBox"><input class="ssIn" placeholder="🔍 Ketik untuk mencari..." autocomplete="off" autocapitalize="off" spellcheck="false"><div class="ssCount"></div><div class="ssList"></div></div>';
    document.body.appendChild(pop);
    var inp = pop.querySelector('.ssIn'), list = pop.querySelector('.ssList'), cnt = pop.querySelector('.ssCount');
    var shown = [], hl = 0;
    function render() {
      var terms = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = opts.filter(function (o) { if (terms.length && o.v === '') return false; var t = o.t.toLowerCase(); return terms.every(function (w) { return t.indexOf(w) !== -1; }); });
      if (hl >= shown.length) hl = Math.max(0, shown.length - 1);
      cnt.textContent = shown.length + ' dari ' + opts.length + ' pilihan';
      list.innerHTML = shown.length ? '' : '<div class="ssNone">Tidak ada yang cocok</div>';
      shown.forEach(function (o, k) {
        var d = document.createElement('div');
        d.className = 'ssIt' + (o.cur ? ' cur' : '') + (k === hl ? ' hl' : '') + (o.dis ? ' dis' : '');
        d.textContent = o.t || '(kosong)';
        d.onmousedown = function (e) { e.preventDefault(); };
        d.onclick = function () { pick(o); };
        list.appendChild(d);
      });
      var h = list.querySelector('.hl'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'nearest' });
    }
    function pick(o) {
      if (o.dis) return;
      var s = sel; close();
      s.selectedIndex = o.i;
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
      try { s.focus(); } catch (e) {}
    }
    inp.oninput = function () { hl = 0; render(); };
    inp.onkeydown = function (e) {
      if (e.key === 'Escape') { close(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hl = Math.min(shown.length - 1, hl + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (shown[hl]) pick(shown[hl]); e.preventDefault(); }
    };
    pop.addEventListener('mousedown', function (e) { if (e.target === pop && Date.now() - openedAt > 300) close(); });
    pop.addEventListener('touchstart', function (e) { if (e.target === pop && Date.now() - openedAt > 300) close(); }, { passive: true });
    render();
    // saat dibuka, tampilkan pilihan terpilih dan fokus ke kotak cari
    var cur = list.querySelector('.cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
    setTimeout(function () { inp.focus(); }, 30);
  }
  function intercept(e) {
    var s = e.target && e.target.closest ? e.target.closest('select') : null;
    if (!qualifies(s)) return;
    e.preventDefault(); e.stopPropagation();
    if (!pop) open(s);
  }
  document.addEventListener('mousedown', intercept, true);
  document.addEventListener('click', function (e) { var s = e.target && e.target.closest ? e.target.closest('select') : null; if (qualifies(s)) { e.preventDefault(); e.stopPropagation(); if (!pop && Date.now() - openedAt > 400) open(s); } }, true);
  document.addEventListener('keydown', function (e) {
    var s = e.target; if (!qualifies(s) || pop) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(s); }
  }, true);
})();
