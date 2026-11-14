/* England Over 40s Cricket — Partnership Prospectus
   Renders the page from window.PROSPECTUS (content.js). No wording lives in this file.
   Each section renders independently: if one fails, the rest of the page still shows. */
(function () {
  'use strict';

  var DATA = window.PROSPECTUS;
  var root = document.getElementById('prospectus');
  if (!DATA || !root) { return; }
  var META = DATA.meta || {};

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function add(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) { parent.appendChild(arguments[i]); }
    }
    return parent;
  }

  function picture(image, cls, eager) {
    if (!image || !image.src) { return null; }
    var node = el('img', cls);
    node.src = image.src;
    node.alt = image.alt || '';
    node.decoding = 'async';
    if (!eager) { node.loading = 'lazy'; }
    return node;
  }

  function link(href, cls, text) {
    var node = el('a', cls, text);
    node.href = href;
    return node;
  }

  function band(id, modifier) {
    var section = el('section', 'band' + (modifier ? ' band--' + modifier : ''));
    section.id = id;
    var wrap = el('div', 'wrap');
    section.appendChild(wrap);
    return { section: section, wrap: wrap };
  }

  function heading(d) {
    return add(el('div', 'head'), el('p', 'eyebrow', d.eyebrow), el('h2', 'display', d.heading));
  }

  function statList(stats, cls) {
    var list = el('ul', 'stats ' + cls);
    stats.forEach(function (s) {
      add(list, add(el('li', 'stat' + (s.feature ? ' stat--feature' : '')),
        el('span', 'stat__figure', s.figure), el('span', 'stat__caption', s.caption)));
    });
    return list;
  }

  function actions(primaryCls, secondaryCls, label) {
    var box = el('div', 'hero__actions');
    if (META.enquiryUrl) { add(box, link(META.enquiryUrl, 'btn ' + primaryCls, label || 'Start a conversation')); }
    if (META.pdfUrl) { add(box, link(META.pdfUrl, 'btn ' + secondaryCls, 'Download the PDF')); }
    return box.children.length ? box : null;
  }

  var sections = {

    hero: function (d) {
      var section = el('section', 'hero');
      var title = el('h1', 'hero__title');
      d.titleLines.forEach(function (line) { add(title, el('span', '', line)); });
      add(section,
        add(el('div', 'hero__text'),
          el('p', 'hero__eyebrow', d.eyebrow), title, el('div', 'rule'),
          el('p', 'hero__strap', d.strap), actions('btn--gold', 'btn--ghost'),
          el('p', 'hero__support', d.support)),
        add(el('div', 'hero__media'), picture(d.image, '', true)));
      return section;
    },

    year: function (d) {
      var b = band('year');
      var row = el('div', 'split');
      row.style.marginTop = '28px';
      add(row, picture(d.image, 'photo photo--band'),
        add(el('div', 'stack'), el('div', 'rule'), el('p', 'lede', d.body), el('p', 'small', d.caption)));
      add(b.wrap, heading(d), statList(d.stats, 'stats--5'), row);
      return b.section;
    },

    about: function (d) {
      var b = band('about', 'ground');
      var squads = el('div', 'squads');
      d.squads.forEach(function (s) { add(squads, add(el('div', 'squad'), el('h3', '', s.name), el('p', '', s.text))); });
      var ticks = el('ul', 'ticks');
      d.points.forEach(function (p) { add(ticks, el('li', '', p)); });
      var people = el('div', 'people');
      add(people, el('strong', '', d.leadershipTitle));
      d.leadership.forEach(function (p) { add(people, el('span', '', p)); });
      add(b.wrap,
        add(el('div', 'split split--even'),
          add(el('div', 'stack'), heading(d), el('p', 'lede', d.intro), squads,
            add(el('div', 'stack'), el('p', 'eyebrow', d.pointsTitle), ticks)),
          add(el('div', 'stack'), picture(d.image, 'photo photo--band'),
            add(el('div', 'panel'), el('div', 'rule'), el('h3', '', d.support.heading), el('p', '', d.support.text)))),
        people);
      return b.section;
    },

    programme: function (d) {
      var b = band('programme');
      var list = el('ol', 'timeline');
      d.items.forEach(function (item) {
        add(list, add(el('li'),
          el('span', 'timeline__when', item.when),
          add(el('span', 'timeline__what'), el('strong', '', item.what), el('span', '', item.where))));
      });
      var note = el('p', 'small', d.note);
      note.style.marginTop = '20px';
      add(b.wrap, heading(d),
        add(el('div', 'split split--even'), list,
          add(el('div', 'stack'), picture(d.image, 'photo photo--band'),
            add(el('div', 'horizon'), el('strong', '', d.horizon.label), el('p', '', d.horizon.text)))),
        note);
      return b.section;
    },

    audience: function (d) {
      var b = band('audience', 'ground');
      var max = Math.max.apply(null, d.ages.map(function (a) { return a.value; }));
      var bars = el('div', 'bars');
      bars.setAttribute('role', 'img');
      bars.setAttribute('aria-label', d.agesTitle + ': ' + d.ages.map(function (a) { return a.label + ' ' + a.value + '%'; }).join(', '));
      d.ages.forEach(function (a) {
        var fill = el('div', 'bars__fill' + (a.core ? ' bars__fill--core' : ''));
        fill.style.width = Math.round(a.value / max * 100) + '%';
        add(bars, el('span', '', a.label), add(el('div', 'bars__track'), fill), el('span', 'bars__value', a.value + '%'));
      });
      add(b.wrap,
        add(el('div', 'split split--even'),
          picture(d.image, 'photo photo--tall'),
          add(el('div', 'stack'), heading(d), statList(d.stats, 'stats--3 stats--navy'),
            add(el('div', 'stack'), el('p', 'eyebrow', d.agesTitle), bars),
            el('p', 'lede', d.body), el('p', 'small', d.source))));
      return b.section;
    },

    reach: function (d) {
      var b = band('reach');
      function column(group) {
        var figs = el('div', 'figs');
        group.stats.forEach(function (s) {
          add(figs, add(el('div'), el('div', 'fig__n', s.figure), el('div', 'fig__c', s.caption)));
        });
        return add(el('div'), el('h3', 'col__title', group.title), figs);
      }
      var months = d.chart.months;
      var max = Math.max.apply(null, months.map(function (m) { return m.value; }));
      var plot = el('div', 'chart__plot');
      var axis = el('div', 'chart__axis');
      var key = el('div', 'chart__key');
      months.forEach(function (m) {
        var bar = el('div', 'chart__bar' + (m.peak ? ' chart__bar--peak' : (m.mark ? ' chart__bar--mark' : '')));
        bar.style.height = Math.max(1.2, m.value / max * 88) + '%';
        add(plot, add(el('div', 'chart__col'), m.show ? el('span', 'chart__val', m.show) : null, bar));
        add(axis, el('span', '', m.label));
        if (m.mark) {
          var swatch = el('i');
          swatch.style.background = m.peak ? 'var(--navy)' : 'var(--blue)';
          add(key, add(el('span'), swatch, document.createTextNode(m.label + ': ' + m.mark)));
        }
      });
      plot.setAttribute('role', 'img');
      plot.setAttribute('aria-label', d.chart.title + '. ' + months.map(function (m) {
        return m.label + ' ' + m.value.toLocaleString('en-GB');
      }).join(', '));
      var chart = add(el('div', 'chart'), el('h3', 'eyebrow', d.chart.title), plot, axis, key, el('p', 'small', d.chart.caption));
      var source = el('p', 'small', d.source);
      source.style.marginTop = '20px';
      add(b.wrap, heading(d), add(el('div', 'reach'), column(d.social), chart, column(d.live)), source);
      return b.section;
    },

    brand: function (d) {
      var b = band('brand', 'ground');
      var grid = el('div', 'places');
      d.items.forEach(function (item) {
        if (item.wide) {
          add(grid, add(el('article', 'place place--wide'), picture(item.image, ''),
            add(el('div'), el('h3', '', item.title), el('p', '', item.text))));
        } else if (!item.image) {
          add(grid, add(el('article', 'place place--text'), el('h3', '', item.title), el('p', '', item.text)));
        } else {
          add(grid, add(el('article', 'place'), picture(item.image, ''), el('h3', '', item.title), el('p', '', item.text)));
        }
      });
      var note = el('p', 'small', d.note);
      note.style.marginTop = '18px';
      add(b.wrap, heading(d), grid, note);
      return b.section;
    },

    levels: function (d) {
      var b = band('levels');
      var rows = d.rows.concat([{ label: 'Ideal for', values: d.tiers.map(function (t) { return t.idealFor; }) }]);

      var table = el('table', 'levels-table');
      var headRow = el('tr');
      add(headRow, el('td'));
      d.tiers.forEach(function (t) {
        var th = el('th', t.lead ? 'is-lead' : '', t.name);
        th.scope = 'col';
        add(headRow, th);
      });
      var tbody = el('tbody');
      rows.forEach(function (r) {
        var tr = el('tr');
        var th = el('th', '', r.label);
        th.scope = 'row';
        add(tr, th);
        r.values.forEach(function (v, i) {
          add(tr, el('td', (d.tiers[i].lead ? 'is-lead' : '') + (v ? '' : ' none'), v || '—'));
        });
        add(tbody, tr);
      });
      add(table, add(el('thead'), headRow), tbody);

      var cards = el('div', 'tiers');
      d.tiers.forEach(function (t, i) {
        var dl = el('dl');
        rows.forEach(function (r) {
          if (r.values[i]) { add(dl, add(el('div'), el('dt', '', r.label), el('dd', '', r.values[i]))); }
        });
        add(cards, add(el('article', 'tier' + (t.lead ? ' tier--lead' : '')), el('h3', '', t.name), dl));
      });

      add(b.wrap, heading(d), table, cards,
        add(el('div', 'levels-foot'), el('strong', '', d.statement), el('p', 'small', d.footnote)));
      return b.section;
    },

    signature: function (d) {
      var b = band('signature', 'ground');
      var cards = el('div', 'cards');
      d.items.forEach(function (item) {
        add(cards, add(el('article', 'card' + (item.feature ? ' card--feature' : '')),
          el('h3', '', item.title), item.tag ? el('p', 'card__tag', item.tag) : null, el('p', '', item.text)));
      });
      var example = null;
      if (d.example) {
        example = add(el('figure', 'example'),
          picture(d.example.image, 'example__img'),
          add(el('figcaption', 'example__body'),
            el('p', 'example__eyebrow', d.example.eyebrow),
            el('h3', '', d.example.title),
            el('p', '', d.example.text)));
      }
      add(b.wrap,
        add(el('div', 'split'),
          add(el('div', 'stack'), heading(d), cards, example, el('p', 'small', d.note)),
          picture(d.image, 'photo photo--tall')));
      return b.section;
    },

    partners: function (d) {
      var b = band('partners');
      var logos = el('ul', 'logos');
      d.list.forEach(function (p) {
        var tile = el('div', 'logo__tile' + (p.dark ? ' logo__tile--dark' : ''));
        add(tile, picture({ src: p.logo, alt: p.name + ' logo' }, ''));
        add(logos, add(el('li', 'logo'), tile, el('strong', '', p.name), el('span', '', p.role)));
      });
      var grid = el('div', 'proof__grid');
      d.proof.forEach(function (p) {
        add(grid, add(el('div'), el('div', 'proof__n', p.figure), el('div', 'proof__c', p.caption)));
      });
      var source = el('p', 'small', d.source);
      source.style.marginTop = '16px';
      add(b.wrap, heading(d), logos, add(el('div', 'proof'), el('h3', 'eyebrow', d.proofTitle), grid), source);
      return b.section;
    },

    working: function (d) {
      var b = band('working', 'ground');
      var steps = el('ol', 'steps');
      d.steps.forEach(function (s, i) {
        var n = (i + 1 < 10 ? '0' : '') + (i + 1);
        add(steps, add(el('li'),
          el('span', 'steps__n' + (s.feature ? ' steps__n--feature' : ''), n),
          add(el('span'), el('strong', '', s.title), el('span', '', s.text))));
      });
      add(b.wrap,
        add(el('div', 'split split--even'),
          picture(d.image, 'photo photo--tall'),
          add(el('div', 'stack'), heading(d), steps)));
      return b.section;
    },

    contact: function (d) {
      var section = el('section', 'contact');
      section.id = 'contact';
      var links = el('div', 'contact__links');
      if (META.email) { add(links, link('mailto:' + META.email, '', META.email)); }
      if (META.enquiryUrl) { add(links, link(META.enquiryUrl, '', META.enquiryUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))); }
      add(section,
        add(el('div', 'contact__text'),
          el('p', 'hero__eyebrow', d.eyebrow), el('h2', 'contact__title', d.heading), el('div', 'rule'),
          el('p', 'lede', d.body),
          add(el('div'), el('p', 'contact__name', d.name), el('p', 'contact__role', d.role)),
          links, actions('btn--gold', 'btn--ghost', d.enquireLabel),
          add(el('div', 'contact__foot'), el('p', 'small', d.social), el('p', 'small', d.company))),
        add(el('div', 'contact__media'), picture(d.image, '')));
      return section;
    }
  };

  var order = ['hero', 'year', 'about', 'programme', 'audience', 'reach', 'brand', 'levels', 'signature', 'partners', 'working', 'contact'];
  order.forEach(function (name) {
    try {
      if (!DATA[name]) { return; }
      var node = sections[name](DATA[name]);
      if (node) { root.appendChild(node); }
    } catch (error) {
      if (window.console) { console.warn('Prospectus section skipped: ' + name, error); }
    }
  });

  var barCta = document.getElementById('bar-cta');
  if (barCta && META.enquiryUrl) { barCta.href = META.enquiryUrl; }
})();
