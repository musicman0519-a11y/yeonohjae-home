/* =========================================================================
   연오재 홈페이지 · 화면 그리기 (관리자에서 저장한 내용 → 홈페이지)
   ========================================================================= */
(function(){
  var db = window.YO_STORE ? YO_STORE.get() : null;
  if (!db) return;
  var $ = function(id){ return document.getElementById(id); };
  var BOARD = { event: '진행 중인 이벤트', review: '진료 후기', diet: '다이어트 치료', focus: '집중 진료', treat: '한방 치료', about: '한의원 소개', notice: '공지사항' };

  /* ---------- 글자 처리 ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nl(s){ return esc(s).replace(/\n/g, '<br>'); }
  /* 제목: *강조* → 초록 글씨, 줄바꿈 유지 */
  function tt(s){ return esc(s).replace(/\*([^*]+)\*/g, '<span class="text-rosewood-deep">$1</span>').replace(/\n/g, '<br>'); }
  function plain(s){ return String(s || '').replace(/\*/g, ''); }
  function url(u){ u = String(u || '').trim(); return /^(https?:|tel:|mailto:|#|\/|data:image\/)/i.test(u) ? u : (u ? 'https://' + u : ''); }
  function won(n){ return (Number(n) || 0).toLocaleString('ko-KR') + '원'; }
  /* 관리자가 쓴 본문에서 위험한 코드 제거 */
  function safe(html){
    var t = document.createElement('template'); t.innerHTML = String(html || '');
    t.content.querySelectorAll('script,style,object,embed,form,input,button,link,meta,base').forEach(function(n){ n.remove(); });
    t.content.querySelectorAll('iframe').forEach(function(f){
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(f.getAttribute('src') || '')) f.remove();
    });
    t.content.querySelectorAll('*').forEach(function(el){
      [].slice.call(el.attributes).forEach(function(a){
        var n = a.name.toLowerCase();
        if (n.indexOf('on') === 0 || n === 'style' && /expression|url\(/i.test(a.value)) el.removeAttribute(a.name);
        if ((n === 'href' || n === 'src') && /^\s*(javascript|vbscript|data:(?!image\/))/i.test(a.value)) el.removeAttribute(a.name);
      });
      if (el.tagName === 'A'){ el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
    });
    return t.innerHTML;
  }
  function posts(cat){
    var list = (db.posts || []).filter(function(p){ return p.pub !== false && p.cat === cat; });
    return list.filter(function(p){ return p.pin; }).concat(list.filter(function(p){ return !p.pin; }));
  }
  var I = db.info || {}, H = db.home || {};

  /* ---------- 메뉴 ---------- */
  var menus = db.menus || [];
  var hideSec = {};
  menus.forEach(function(m){ if (!m.on && /^#/.test(m.target || '') && m.target !== '#home') hideSec[m.target.slice(1)] = true; });
  ['event', 'review', 'diet', 'focus', 'treat', 'about', 'notice'].forEach(function(c){
    if (!posts(c).length) hideSec[{ event: 'events', review: 'reviews', diet: 'diet', focus: 'focus', treat: 'treatments', about: 'about', notice: 'notice' }[c]] = true;
  });
  if (!(db.products || []).some(function(p){ return p.on !== false; })) hideSec.products = true;
  if (!(db.doctors || []).length) hideSec.doctors = true;
  if (!(db.gallery || []).length) hideSec.gallery = true;
  Object.keys(hideSec).forEach(function(id){ var s = $(id); if (s) s.hidden = true; });
  var nav = $('navList');
  if (nav){
    nav.innerHTML = menus.filter(function(m){
      return m.on && !(/^#/.test(m.target || '') && hideSec[m.target.slice(1)]);
    }).map(function(m, i){
      var ext = !/^#/.test(m.target || '');
      return '<li><a class="nav-link ' + (i === 0 ? 'active text-rosewood-deep' : 'hover:text-rosewood-deep') + '" href="' + esc(url(m.target)) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(m.name) + '</a></li>';
    }).join('');
  }

  /* ---------- 기본 정보 (전화·주소·시간) ---------- */
  var tel = 'tel:' + String(I.phone || '').replace(/[^0-9+]/g, '');
  document.querySelectorAll('[data-tel]').forEach(function(a){ a.href = tel; });
  document.querySelectorAll('[data-phone]').forEach(function(e){ e.textContent = I.phone || ''; });
  document.querySelectorAll('[data-addr]').forEach(function(e){ e.textContent = I.addr || ''; });
  document.querySelectorAll('[data-name]').forEach(function(e){ e.textContent = I.name || ''; });
  document.querySelectorAll('[data-naver]').forEach(function(a){ if (I.naver) { a.href = url(I.naver); a.target = '_blank'; a.rel = 'noopener'; } else a.hidden = true; });
  document.querySelectorAll('[data-kakao]').forEach(function(a){ if (I.kakao) { a.href = url(I.kakao); a.target = '_blank'; a.rel = 'noopener'; } else a.hidden = true; });
  var setT = function(id, v){ var e = $(id); if (e) e.textContent = v || ''; };
  var setH = function(id, v){ var e = $(id); if (e) e.innerHTML = v; };
  var setI = function(id, v){ var e = $(id); if (e && v) e.src = v; };
  setT('heroNear', I.near); setT('heroHours', I.hoursShort);
  setT('ceoName', I.ceo); setT('bizNo', I.bizno);
  var ml = $('mapLink'); if (ml) ml.href = url(I.map) || 'https://map.naver.com';
  setI('mapImg', I.mapImg);
  var dl = $('infoDl');
  if (dl){
    var row = function(k, v, cls){ return '<div class="grid grid-cols-[88px_1fr] gap-4 py-4"><dt class="font-semibold text-mocha">' + k + '</dt><dd class="' + (cls || 'break-keep') + '">' + v + '</dd></div>'; };
    dl.innerHTML = row('주소', esc(I.addr), 'break-keep font-medium') + row('상담문의', esc(I.phone), 'tnum font-semibold text-rosewood-deep')
      + (I.note ? row('안내', nl(I.note)) : '') + (I.closed ? row('휴진', esc(I.closed)) : '')
      + '<div class="grid grid-cols-[88px_1fr] gap-4 py-5"><dt class="pt-0.5 font-semibold text-mocha">진료시간</dt><dd><ul class="space-y-2.5">'
      + (I.hours || []).map(function(h){
          var off = /휴무|휴진/.test(h.t);
          return '<li class="flex items-baseline justify-between gap-4"><span class="font-medium">' + esc(h.d) + '</span><span class="tnum text-right font-semibold' + (off ? ' text-rosewood' : '') + '">' + esc(h.t)
            + (h.sub ? ' <span class="block text-[12px] font-medium text-mocha">' + esc(h.sub) + '</span>' : '') + '</span></li>';
        }).join('') + '</ul></dd></div>';
  }

  /* ---------- 첫 화면 ---------- */
  setT('heroEyebrow', H.heroEyebrow); setH('heroTitle', tt(H.heroTitle)); setH('heroSub', nl(H.heroSub));
  setI('heroImg', H.heroImg); setT('heroBadgeTop', H.heroBadgeTop); setH('heroBadge', nl(H.heroBadge));

  /* ---------- 공통 카드 조각 ---------- */
  var RV = function(i, step){ return i ? ' style="transition-delay:.' + String(Math.min(i * (step || 7), 30)).padStart(2, '0') + 's"' : ''; };
  var more = function(cat){ return '#board-' + cat; };
  document.querySelectorAll('[data-more]').forEach(function(a){ a.href = more(a.getAttribute('data-more')); });

  /* 한의원 소개 */
  var ab = $('aboutGrid');
  if (ab) ab.innerHTML = posts('about').slice(0, 2).map(function(p, i){
    return '<article class="reveal card-hover rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10"' + RV(i, 8) + '><a href="#post-' + esc(p.id) + '" class="block rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)]">'
      + (p.img ? '<div class="img-zoom rounded-t-[calc(2rem-0.375rem)]"><img src="' + esc(p.img) + '" alt="' + esc(plain(p.t)) + '" class="h-60 w-full object-cover sm:h-72" loading="lazy" decoding="async"></div>' : '')
      + '<div class="px-7 py-7"><h3 class="break-keep text-[19px] font-bold leading-snug">' + tt(p.t) + '</h3><p class="break-keep mt-3 text-[14px] leading-relaxed text-mocha">' + nl(p.sub) + '</p><p class="mt-5 text-[12px] font-medium text-mocha/80">' + esc(p.d) + '</p></div></a></article>';
  }).join('');

  /* 한방 치료 (벤토: 1번 큰 카드, 2번 사진 카드, 3·4번 아이콘 카드) */
  var tg = $('treatGrid');
  if (tg){
    var tr = posts('treat'), icons = ['solar:fire-linear', 'solar:hand-stars-linear', 'solar:leaf-linear', 'solar:heart-pulse-linear'];
    var big = tr[0], mid = tr[1], rest = tr.slice(2, 6);
    var h = '';
    if (big) h += '<article class="reveal card-hover md:col-span-7 md:row-span-2"><div class="flex h-full flex-col rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10"><div class="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)]">'
      + (big.img ? '<div class="img-zoom rounded-t-[calc(2rem-0.375rem)]"><img src="' + esc(big.img) + '" alt="' + esc(plain(big.t)) + '" class="h-64 w-full object-cover sm:h-80 lg:h-[380px]" loading="lazy" decoding="async"></div>' : '')
      + '<div class="flex flex-1 flex-col px-7 py-7"><div class="flex items-center gap-3"><h3 class="text-[22px] font-bold">' + tt(big.t) + '</h3>'
      + (big.tag ? '<span class="rounded-full bg-rosewood/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rosewood">' + esc(big.tag) + '</span>' : '')
      + '</div><p class="break-keep mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-mocha">' + nl(big.sub) + '</p>'
      + '<a href="#post-' + esc(big.id) + '" class="cta sig mt-auto inline-flex w-max items-center gap-1.5 pt-5 text-[13.5px] font-semibold text-rosewood-deep">자세히 <iconify-icon class="cta-ico sig" icon="solar:arrow-right-linear" width="15"></iconify-icon></a></div></div></div></article>';
    if (mid) h += '<article class="reveal card-hover md:col-span-5" style="transition-delay:.07s"><a href="#post-' + esc(mid.id) + '" class="block h-full rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10"><div class="flex h-full items-stretch gap-0 rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)]">'
      + (mid.img ? '<div class="img-zoom w-2/5 shrink-0 rounded-l-[calc(2rem-0.375rem)]"><img src="' + esc(mid.img) + '" alt="' + esc(plain(mid.t)) + '" class="h-full min-h-[168px] w-full object-cover" loading="lazy" decoding="async"></div>' : '')
      + '<div class="flex flex-col justify-center px-6 py-6"><h3 class="text-[18px] font-bold">' + tt(mid.t) + '</h3><p class="break-keep mt-2 text-[13.5px] leading-relaxed text-mocha">' + nl(mid.sub) + '</p></div></div></a></article>';
    if (rest.length) h += '<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:col-span-5 lg:gap-6">' + rest.map(function(p, i){
      return '<article class="reveal card-hover"' + RV(i + 2, 6) + '><a href="#post-' + esc(p.id) + '" class="block h-full rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10"><div class="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)] px-6 py-6">'
        + '<span class="flex h-11 w-11 items-center justify-center rounded-full bg-rosewood/10 text-rosewood"><iconify-icon icon="' + icons[i % icons.length] + '" width="21"></iconify-icon></span>'
        + '<h3 class="mt-4 text-[17px] font-bold">' + tt(p.t) + '</h3><p class="break-keep mt-2 text-[13px] leading-relaxed text-mocha">' + nl(p.sub) + '</p></div></a></article>';
    }).join('') + '</div>';
    tg.innerHTML = h;
  }

  /* 집중 진료 */
  var fp = posts('focus')[0], fw = $('focusWrap');
  if (fw && fp){
    fw.innerHTML = '<div class="reveal img-zoom order-1 rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10">' + (fp.img ? '<img src="' + esc(fp.img) + '" alt="' + esc(plain(fp.t)) + '" class="h-72 w-full rounded-[calc(2rem-0.375rem)] object-cover sm:h-96" loading="lazy" decoding="async">' : '') + '</div>'
      + '<div class="order-2"><p class="reveal text-[12px] font-semibold uppercase tracking-[0.24em] text-rosewood">' + esc(fp.tag || 'Focus Care') + '</p>'
      + '<h2 class="reveal break-keep mt-3 text-[28px] font-bold leading-snug tracking-snugger sm:text-[34px]" style="transition-delay:.06s">' + tt(fp.t) + '</h2>'
      + '<p class="reveal break-keep mt-5 max-w-[52ch] text-[15px] leading-relaxed text-mocha" style="transition-delay:.12s">' + nl(fp.sub) + '</p>'
      + ((fp.points || []).length ? '<ul class="reveal mt-6 space-y-2.5 text-[14px] font-medium text-espresso" style="transition-delay:.18s">' + fp.points.map(function(x){ return '<li class="flex items-center gap-2.5"><iconify-icon icon="solar:verified-check-linear" width="18" class="text-rosewood"></iconify-icon> ' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
      + '<div class="reveal mt-8 flex flex-wrap gap-3" style="transition-delay:.24s"><a href="#contact" class="cta sig inline-flex h-[48px] items-center gap-2 rounded-full border border-rosewood/30 bg-white/70 px-6 text-[14px] font-semibold text-rosewood-deep hover:bg-white">집중 진료 상담 <iconify-icon class="cta-ico sig" icon="solar:arrow-right-linear" width="15"></iconify-icon></a>'
      + '<a href="#post-' + esc(fp.id) + '" class="cta sig inline-flex h-[48px] items-center gap-2 px-2 text-[14px] font-semibold text-rosewood-deep">자세히 보기</a></div>'
      + '<p class="reveal mt-5 text-[12px] font-medium text-mocha/80" style="transition-delay:.28s">' + esc(fp.d) + '</p></div>';
  }

  /* 다이어트 */
  var dp = posts('diet')[0], dw = $('dietTop');
  if (dw && dp){
    dw.innerHTML = '<div class="order-2 md:order-1"><p class="reveal text-[12px] font-semibold uppercase tracking-[0.24em] text-rosewood">' + esc(dp.tag || 'Lean Diet Program') + '</p>'
      + '<h2 class="reveal break-keep mt-3 text-[28px] font-bold leading-snug tracking-snugger sm:text-[34px]" style="transition-delay:.06s">' + tt(dp.t) + '</h2>'
      + '<p class="reveal break-keep mt-5 max-w-[50ch] text-[15px] leading-relaxed text-mocha" style="transition-delay:.12s">' + nl(dp.sub) + '</p>'
      + ((H.dietStats || []).length ? '<div class="reveal mt-7 grid max-w-md grid-cols-3 gap-3" style="transition-delay:.18s">' + H.dietStats.slice(0, 3).map(function(s){
          return '<div class="rounded-2xl border border-rosewood/15 bg-white/60 px-4 py-4 text-center"><p class="tnum text-[21px] font-extrabold text-rosewood-deep">' + esc(s[0]) + '</p><p class="mt-1 text-[11.5px] font-medium text-mocha">' + esc(s[1]) + '</p></div>';
        }).join('') + '</div>' : '')
      + '<div class="reveal mt-8 flex flex-wrap items-center gap-3" style="transition-delay:.24s"><a href="#contact" class="cta sig inline-flex h-[48px] items-center gap-2 rounded-full bg-rosewood-deep px-6 text-[14px] font-semibold text-ivory shadow-[0_14px_34px_-14px_rgba(59,75,63,.55)]">다이어트 상담 신청 <iconify-icon class="cta-ico sig" icon="solar:arrow-right-linear" width="15"></iconify-icon></a>'
      + '<a href="#post-' + esc(dp.id) + '" class="cta sig inline-flex h-[48px] items-center px-2 text-[14px] font-semibold text-rosewood-deep">자세히 보기</a></div></div>'
      + '<div class="order-1 md:order-2"><div class="reveal img-zoom rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10">' + (dp.img ? '<img src="' + esc(dp.img) + '" alt="' + esc(plain(dp.t)) + '" class="h-72 w-full rounded-[calc(2rem-0.375rem)] object-cover sm:h-96" loading="lazy" decoding="async">' : '') + '</div></div>';
  }
  /* 유튜브 */
  function ytId(u){ var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; }
  var vids = (H.videos || []).filter(function(v){ return v && (v.t || v.url); });
  var vg = $('videoGrid'), vw = $('videoWrap');
  setT('videoTitle', H.videoTitle);
  if (vw) vw.hidden = !vids.length;
  if (vg) vg.innerHTML = vids.map(function(v, i){
    var id = ytId(v.url), img = v.img || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '');
    return '<figure class="reveal card-hover"' + RV(i, 8) + '><a href="' + esc(url(v.url) || '#diet') + '"' + (v.url ? ' target="_blank" rel="noopener"' : '') + ' class="img-zoom group relative block rounded-[1.6rem] ring-1 ring-rosewood/10" aria-label="영상 재생 — ' + esc(v.t) + '">'
      + (img ? '<img src="' + esc(img) + '" alt="' + esc(v.t) + '" class="aspect-video w-full rounded-[1.6rem] object-cover" loading="lazy" decoding="async">' : '<span class="block aspect-video w-full rounded-[1.6rem] bg-shell"></span>')
      + '<span class="absolute inset-0 rounded-[1.6rem] bg-gradient-to-t from-espresso/45 to-transparent"></span><span class="sig absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ivory/90 text-rosewood-deep shadow-lg group-hover:scale-105"><iconify-icon icon="solar:play-bold" width="22"></iconify-icon></span></a>'
      + '<figcaption class="break-keep mt-3 text-[14.5px] font-semibold">' + esc(v.t) + '</figcaption></figure>';
  }).join('');

  /* 의료진 */
  var dg = $('docGrid');
  if (dg) dg.innerHTML = (db.doctors || []).map(function(d, i){
    return '<article class="reveal card-hover rounded-[2rem] bg-black/5 p-1.5 ring-1 ring-rosewood/10"' + RV(i, 8) + '><div class="rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)]">'
      + (d.img ? '<div class="img-zoom rounded-t-[calc(2rem-0.375rem)]"><img src="' + esc(d.img) + '" alt="' + esc(d.name + ' ' + d.role) + '" class="h-80 w-full object-cover" loading="lazy" decoding="async"></div>' : '')
      + '<div class="px-7 py-6"><div class="flex items-baseline gap-2.5"><h3 class="text-[21px] font-bold">' + esc(d.name) + '</h3><span class="text-[13px] font-semibold text-rosewood">' + esc(d.role) + '</span></div>'
      + '<ul class="mt-3 space-y-1.5 text-[13px] leading-relaxed text-mocha">' + (d.lines || []).map(function(l){ return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div></div></article>';
  }).join('');

  /* 이벤트 */
  var evs = posts('event'), ew = $('eventWrap');
  setT('evCount', evs.length ? '1 / ' + evs.length : '');
  if (ew && evs[0]){
    var e = evs[0];
    ew.innerHTML = '<a href="#post-' + esc(e.id) + '" class="grid grid-cols-1 rounded-[calc(2rem-0.375rem)] bg-ivory shadow-[inset_0_1px_1px_rgba(255,255,255,.6)] md:grid-cols-[1.15fr_.85fr]">'
      + '<div class="img-zoom rounded-t-[calc(2rem-0.375rem)] md:rounded-l-[calc(2rem-0.375rem)] md:rounded-tr-none">' + (e.img ? '<img src="' + esc(e.img) + '" alt="' + esc(plain(e.t)) + '" class="h-64 w-full object-cover sm:h-80 md:h-full" loading="lazy" decoding="async">' : '') + '</div>'
      + '<div class="flex flex-col justify-center px-7 py-9 md:px-10">' + (e.tag ? '<span class="w-max rounded-full bg-rosewood/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rosewood">' + esc(e.tag) + '</span>' : '')
      + '<h3 class="break-keep mt-4 text-[22px] font-bold leading-snug sm:text-[25px]">' + tt(e.t) + '</h3><p class="break-keep mt-3 text-[14.5px] leading-relaxed text-mocha">' + nl(e.sub) + '</p>'
      + '<span class="cta sig mt-7 inline-flex h-[46px] w-max items-center gap-2 rounded-full border border-rosewood/30 bg-white/70 px-6 text-[13.5px] font-semibold text-rosewood-deep hover:bg-white">자세히 <iconify-icon class="cta-ico sig" icon="solar:arrow-right-linear" width="15"></iconify-icon></span></div></a>';
  }

  /* 상품 */
  var prods = (db.products || []).filter(function(p){ return p.on !== false; });
  var pg = $('prodGrid');
  if (pg) pg.innerHTML = prods.map(function(p, i){
    var img = (p.imgs || [])[0];
    var dc = p.price && p.sale && p.sale < p.price;
    return '<article class="reveal card-hover"' + RV(i, 6) + '><a href="#product-' + esc(p.id) + '" class="block"><div class="img-zoom relative rounded-[1.6rem] ring-1 ring-rosewood/10">'
      + (img ? '<img src="' + esc(img) + '" alt="' + esc(p.n) + '" class="aspect-square w-full rounded-[1.6rem] object-cover" loading="lazy" decoding="async">' : '<span class="block aspect-square w-full rounded-[1.6rem] bg-shell"></span>')
      + (p.soldout ? '<span class="absolute left-3 top-3 rounded-full bg-espresso/80 px-2.5 py-1 text-[11px] font-bold text-ivory">품절</span>' : '')
      + '</div><h3 class="mt-3 text-[14.5px] font-bold">' + esc(p.n) + '</h3><p class="break-keep mt-1 text-[12.5px] text-mocha">' + esc(p.desc) + '</p>'
      + (p.sale ? '<p class="tnum mt-1.5 text-[13.5px] font-bold text-espresso">' + (dc ? '<span class="mr-1.5 text-[12px] font-medium text-mocha/70 line-through">' + won(p.price) + '</span>' : '') + won(p.sale) + '</p>' : '')
      + '</a></article>';
  }).join('');
  setH('teleTitle', nl(H.teleTitle)); setI('teleImg', H.teleImg);

  /* 후기 */
  var rg = $('reviewGrid');
  if (rg) rg.innerHTML = posts('review').slice(0, 6).map(function(p, i){
    var who = plain(p.t);
    return '<blockquote class="reveal card-hover flex flex-col rounded-[1.8rem] border border-rosewood/15 bg-white/60 px-7 py-7"' + RV(i % 3, 7) + '><iconify-icon icon="solar:chat-square-like-linear" width="20" class="text-rosewood"></iconify-icon>'
      + '<p class="break-keep mt-4 flex-1 text-[14px] leading-relaxed text-espresso">' + nl(p.sub) + '</p>'
      + '<footer class="mt-5 flex items-center gap-2.5 text-[12.5px] font-semibold text-mocha"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-rosewood/10 text-[11px] text-rosewood">' + esc(who.charAt(0)) + '</span>' + esc(who) + '</footer></blockquote>';
  }).join('');
  setT('reviewNote', H.reviewNote);

  /* 사진첩 */
  var gg = $('galleryGrid');
  if (gg) gg.innerHTML = (db.gallery || []).map(function(g, i){
    return '<figure class="reveal img-zoom break-inside-avoid rounded-[1.6rem] ring-1 ring-rosewood/10"' + RV(i % 6, 5) + '><img src="' + esc(g.img) + '" alt="' + esc(g.alt) + '" class="w-full rounded-[1.6rem] object-cover" loading="lazy" decoding="async"></figure>';
  }).join('');

  /* 공지 */
  var nlst = $('noticeList');
  if (nlst) nlst.innerHTML = posts('notice').slice(0, 5).map(function(n){
    return '<li><a href="#post-' + esc(n.id) + '" class="sig group flex items-center gap-6 py-5 hover:bg-white/50"><span class="tnum shrink-0 text-[13px] font-medium text-mocha">' + esc(String(n.d || '').slice(2)) + '</span>'
      + '<span class="break-keep flex-1 text-[15px] font-semibold">' + esc(plain(n.t)) + '</span><iconify-icon icon="solar:alt-arrow-right-linear" width="17" class="sig shrink-0 text-mocha group-hover:translate-x-1 group-hover:text-rosewood-deep"></iconify-icon></a></li>';
  }).join('');

  /* 하단 링크: 이용약관·비급여 비용 (내용이 있을 때만) */
  [['termsLink', 'terms'], ['feesLink', 'fees']].forEach(function(x){ var a = $(x[0]); if (a) a.hidden = !String(I[x[1]] || '').trim(); });

  /* =====================================================================
     팝업 창 (게시글·게시판·상품·개인정보)
     ===================================================================== */
  /* 창을 몇 단계 열었는지(curN) 기억해 두었다가, 닫을 때 그만큼 뒤로 가기 → 뒤로가기 버튼과 자연스럽게 맞물림 */
  var ov = $('ov'), ovBody = $('ovBody'), clickedAt = 0, curN = 0;
  var OVRE = /^#(post|board|product|page)-/;
  function openOv(html){
    ovBody.innerHTML = html; ov.hidden = false; document.body.style.overflow = 'hidden';
    ov.querySelector('.ov-panel').scrollTop = 0;
  }
  function hideOv(){ ov.hidden = true; ovBody.innerHTML = ''; document.body.style.overflow = ''; }
  /* 창 안의 「상담 신청」처럼 홈페이지 다른 곳으로 이동할 때: 창만 닫고 이동은 그대로 */
  window.leaveOv = function(){ curN = 0; hideOv(); };
  window.closeOv = function(){
    if (curN > 0){ var n = curN; curN = 0; history.go(-n); return; }
    hideOv();
    if (OVRE.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  };
  ov.addEventListener('click', function(e){ if (e.target === ov) closeOv(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !ov.hidden) closeOv(); });
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#post-"],a[href^="#board-"],a[href^="#product-"],a[href^="#page-"]');
    if (a && a.getAttribute('href') !== location.hash) clickedAt = Date.now();
  });

  function hdr(kicker, title){
    return '<p class="text-[12px] font-semibold uppercase tracking-[0.24em] text-rosewood">' + esc(kicker) + '</p><h2 class="break-keep mt-2 text-[24px] font-bold leading-snug tracking-snugger sm:text-[28px]">' + title + '</h2>';
  }
  function showBoard(cat){
    var list = posts(cat);
    openOv(hdr('Board', esc(BOARD[cat] || '게시판')) + '<ul class="mt-6 divide-y divide-rosewood/12 border-y border-rosewood/12">' + (list.length ? list.map(function(p){
      return '<li><a href="#post-' + esc(p.id) + '" class="sig group flex items-center gap-4 py-4 hover:bg-white/50">'
        + (p.img ? '<img src="' + esc(p.img) + '" alt="" class="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy">' : '')
        + '<span class="min-w-0 flex-1"><span class="block break-keep text-[15px] font-semibold">' + esc(plain(p.t).replace(/\n/g, ' ')) + '</span>'
        + '<span class="mt-1 block truncate text-[12.5px] text-mocha">' + esc(p.sub) + '</span></span><span class="tnum shrink-0 text-[12px] text-mocha">' + esc(p.d) + '</span></a></li>';
    }).join('') : '<li class="py-10 text-center text-[13.5px] text-mocha">등록된 글이 없습니다.</li>') + '</ul>');
  }
  function showPost(id){
    var p = (db.posts || []).filter(function(x){ return x.id === id && x.pub !== false; })[0];
    if (!p){ openOv('<p class="py-10 text-center text-mocha">글을 찾을 수 없습니다.</p>'); return; }
    visit('post:' + p.id);
    openOv('<a href="#board-' + esc(p.cat) + '" class="sig inline-flex items-center gap-1 text-[12.5px] font-semibold text-rosewood hover:text-rosewood-deep"><iconify-icon icon="solar:alt-arrow-left-linear" width="14"></iconify-icon>' + esc(BOARD[p.cat] || '') + '</a>'
      + '<h2 class="break-keep mt-3 text-[24px] font-bold leading-snug tracking-snugger sm:text-[30px]">' + tt(p.t) + '</h2>'
      + '<p class="tnum mt-2 text-[12.5px] text-mocha">' + esc(p.d) + '</p>'
      + (p.img ? '<img src="' + esc(p.img) + '" alt="" class="mt-6 w-full rounded-[1.4rem] object-cover">' : '')
      + '<div class="yo-body mt-7">' + safe(p.body || ('<p>' + nl(p.sub) + '</p>')) + '</div>'
      + '<div class="mt-10 flex flex-wrap gap-3 border-t border-rosewood/12 pt-6"><a href="#contact" onclick="leaveOv()" class="cta sig inline-flex h-[46px] items-center gap-2 rounded-full bg-rosewood-deep px-6 text-[13.5px] font-semibold text-ivory">상담 신청</a>'
      + '<a href="' + esc(tel) + '" class="cta sig inline-flex h-[46px] items-center gap-2 rounded-full border border-rosewood/30 bg-white/70 px-6 text-[13.5px] font-semibold text-rosewood-deep">전화 상담 ' + esc(I.phone) + '</a></div>');
  }
  function showProduct(id){
    var p = (db.products || []).filter(function(x){ return x.id === id && x.on !== false; })[0];
    if (!p){ openOv('<p class="py-10 text-center text-mocha">상품을 찾을 수 없습니다.</p>'); return; }
    visit('product:' + p.id);
    var imgs = p.imgs || [], dc = p.price && p.sale && p.sale < p.price;
    var info = [['주요 성분', 'ing'], ['상품 용량', 'vol'], ['상품 효과', 'eff'], ['사용 기한', 'exp'], ['기타 사항', 'etc']].filter(function(x){ return p.info && String(p.info[x[1]] || '').trim(); });
    var S = db.shipping || {};
    openOv('<div class="grid grid-cols-1 gap-7 md:grid-cols-2">'
      + '<div>' + (imgs[0] ? '<img id="pvMain" src="' + esc(imgs[0]) + '" alt="' + esc(p.n) + '" class="aspect-square w-full rounded-[1.4rem] object-cover">' : '<span class="block aspect-square w-full rounded-[1.4rem] bg-shell"></span>')
      + (imgs.length > 1 ? '<div class="mt-3 flex flex-wrap gap-2">' + imgs.map(function(u){ return '<button type="button" onclick="document.getElementById(\'pvMain\').src=this.dataset.u" data-u="' + esc(u) + '" class="h-16 w-16 overflow-hidden rounded-xl ring-1 ring-rosewood/15"><img src="' + esc(u) + '" alt="" class="h-full w-full object-cover"></button>'; }).join('') + '</div>' : '') + '</div>'
      + '<div><p class="text-[12px] font-semibold text-rosewood">' + esc(p.cat || '원내 상품') + '</p><h2 class="break-keep mt-2 text-[24px] font-bold leading-snug">' + esc(p.n) + '</h2>'
      + '<p class="break-keep mt-2 text-[14px] leading-relaxed text-mocha">' + nl(p.desc) + '</p>'
      + (p.sale ? '<p class="tnum mt-5 text-[22px] font-extrabold">' + (dc ? '<span class="mr-2 text-[15px] font-medium text-mocha/70 line-through">' + won(p.price) + '</span><span class="mr-1.5 text-[15px] text-bad">' + Math.round((1 - p.sale / p.price) * 100) + '%</span>' : '') + won(p.sale) + '</p>' : '')
      + (p.soldout ? '<p class="mt-3 inline-block rounded-full bg-espresso/80 px-3 py-1 text-[12px] font-bold text-ivory">현재 품절</p>' : '')
      + (info.length ? '<dl class="mt-6 divide-y divide-rosewood/12 border-y border-rosewood/12 text-[13px]">' + info.map(function(x){ return '<div class="grid grid-cols-[84px_1fr] gap-3 py-3"><dt class="font-semibold text-mocha">' + x[0] + '</dt><dd class="break-keep">' + nl(p.info[x[1]]) + '</dd></div>'; }).join('') + '</dl>' : '')
      + '<div class="mt-6 flex flex-wrap gap-2.5"><a href="#contact" data-ask="' + esc(p.n) + '" class="ask-btn cta sig inline-flex h-[48px] items-center gap-2 rounded-full bg-rosewood-deep px-6 text-[14px] font-semibold text-ivory">구매 · 상담 문의</a>'
      + '<a href="' + esc(tel) + '" class="cta sig inline-flex h-[48px] items-center rounded-full border border-rosewood/30 bg-white/70 px-6 text-[14px] font-semibold text-rosewood-deep">전화 문의</a></div>'
      + '<p class="break-keep mt-3 text-[12px] text-mocha">한약·의약품은 한의사 진료 후 처방·구매할 수 있습니다.</p></div></div>'
      + (p.body && p.body.replace(/<[^>]*>/g, '').trim() || /<img/i.test(p.body || '') ? '<div class="yo-body mt-10 border-t border-rosewood/12 pt-8">' + (p.btitle ? '<h3 class="text-[19px] font-bold">' + esc(p.btitle) + '</h3>' : '') + safe(p.body) + '</div>' : '')
      + '<details class="mt-8 rounded-2xl border border-rosewood/15 bg-white/50 px-5 py-4 text-[13px]"><summary class="cursor-pointer font-semibold">배송 · 취소 · 교환/반품 안내</summary>'
      + '<div class="mt-3 space-y-3 break-keep leading-relaxed text-mocha"><p><b class="text-espresso">배송</b><br>' + nl(S.ship) + '</p><p><b class="text-espresso">주문 취소</b><br>' + nl(S.cancel) + '</p><p><b class="text-espresso">교환/반품</b><br>' + nl(S.refund) + '</p></div></details>');
    var ask = ov.querySelector('.ask-btn');
    if (ask) ask.addEventListener('click', function(){ var m = $('consultMemo'); if (m) m.value = '상품 문의: ' + this.getAttribute('data-ask'); leaveOv(); });
  }
  var PAGES = {
    privacy: ['개인정보 처리방침', function(){
      return '<div class="yo-body"><p>' + esc(I.name) + '(이하 「한의원」)은 상담 신청 시 아래와 같이 개인정보를 수집·이용합니다.</p>'
        + '<ul><li><b>수집 항목</b> : 이름, 연락처, 문의 내용</li><li><b>이용 목적</b> : 상담·예약 연락</li><li><b>보유 기간</b> : 접수일로부터 1년 (기간이 지나면 자동 삭제)</li>'
        + '<li><b>동의 거부</b> : 동의하지 않을 수 있으며, 이 경우 온라인 상담 신청이 제한됩니다. (전화 상담은 가능)</li></ul>'
        + '<p>개인정보 관련 문의 : ' + esc(I.phone) + ' (대표 ' + esc(I.ceo) + ')</p>' + (I.privacy ? '<p>' + nl(I.privacy) + '</p>' : '') + '</div>';
    }],
    terms: ['이용약관', function(){ return '<div class="yo-body"><p>' + nl(I.terms) + '</p></div>'; }],
    fees: ['비급여 진료 비용', function(){ return '<div class="yo-body"><p>' + nl(I.fees) + '</p></div>'; }]
  };
  function route(){
    var h = decodeURIComponent(location.hash || ''), m;
    if (OVRE.test(h)){
      if (Date.now() - clickedAt < 1500){ clickedAt = 0; curN++; history.replaceState({ yoN: curN }, ''); }
      else curN = (history.state && history.state.yoN) || 0;
    } else curN = 0;
    if ((m = h.match(/^#post-(.+)$/))) showPost(m[1]);
    else if ((m = h.match(/^#board-(.+)$/))) showBoard(m[1]);
    else if ((m = h.match(/^#product-(.+)$/))) showProduct(m[1]);
    else if ((m = h.match(/^#page-(.+)$/)) && PAGES[m[1]]) openOv(hdr('Info', PAGES[m[1]][0]) + '<div class="mt-6">' + PAGES[m[1]][1]() + '</div>');
    else if (!ov.hidden) hideOv();
  }
  window.addEventListener('hashchange', route);
  if (/^#(post|board|product|page)-/.test(location.hash)) route();

  /* =====================================================================
     상담 신청 → Supabase reservations (관리자 「빠른 상담」에서 확인)
     ===================================================================== */
  var form = $('consultForm');
  if (form) form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var name = form.name.value.trim(), phone = form.phone.value.trim(), memo = (form.memo ? form.memo.value.trim() : '');
    var digits = phone.replace(/[^0-9]/g, '');
    if (!name || !phone){ alert('이름과 연락처를 입력해 주세요.'); return; }
    if (name.length > 30){ alert('이름은 30자 이내로 입력해 주세요.'); return; }
    if (digits.length < 9 || digits.length > 12){ alert('연락처를 정확히 입력해 주세요. (예: 010-1234-5678)'); return; }
    if (!form.agree.checked){ alert('개인정보 수집/이용에 동의해 주세요.'); return; }
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.style.opacity = '.6';
    var finish = function(ok, msg){
      btn.disabled = false; btn.style.opacity = '';
      if (ok){ alert('상담 신청이 접수되었습니다. 진료 시간 내 순차적으로 연락드리겠습니다.'); form.reset(); }
      else alert(msg || '접수 중 문제가 생겼습니다. 전화(' + I.phone + ')로 문의해 주세요.');
    };
    var row = { name: name, phone: phone, memo: memo ? memo.slice(0, 500) : null, source: 'consult', sms_agree: false };
    if (window.YJ_DB){
      window.YJ_DB.from('reservations').insert(row).then(function(r){
        if (r.error){ var m = r.error.message || ''; finish(false, /[가-힣]/.test(m) ? m : null); }
        else finish(true);
      }, function(){ finish(false); });
    } else {
      /* DB 연결 전(미리보기): 이 브라우저에만 저장 */
      var loc = KK.get('yo_consult_local') || [];
      row.created_at = new Date().toISOString(); row.status = '미확정'; row.id = 'local' + Date.now();
      loc.push(row); KK.set('yo_consult_local', loc);
      finish(true);
    }
  });

  /* =====================================================================
     팝업 (관리자 「팝업 설정」)
     ===================================================================== */
  (function(){
    var P = db.popup || {}, items = (P.items || []).filter(function(x){ return x && x.img; });
    if (!P.on || !items.length) return;
    var w = window.innerWidth, dev = w < 768 ? 'mo' : (w < 1024 ? 'tab' : 'pc');
    if (P[dev] === false) return;
    var today = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem('yo_popup_hide') === today) return; } catch(e){}
    var pop = $('popup'), idx = 0;
    var draw = function(){
      var it = items[idx];
      $('popupImg').innerHTML = (it.link ? '<a href="' + esc(url(it.link)) + '"' + (/^#/.test(it.link) ? '' : ' target="_blank" rel="noopener"') + '>' : '') + '<img src="' + esc(it.img) + '" alt="' + esc(it.t || '팝업') + '" class="block w-full">' + (it.link ? '</a>' : '');
      $('popupNav').hidden = items.length < 2; $('popupNum').textContent = (idx + 1) + ' / ' + items.length;
    };
    $('popupPrev').onclick = function(){ idx = (idx + items.length - 1) % items.length; draw(); };
    $('popupNext').onclick = function(){ idx = (idx + 1) % items.length; draw(); };
    $('popupClose').onclick = function(){ pop.hidden = true; };
    $('popupToday').onclick = function(){ try { localStorage.setItem('yo_popup_hide', today); } catch(e){} pop.hidden = true; };
    $('popupImg').addEventListener('click', function(e){ if (e.target.closest('a[href^="#"]')) pop.hidden = true; });
    draw(); setTimeout(function(){ pop.hidden = false; }, 500);
  })();

  /* =====================================================================
     방문 기록 (익명 · 관리자 「방문 통계」)
     ===================================================================== */
  function visit(path){
    if (!window.YJ_DB) return;
    try {
      var vid = localStorage.getItem('yo_vid');
      if (!vid){ vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('yo_vid', vid); }
      window.YJ_DB.from('site_visits').insert({ vid: vid, path: String(path).slice(0, 80) }).then(function(){}, function(){});
    } catch(e){}
  }
  visit('home');
})();
