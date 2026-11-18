/* Address lookup for the Valley Fever Heatmap.

   A visitor types a California address. The page finds its coordinates, then works out,
   using only the map data already on this page:
     - the county and the survey area (PUMA) the point falls in,
     - the county's reported illness rate for 2019 to 2023,
     - the climate match for the 4 km square the point sits in,
     - how busy the chosen month usually is, statewide.

   Geocoding services (the only network calls):
     - Photon (photon.komoot.io, OpenStreetMap data) for suggestions as you type,
     - U.S. Census Bureau geocoder for full street addresses, called as JSONP because
       the service does not send CORS headers.
   Nothing typed is stored by this page.

   Depends on globals defined by app.js: CD (county data), PD (area data), M (map state),
   showCounty(), setLayer(), isArea(). Depends on window.VF_LOOKUP from data/lookup.js. */
(function () {
  'use strict';

  var G = window.VF_LOOKUP;
  if (!G || !document.getElementById('lkForm')) return;

  var PHOTON = 'https://photon.komoot.io/api/';
  var CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
  var CA_BBOX = '-124.6,32.4,-114.0,42.1';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  var BANDS = ['Much lower', 'Lower', 'Higher', 'Much higher'];
  var HIGHLY_ENDEMIC = 20; /* Labor Code 6709: more than 20 cases per 100,000 a year */

  var $ = function (id) { return document.getElementById(id); };
  var input = $('lkIn'), list = $('lkList'), out = $('lkOut'), form = $('lkForm');

  /* ---------- shapes: read the county and area outlines from the map ---------- */

  function parseD(d) {
    var rings = [], cur = null, re = /([MLZ])\s*(?:(-?[\d.]+)[ ,](-?[\d.]+))?/g, m;
    while ((m = re.exec(d))) {
      if (m[1] === 'M') { if (cur && cur.length) rings.push(cur); cur = [[+m[2], +m[3]]]; }
      else if (m[1] === 'L') { if (cur) cur.push([+m[2], +m[3]]); }
      else { if (cur && cur.length) rings.push(cur); cur = null; }
    }
    if (cur && cur.length) rings.push(cur);
    return rings;
  }
  function shapeOf(rings) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    rings.forEach(function (r) {
      r.forEach(function (p) {
        if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1];
        if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1];
      });
    });
    return { rings: rings, bb: b };
  }
  var SHAPES = null;
  function shapes() {
    if (SHAPES) return SHAPES;
    SHAPES = { county: {}, area: {} };
    document.querySelectorAll('#counties .cty').forEach(function (el) {
      SHAPES.county[el.getAttribute('data-n')] = shapeOf(parseD(el.getAttribute('d')));
    });
    document.querySelectorAll('#pumas .pum').forEach(function (el) {
      SHAPES.area[el.getAttribute('data-i')] = shapeOf(parseD(el.getAttribute('d')));
    });
    return SHAPES;
  }
  function inside(x, y, rings) {
    var hit = false;
    for (var k = 0; k < rings.length; k++) {
      var r = rings[k], n = r.length;
      for (var i = 0, j = n - 1; i < n; j = i++) {
        var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  }
  function edgeDist(x, y, rings) {
    var best = Infinity;
    rings.forEach(function (r) {
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
        var ax = r[j][0], ay = r[j][1], bx = r[i][0], by = r[i][1];
        var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
        var t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
        var ex = ax + t * dx - x, ey = ay + t * dy - y, d = Math.sqrt(ex * ex + ey * ey);
        if (d < best) best = d;
      }
    });
    return best;
  }
  /* Find the shape that holds the point. Map outlines are simplified, so a point right on a
     shoreline or border can fall just outside every shape. Then take the nearest one if it is
     within 3 map units (about 4 km). Both geocoders are limited to California results, so this
     does not pull in places just across the state line. */
  function locate(x, y, set) {
    var k, s;
    for (k in set) {
      s = set[k];
      if (x < s.bb[0] || x > s.bb[2] || y < s.bb[1] || y > s.bb[3]) continue;
      if (inside(x, y, s.rings)) return k;
    }
    var best = null, bd = 3;
    for (k in set) {
      s = set[k];
      if (x < s.bb[0] - bd || x > s.bb[2] + bd || y < s.bb[1] - bd || y > s.bb[3] + bd) continue;
      var d = edgeDist(x, y, s.rings);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  /* ---------- the climate layer as bands, one per 4 km square ---------- */

  var GRID = null;
  function grid() {
    if (GRID) return GRID;
    var g = G.grid, a = new Int8Array(g.w * g.h), p = 0, re = /([_ABCD])([0-9a-z]*)/g, m;
    var val = { _: -1, A: 0, B: 1, C: 2, D: 3 };
    while ((m = re.exec(g.rle))) {
      var n = m[2] ? parseInt(m[2], 36) : 1, v = val[m[1]];
      for (var i = 0; i < n; i++) a[p++] = v;
    }
    GRID = { w: g.w, h: g.h, a: a };
    return GRID;
  }
  /* Band at a map point. A point whose square is water (common on the coast) takes the
     nearest land square within two squares, as the employer-site layer does. */
  function bandAt(x, y) {
    var g = grid(), i = Math.floor(x / VW * g.w), j = Math.floor(y / VH * g.h);
    if (i < 0 || j < 0 || i >= g.w || j >= g.h) return -1;
    var v = g.a[j * g.w + i];
    if (v >= 0) return v;
    var best = -1, bd = Infinity;
    for (var dj = -2; dj <= 2; dj++) {
      for (var di = -2; di <= 2; di++) {
        var ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= g.w || jj >= g.h) continue;
        var w = g.a[jj * g.w + ii], d = di * di + dj * dj;
        if (w >= 0 && d < bd) { bd = d; best = w; }
      }
    }
    return best;
  }

  function project(lon, lat) {
    return [G.proj.ax * lon + G.proj.bx, G.proj.ay * lat + G.proj.by];
  }

  /* ---------- numbers and words ---------- */

  var STATE_RATE = (function () {
    var c = 0, p = 0;
    for (var n in CD) { c += CD[n].casesR; p += CD[n].pop; }
    return c / p / 5 * 1e5;
  })();
  function rate(v) { return v >= 10 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function titleCase(s) {
    return s.toLowerCase().replace(/\b([a-z])/g, function (c) { return c.toUpperCase(); })
      .replace(/\bCa\b/, 'CA');
  }
  function compareToState(r) {
    var x = r / STATE_RATE, st = rate(STATE_RATE);
    if (x >= 3) return 'About ' + Math.round(x) + ' times the California rate of ' + st + '.';
    if (x >= 1.25) return 'About ' + x.toFixed(1) + ' times the California rate of ' + st + '.';
    if (x >= 0.8) return 'Close to the California rate of ' + st + '.';
    if (x >= 0.2) return 'Below the California rate of ' + st + '.';
    return 'Far below the California rate of ' + st + '.';
  }
  function monthWord(share) {
    if (share >= 9.5) return 'One of the busiest months';
    if (share >= 8.85) return 'Busier than average';
    if (share >= 7.9) return 'About average';
    if (share >= 6.5) return 'Quieter than average';
    return 'The quietest month';
  }
  function monthBars(sel) {
    var W = 240, H = 46, n = 12, gap = 3, bw = (W - gap * (n - 1)) / n, mx = Math.max.apply(null, G.months), s = '';
    G.months.forEach(function (v, i) {
      var h = Math.max(2, (v / mx) * (H - 12)), x = i * (bw + gap);
      s += '<rect x="' + x.toFixed(1) + '" y="' + (H - 12 - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
        '" rx="1.5" fill="' + (i === sel ? 'var(--navy)' : '#d9d5ca') + '"/>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 1) + '" text-anchor="middle" font-size="8.5" fill="' +
        (i === sel ? 'var(--navy)' : '#77736b') + '"' + (i === sel ? ' font-weight="700"' : '') + '>' + MONTHS[i].charAt(0) + '</text>';
    });
    return '<svg class="lk-bars" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Share of a year\'s cases reported in each month, statewide. ' +
      MONTHS[sel] + ' is highlighted.">' + s + '</svg>';
  }

  /* ---------- result ---------- */

  var LAST = null;

  function render(r) {
    var d = CD[r.county], area = r.area !== null && PD[r.area] ? PD[r.area] : null, h = '';
    var mo = r.month, share = G.months[mo];
    h += '<div class="lk-res">';
    h += '<div class="lk-head"><b>' + esc(r.label) + '</b><span>' + esc(r.county) + ' County' +
      (area ? ' &middot; ' + esc(area.n) : '') + '</span></div>';
    h += '<div class="lk-grid">';

    /* reported illness */
    var few = d.casesR < 20;
    h += '<div class="lk-card"><div class="lk-k">Reported illness in ' + esc(r.county) + ' County</div>' +
      '<div class="lk-big">' + rate(d.rateR) + '</div>' +
      '<div class="lk-u">cases a year per 100,000 residents, 2019 to 2023</div>' +
      '<p>' + compareToState(d.rateR) + ' ' +
      (d.rateR > HIGHLY_ENDEMIC
        ? 'Above the 20 per 100,000 that California law uses to call a county highly endemic.'
        : 'Below the 20 per 100,000 that California law uses to call a county highly endemic.') +
      (few ? ' Based on few cases, so this rate can swing a lot.' : '') + '</p></div>';

    /* climate match */
    h += '<div class="lk-card"><div class="lk-k">Climate match at this spot</div>';
    if (r.band >= 0) {
      h += '<div class="lk-big lk-word">' + BANDS[r.band] + '</div>' +
        '<div class="lk-u">than most of California, in the 4&nbsp;km square around this address</div>' +
        '<p>How closely the climate here resembles places where people already get sick. It is not a soil test and does not measure dust.</p>';
    } else {
      h += '<div class="lk-big lk-word">Not available</div><p>This spot is outside the area the climate model covers.</p>';
    }
    h += '</div>';

    /* month */
    var opts = MONTHS.map(function (m, i) { return '<option value="' + i + '"' + (i === mo ? ' selected' : '') + '>' + m + '</option>'; }).join('');
    h += '<div class="lk-card"><div class="lk-k"><label for="lkMonth">Month</label> <select id="lkMonth">' + opts + '</select></div>' +
      '<div class="lk-big lk-word">' + monthWord(share) + '</div>' +
      '<div class="lk-u">' + share.toFixed(1) + '% of a year\'s cases are reported in ' + MONTHS[mo] + ', statewide (an even spread would be 8.3%)</div>' +
      monthBars(mo) +
      '<p class="lk-small">Counted by month of report, 2018 to 2025, which trails infection by a few weeks. Not available by county or by week.</p></div>';

    h += '</div>';

    /* extra facts */
    var more = [];
    if (area) more.push('In this area, ' + area.pct.toFixed(0) + '% of working residents are in outdoor industries such as farming, construction, mining and oil and gas (survey estimate).');
    if (d.end) more.push(esc(r.county) + ' County is named in Labor Code 6709, so construction employers here must give workers Valley Fever awareness training.');
    if (more.length) h += '<ul class="lk-more">' + more.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';

    h += '<p class="lk-act"><a href="#map" id="lkShow">Show on the map</a><a href="#protect">How to protect workers</a></p>';
    h += '<p class="lk-fine">These describe the area, not any one person\'s chance of getting sick. Most people who breathe in the spores never feel ill.</p>';
    h += '</div>';
    out.innerHTML = h;

    $('lkMonth').onchange = function () { r.month = +this.value; render(r); $('lkMonth').focus(); };
    $('lkShow').onclick = function () {
      if (typeof isArea === 'function' && isArea()) setLayer('rate');
      if (typeof showCounty === 'function') showCounty(r.county);
    };
    pin(r.x, r.y);
    LAST = r;
  }

  function message(text, kind) {
    out.innerHTML = '<p class="lk-msg' + (kind ? ' ' + kind : '') + '">' + text + '</p>';
  }

  var NS = 'http://www.w3.org/2000/svg';
  function pin(x, y) {
    var svg = $('camap');
    if (!svg) return;
    var g = $('lkPin');
    if (!g) {
      g = document.createElementNS(NS, 'g');
      g.setAttribute('id', 'lkPin');
      g.setAttribute('pointer-events', 'none');
      svg.appendChild(g);
    }
    g.innerHTML = '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8" fill="none" stroke="#fff" stroke-width="5"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8" fill="none" stroke="#111" stroke-width="2.2"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6" fill="#111"/>';
  }

  /* Work out everything for one point and show it. countyHint is the county the
     geocoder reported, if any; it wins over the simplified map outlines. */
  function showFor(place) {
    var xy = project(place.lon, place.lat), S = shapes();
    var county = place.county && CD[place.county] ? place.county : locate(xy[0], xy[1], S.county);
    if (!county) {
      message('That spot looks to be outside California. This lookup covers California addresses only.', 'warn');
      return null;
    }
    var area = locate(xy[0], xy[1], S.area);
    var r = {
      label: place.label, lon: place.lon, lat: place.lat, x: xy[0], y: xy[1],
      county: county, area: area, band: bandAt(xy[0], xy[1]),
      month: typeof place.month === 'number' ? place.month : new Date().getMonth()
    };
    render(r);
    return r;
  }

  /* ---------- geocoding ---------- */

  function countyName(s) { return s ? String(s).replace(/ County$/, '') : null; }

  function photonLabel(p) {
    var line1 = p.housenumber && p.street ? p.housenumber + ' ' + p.street : (p.name || p.street || '');
    if (p.housenumber && p.street && p.name && p.name !== line1) line1 = p.name + ', ' + line1;
    var place = p.city || p.town || p.village || p.locality || p.district || (p.county ? countyName(p.county) + ' County' : '');
    var parts = [line1];
    if (place && place !== line1) parts.push(place);
    parts.push('CA' + (p.postcode ? ' ' + p.postcode : ''));
    return parts.filter(Boolean).join(', ');
  }

  var ctl = null;
  function photon(q, limit) {
    if (ctl) ctl.abort();
    ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var url = PHOTON + '?q=' + encodeURIComponent(q) + '&limit=' + (limit + 4) + '&lang=en&bbox=' + CA_BBOX;
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (res) {
      if (!res.ok) throw new Error('photon ' + res.status);
      return res.json();
    }).then(function (j) {
      var seen = {}, outl = [];
      (j.features || []).forEach(function (f) {
        var p = f.properties || {};
        if (p.countrycode !== 'US' || p.state !== 'California') return;
        var label = photonLabel(p);
        if (!label || seen[label]) return;
        seen[label] = 1;
        outl.push({ label: label, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], county: countyName(p.county) });
      });
      return outl.slice(0, limit);
    });
  }

  var jsonpN = 0;
  function census(q) {
    return new Promise(function (resolve, reject) {
      var cb = 'vfCensus' + (++jsonpN) + '_' + Date.now(), s = document.createElement('script'), done = false;
      var timer = setTimeout(function () { finish(); reject(new Error('census timeout')); }, 9000);
      function finish() {
        done = true; clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (j) {
        if (done) return;
        finish();
        var m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
        if (!m) return resolve(null);
        var c = m.geographies && m.geographies.Counties && m.geographies.Counties[0];
        if (c && c.STATE !== '06') return resolve({ outside: true });
        resolve({ label: titleCase(m.matchedAddress), lon: m.coordinates.x, lat: m.coordinates.y, county: c ? c.BASENAME : null });
      };
      s.onerror = function () { if (!done) { finish(); reject(new Error('census error')); } };
      s.src = CENSUS + '?address=' + encodeURIComponent(q) + '&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=jsonp&callback=' + cb;
      document.head.appendChild(s);
    });
  }

  /* Free text: a street address goes to the Census Bureau first (it knows address ranges),
     anything else, or a miss, goes to Photon. */
  function lookupText(q) {
    var street = /^\s*\d+\s+\S/.test(q);
    message('Looking up &ldquo;' + esc(q) + '&rdquo;&hellip;', 'busy');
    var first = street ? census(q).catch(function () { return null; }) : Promise.resolve(null);
    return first.then(function (hit) {
      if (hit && hit.outside) { message('That address is outside California. This lookup covers California addresses only.', 'warn'); return; }
      if (hit) { showFor(hit); return; }
      return photon(q, 1).then(function (r) {
        if (r.length) showFor(r[0]);
        else message('We couldn&rsquo;t find that address in California. Try adding the city or ZIP code, or pick a county on the map below.', 'warn');
      });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      message('The address service didn&rsquo;t respond. Try again in a moment, or pick a county on the map below.', 'warn');
    });
  }

  /* ---------- combobox ---------- */

  var items = [], active = -1, timer = null, lastQ = '';

  function close() {
    list.hidden = true; list.innerHTML = ''; items = []; active = -1;
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function draw() {
    if (!items.length) { close(); return; }
    list.innerHTML = items.map(function (it, i) {
      return '<li role="option" id="lkOpt' + i + '" data-i="' + i + '"' + (i === active ? ' aria-selected="true" class="on"' : ' aria-selected="false"') + '>' + esc(it.label) + '</li>';
    }).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', 'lkOpt' + active);
    else input.removeAttribute('aria-activedescendant');
  }
  function choose(i) {
    var it = items[i];
    if (!it) return;
    input.value = it.label;
    close();
    showFor(it);
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 3) { close(); return; }
    timer = setTimeout(function () {
      lastQ = q;
      photon(q, 6).then(function (r) {
        if (q !== lastQ || document.activeElement !== input) return;
        items = r; active = -1; draw();
      }).catch(function () { /* suggestions are optional; Enter still works */ });
    }, 250);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' && items.length) { active = (active + 1) % items.length; draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && items.length) { active = (active - 1 + items.length) % items.length; draw(); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(active); }
  });
  input.addEventListener('blur', function () { setTimeout(close, 150); });
  list.addEventListener('mousedown', function (e) {
    var li = e.target.closest ? e.target.closest('li[data-i]') : null;
    if (!li) return;
    e.preventDefault();
    choose(+li.getAttribute('data-i'));
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(timer);
    var q = input.value.trim();
    close();
    if (!q) { input.focus(); return; }
    lookupText(q);
  });

  /* For testing and for other scripts: look up a known point without the network. */
  window.VFLookup = {
    showFor: showFor,
    locate: function (lon, lat) {
      var xy = project(lon, lat), S = shapes();
      return { county: locate(xy[0], xy[1], S.county), area: locate(xy[0], xy[1], S.area), band: bandAt(xy[0], xy[1]), x: xy[0], y: xy[1] };
    },
    stateRate: STATE_RATE,
    last: function () { return LAST; }
  };
})();
