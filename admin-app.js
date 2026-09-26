/* =========================================================================
   연오재 홈페이지 관리자 — 기능 (저장: YO_STORE → Supabase site_kv)
   ========================================================================= */
(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var DB = YO_STORE.get();
var SB = window.YJ_DB || null;          /* Supabase 연결 (없으면 미리보기 모드) */
var ME = null;                          /* { email, name, role } */
var BOARDS = [['event','진행 중인 이벤트'],['review','진료 후기'],['diet','다이어트 치료'],['focus','집중 진료'],['treat','한방 치료'],['about','한의원 소개'],['notice','공지사항']];
var BNAME = {}; BOARDS.forEach(function(b){ BNAME[b[0]] = b[1]; });
var BHINT = {
  event: '홈페이지 「진행 중인 이벤트」에는 맨 위 1개가 크게 보여요.',
  review: '제목에 「이름 님 · 치료명」, 요약 문구에 후기 내용을 적어 주세요. 위쪽 6개가 홈페이지에 보여요.',
  diet: '맨 위 글이 홈페이지 다이어트 영역(제목·요약·사진)에 보여요.',
  focus: '맨 위 글이 홈페이지 집중 진료 영역에 보여요. 체크 항목도 함께 표시돼요.',
  treat: '위쪽 4개가 홈페이지 한방 치료 칸(큰 사진 카드 1 · 사진 카드 1 · 아이콘 카드 2)에 보여요.',
  about: '위쪽 2개가 홈페이지 한의원 소개 카드에 보여요.',
  notice: '위쪽 5개가 홈페이지 공지사항 목록에 보여요.'
};

/* ---------------- 공통 도구 ---------------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function plain(s){ return String(s || '').replace(/\*/g, '').replace(/\n/g, ' '); }
var fmt = function(n){ return (Number(n) || 0).toLocaleString('ko-KR'); };
var num = function(v){ return parseInt(String(v || '').replace(/[^0-9]/g, ''), 10) || 0; };
function today(){ var d = new Date(); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); }
function move(arr, i, d){ var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
var toastT;
function toast(msg, bad){
  var t = $('toast'); t.textContent = msg; t.style.background = bad ? '#C0362C' : '#2F343A';
  t.style.opacity = '1'; t.style.transform = 'translate(-50%,0)';
  clearTimeout(toastT); toastT = setTimeout(function(){ t.style.opacity = '0'; t.style.transform = 'translate(-50%,1rem)'; }, bad ? 5000 : 2200);
}
window.toast = toast;
/* 저장 (바뀐 항목만 Supabase 로) */
var saveFail = false;
function save(msg){
  saveFail = false;
  var ok = YO_STORE.update();
  if (ok === false){ toast('저장하지 못했어요. 사진이 너무 많거나 큽니다.', true); return; }
  if (!SB) toast((msg || '저장되었습니다') + ' (미리보기: 이 브라우저에만)');
  else toast(msg || '저장되었습니다');
}
window.addEventListener('yj-save', function(e){
  if (!e.detail.ok && !saveFail){
    saveFail = true;
    var m = e.detail.msg || '';
    toast(/row-level|permission|JWT|security/i.test(m) ? '저장 권한이 없어요. 다시 로그인해 주세요. (직원 등급은 내용 수정 불가)' : '서버 저장 실패: ' + m, true);
  }
});

/* ---------------- 사진 올리기 (자동으로 줄여서) ---------------- */
function pickFiles(multiple){
  return new Promise(function(res){
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = !!multiple;
    i.onchange = function(){ res([].slice.call(i.files || [])); }; i.click();
  });
}
function shrink(file, max){
  return new Promise(function(res){
    if (!/^image\/(jpeg|png|webp|bmp)/.test(file.type)) return res(file);
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function(){
      var s = Math.min(1, max / Math.max(img.width, img.height));
      if (s === 1 && file.size < 400 * 1024) { URL.revokeObjectURL(u); return res(file); }
      var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(function(b){ res(b ? new File([b], (file.name || 'img').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.84);
    };
    img.onerror = function(){ URL.revokeObjectURL(u); res(file); };
    img.src = u;
  });
}
function toDataUrl(f){ return new Promise(function(r){ var fr = new FileReader(); fr.onload = function(){ r(fr.result); }; fr.readAsDataURL(f); }); }
async function uploadOne(file){
  if (file.size > 30 * 1024 * 1024) throw new Error('사진이 너무 커요 (30MB 이하)');
  var f = await shrink(file, SB ? 1800 : 1000);
  if (SB && window.uploadImage) return await window.uploadImage(f);
  return await toDataUrl(f);
}
async function pickImages(multiple){
  var files = await pickFiles(multiple); if (!files.length) return [];
  toast('사진 올리는 중… (' + files.length + '장)');
  var out = [];
  for (var i = 0; i < files.length; i++){
    try { out.push(await uploadOne(files[i])); }
    catch(e){ toast('사진 올리기 실패: ' + (e.message || e), true); }
  }
  if (out.length) toast('사진 ' + out.length + '장 올림 — 「저장」을 눌러야 반영돼요');
  return out;
}
/* img 요소에 사진 넣기 */
window.pickTo = async function(id){ var u = (await pickImages(false))[0]; if (u) $(id).src = u; };
function srcOf(id){ var e = $(id); return e.getAttribute('src') || ''; }

/* ---------------- 편집 도구 모음 (본문) ---------------- */
function ytEmbed(u){ var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/); return m ? 'https://www.youtube-nocookie.com/embed/' + m[1] : ''; }
function mountToolbar(bar){
  var ed = $(bar.getAttribute('data-toolbar')), range = null;
  var keep = function(){ var s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
  ed.addEventListener('keyup', keep); ed.addEventListener('mouseup', keep); ed.addEventListener('input', keep);
  var restore = function(){ ed.focus(); if (range){ var s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
  var ins = function(html){ restore(); document.execCommand('insertHTML', false, html); keep(); };
  var tools = [
    ['solar:text-bold-linear', '굵게', function(){ restore(); document.execCommand('bold'); }],
    ['solar:text-square-linear', '소제목', function(){ restore(); document.execCommand('formatBlock', false, 'h3'); }],
    ['solar:list-linear', '목록', function(){ restore(); document.execCommand('insertUnorderedList'); }],
    ['solar:gallery-linear', '사진', async function(){ keep(); var us = await pickImages(true); if (us.length) ins(us.map(function(u){ return '<p><img src="' + esc(u) + '" alt=""></p>'; }).join('')); }],
    ['solar:play-circle-linear', '유튜브', function(){ keep(); var u = prompt('유튜브 영상 주소를 붙여 넣으세요'); if (!u) return; var e = ytEmbed(u); if (!e) return alert('유튜브 주소가 아니에요.'); ins('<p><iframe src="' + e + '" allowfullscreen></iframe></p><p><br></p>'); }],
    ['solar:link-linear', '링크', function(){ keep(); var u = prompt('연결할 주소 (https://...)'); if (!u) return; if (!/^(https?:|tel:|mailto:|#)/.test(u)) u = 'https://' + u; restore(); var sel = getSelection(); if (sel.isCollapsed) document.execCommand('insertHTML', false, '<a href="' + esc(u) + '">' + esc(u) + '</a>'); else document.execCommand('createLink', false, u); }],
    ['solar:minus-square-linear', '구분선', function(){ ins('<hr><p><br></p>'); }],
    ['solar:widget-6-linear', '표', function(){ ins('<table><tbody><tr><th>항목</th><th>내용</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>'); }],
    ['solar:phone-linear', '전화번호', function(){ var p = DB.info.phone || ''; ins('<p><a href="tel:' + esc(p.replace(/[^0-9+]/g, '')) + '">📞 전화 상담 ' + esc(p) + '</a></p>'); }],
    ['solar:calendar-mark-linear', '네이버 예약', function(){ if (!DB.info.naver) return alert('설정 → 「네이버 예약 주소」를 먼저 넣어 주세요.'); ins('<p><a href="' + esc(DB.info.naver) + '">📅 네이버 예약 바로가기</a></p>'); }],
    ['solar:eraser-linear', '서식 지우기', function(){ restore(); document.execCommand('removeFormat'); }]
  ];
  bar.innerHTML = tools.map(function(t, i){ return '<button type="button" class="tb" data-i="' + i + '"><iconify-icon icon="' + t[0] + '" width="17"></iconify-icon>' + t[1] + '</button>'; }).join('');
  bar.addEventListener('mousedown', function(e){ if (e.target.closest('.tb')) e.preventDefault(); });
  bar.addEventListener('click', function(e){ var b = e.target.closest('.tb'); if (b) tools[+b.dataset.i][2](); });
  /* 붙여넣기: 서식 없는 글자로 (다른 사이트 스타일이 섞이지 않게) */
  ed.addEventListener('paste', function(e){
    var html = e.clipboardData.getData('text/html'), txt = e.clipboardData.getData('text/plain');
    if (html && /<img/i.test(html)) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, esc(txt).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>'));
  });
}
document.querySelectorAll('[data-toolbar]').forEach(mountToolbar);

/* 세그먼트 버튼 (활성/비활성 등) */
function segSet(id, v){ $(id).querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.dataset.v === String(v)); }); }
function segGet(id){ var b = $(id).querySelector('button.on'); return b ? b.dataset.v : null; }
document.querySelectorAll('.seg').forEach(function(s){ s.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b && s.id !== 'statDays') segSet(s.id, b.dataset.v); }); });
function tog(el, on){ el.classList.toggle('on', !!on); el.setAttribute('aria-checked', !!on); }

/* =====================================================================
   화면 전환
   ===================================================================== */
var TITLES = { dash:'운영 현황', menus:'상단 메뉴 관리', custom:'맞춤 콘텐츠', popup:'팝업 설정', prodedit:'상품 수정', quick:'빠른 상담 · 예약', posts:'게시글 관리',
  products:'상품 등록·수정', shipping:'배송·환불 안내 템플릿', stats:'방문 통계', staff:'직원 계정 관리', home:'홈 화면 꾸미기', doctors:'의료진 관리', gallery:'사진첩 관리', settings:'설정 · 의원 정보' };
var GENERIC = {
  '회원 관리': '홈페이지 회원가입·로그인은 온라인 결제(2단계)와 함께 연결됩니다. 지금은 상담 신청을 「빠른 상담 · 예약」에서 관리하세요.',
  '진료 및 배송 관리': '결제 주문이 생기면 진료·배송 상태를 여기서 관리합니다. PG(카드 결제) 계약 후 2단계에서 연결됩니다.',
  '수(壽) 멤버스 상품 연동': '외부 업체 상품 연동은 해당 업체의 연동 정보(상품 목록 제공 방식)를 받은 뒤 연결할 수 있어요. 지금은 「상품 등록·수정」에서 직접 등록해 주세요.',
  '린다이어트 상품 연동': '외부 업체 상품 연동은 해당 업체의 연동 정보를 받은 뒤 연결할 수 있어요. 지금은 「상품 등록·수정」에서 직접 등록해 주세요.',
  '레이시올로지 상품 연동': '외부 업체 상품 연동은 해당 업체의 연동 정보를 받은 뒤 연결할 수 있어요. 지금은 「상품 등록·수정」에서 직접 등록해 주세요.',
  '매출 통계': '온라인 결제(2단계)를 연결하면 매출이 자동으로 집계됩니다.',
  '결제': 'PG사(카드 결제) 계약 후 연결합니다. 계약 정보(가맹점 ID 등)를 준비해 주시면 이어서 작업할게요.',
  '서비스 연동': '네이버 예약·카카오톡 채널 주소는 「설정 (의원 정보)」에서 넣을 수 있어요. 그 밖의 연동(문자 알림 등)은 필요할 때 추가합니다.'
};
var sidebar = $('sidebar');
function showView(v, title){
  document.querySelectorAll('.view').forEach(function(x){ x.classList.remove('on'); });
  $('view-' + v).classList.add('on');
  $('pageTitle').textContent = title || TITLES[v] || '';
  document.querySelectorAll('.side-link').forEach(function(x){
    x.classList.toggle('on', x.dataset.view === v && (v !== 'generic' || x.dataset.title === title) || (v === 'prodedit' && x.dataset.view === 'products'));
  });
  if (window.innerWidth < 1024) sidebar.classList.add('-translate-x-full');
  window.scrollTo({ top: 0 });
  var R = { dash: renderDash, menus: renderMenus, posts: enterPosts, custom: renderCustom, popup: renderPopup, quick: loadQuick, products: renderProducts,
    shipping: renderShipping, stats: loadStats, staff: loadStaff, home: renderHome, doctors: renderDoctors, gallery: renderGallery, settings: renderSettings };
  if (R[v]) R[v]();
}
window.showView = showView;
document.querySelectorAll('.side-link').forEach(function(a){ a.addEventListener('click', function(e){
  e.preventDefault();
  var v = a.dataset.view;
  if (v === 'generic'){ $('genericTitle').textContent = a.dataset.title; $('genericMsg').textContent = GENERIC[a.dataset.title] || '준비 중입니다.'; }
  showView(v, v === 'generic' ? a.dataset.title : null);
}); });
$('sideToggle').addEventListener('click', function(){ sidebar.classList.toggle('-translate-x-full'); });

/* =====================================================================
   대시보드
   ===================================================================== */
function renderDash(){
  var days = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'], n = new Date();
  $('dashDate').textContent = (n.getMonth() + 1) + '월 ' + n.getDate() + '일 ' + days[n.getDay()] + ' 운영 현황';
  $('dPosts').textContent = DB.posts.filter(function(p){ return p.pub !== false; }).length + '개';
  $('dProds').textContent = DB.products.filter(function(p){ return p.on !== false; }).length + '개';
  getQuick().then(function(list){
    var w = list.filter(function(c){ return c.status === '미확정'; }).length;
    $('dQuick').textContent = w + '건'; badgeQuick(w);
    $('dRecent').innerHTML = list.slice(0, 6).map(function(c){
      return '<li class="flex items-center justify-between gap-3 py-2.5"><span class="min-w-0"><b>' + esc(c.name) + '</b> <span class="tnum text-mocha">' + esc(c.phone) + '</span>'
        + (c.memo ? '<span class="block truncate text-[12px] text-faint">' + esc(c.memo) + '</span>' : '') + '</span><span class="flex shrink-0 items-center gap-2"><span class="tnum text-[12px] text-faint">' + when(c.created_at) + '</span>' + stPill(c.status) + '</span></li>';
    }).join('') || '<li class="py-8 text-center text-faint">아직 접수된 상담이 없어요.</li>';
  });
  if (SB && canEdit()) SB.rpc('visit_stats', { days: 1 }).then(function(r){
    var t = (r.data || []).slice(-1)[0], d = new Date(); var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    $('dToday').textContent = (t && t.day === key ? t.views : 0) + '회';
  }); else $('dToday').textContent = SB ? '-' : '미리보기';
}
window.renderDash = renderDash;
function badgeQuick(w){ [['bellCount'], ['sideQuick']].forEach(function(x){ var e = $(x[0]); e.hidden = !w; e.textContent = w > 99 ? '99+' : w; }); }

/* =====================================================================
   상단 메뉴
   ===================================================================== */
var SECTIONS = [['#home','홈 (맨 위)'],['#about','한의원 소개'],['#treatments','한방 치료'],['#focus','집중 진료'],['#diet','다이어트 치료'],['#doctors','의료진 소개'],['#events','진행 중인 이벤트'],['#products','한방 상품'],['#reviews','진료 후기'],['#contact','상담 신청 (진료 예약)'],['#gallery','사진첩'],['#info','의원 정보'],['#notice','공지사항']];
function renderMenus(){
  var m = DB.menus;
  $('menuBody').innerHTML = m.map(function(x, i){
    var builtin = !!x.fixed || SECTIONS.some(function(s){ return s[0] === x.target; }) && !x.custom;
    var cnt = x.board ? DB.posts.filter(function(p){ return p.cat === x.board; }).length : null;
    var opts = SECTIONS.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === x.target ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    var isSec = SECTIONS.some(function(s){ return s[0] === x.target; });
    return '<tr class="hover:bg-linesoft/40" data-i="' + i + '">'
      + '<td class="whitespace-nowrap px-3 py-3"><span class="tnum mr-1 font-semibold">' + (i + 1) + '</span>'
      + (x.fixed ? '<span class="rounded-md bg-linesoft px-1.5 py-0.5 text-[10.5px] font-bold text-mocha">고정</span>' : '<button type="button" class="ico h-7 w-7" data-a="up" aria-label="위로"><iconify-icon icon="solar:alt-arrow-up-linear" width="15"></iconify-icon></button><button type="button" class="ico h-7 w-7" data-a="down" aria-label="아래로"><iconify-icon icon="solar:alt-arrow-down-linear" width="15"></iconify-icon></button>') + '</td>'
      + '<td class="px-2 py-3"><input data-f="name" value="' + esc(x.name) + '" maxlength="20" class="h-9 w-44 rounded-lg border border-line bg-ivory/50 px-3 font-semibold"></td>'
      + '<td class="px-2 py-3">' + (x.custom
          ? '<select data-f="kind" class="h-9 rounded-lg border border-line bg-ivory/50 px-2"><option value="sec"' + (isSec ? ' selected' : '') + '>홈페이지 영역</option><option value="url"' + (isSec ? '' : ' selected') + '>다른 주소(링크)</option></select> '
            + (isSec ? '<select data-f="target" class="h-9 rounded-lg border border-line bg-ivory/50 px-2">' + opts + '</select>' : '<input data-f="target" value="' + esc(x.target) + '" placeholder="https://" class="h-9 w-56 rounded-lg border border-line bg-ivory/50 px-3">')
          : '<span class="text-mocha">' + esc((SECTIONS.filter(function(s){ return s[0] === x.target; })[0] || [0, x.target])[1]) + '</span>') + '</td>'
      + '<td class="tnum px-2 py-3 font-semibold">' + (cnt === null ? '<span class="text-faint">-</span>' : '<button type="button" data-a="posts" class="hover:text-rosewood-deep">' + cnt + '개 →</button>') + '</td>'
      + '<td class="px-2 py-3">' + (x.fixed ? '<span class="text-faint">-</span>' : '<button type="button" class="toggle' + (x.on ? ' on' : '') + '" data-a="on" role="switch" aria-checked="' + !!x.on + '" aria-label="활성화"></button>') + '</td>'
      + '<td class="whitespace-nowrap px-4 py-3 text-right"><a class="ico" href="index.html' + (/^#/.test(x.target) ? esc(x.target) : '') + '" target="_blank" aria-label="홈페이지에서 보기"><iconify-icon icon="solar:square-top-up-linear" width="16"></iconify-icon></a>'
      + (x.custom ? '<button type="button" class="ico hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button>' : '') + '</td></tr>';
  }).join('');
}
function readMenuInputs(){
  $('menuBody').querySelectorAll('tr').forEach(function(tr){
    var x = DB.menus[+tr.dataset.i];
    var n = tr.querySelector('[data-f=name]'); if (n) x.name = n.value.trim() || x.name;
    var t = tr.querySelector('[data-f=target]'); if (t && x.custom) x.target = t.value.trim();
  });
}
$('menuBody').addEventListener('click', function(e){
  var b = e.target.closest('[data-a]'); if (!b) return;
  var i = +b.closest('tr').dataset.i, m = DB.menus; readMenuInputs();
  var a = b.dataset.a;
  if (a === 'up' && i > 1) move(m, i, -1);
  if (a === 'down' && i < m.length - 1) move(m, i, 1);
  if (a === 'on') m[i].on = !m[i].on;
  if (a === 'del'){ if (!confirm('「' + m[i].name + '」 메뉴를 삭제할까요?')) return; m.splice(i, 1); }
  if (a === 'posts'){ activeCat = m[i].board; showView('posts'); return; }
  renderMenus();
});
$('menuBody').addEventListener('change', function(e){
  if (e.target.dataset.f === 'kind'){ readMenuInputs(); var x = DB.menus[+e.target.closest('tr').dataset.i]; x.target = e.target.value === 'sec' ? '#contact' : 'https://'; renderMenus(); }
});
window.addMenu = function(){ readMenuInputs(); DB.menus.push({ id: YO_STORE.uid('m'), name: '새 메뉴', target: 'https://', on: true, custom: true }); renderMenus(); };
window.saveMenus = function(){
  readMenuInputs();
  var bad = DB.menus.filter(function(x){ return x.custom && !/^#/.test(x.target) && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(x.target); })[0];
  if (bad) return toast('「' + bad.name + '」 메뉴의 링크 주소를 확인해 주세요 (https://로 시작)', true);
  save(); renderMenus();
};

/* =====================================================================
   게시글
   ===================================================================== */
var activeCat = 'all', keyword = '', viewCount = null;
window.activeCat = activeCat;
function enterPosts(){
  renderPosts();
  if (SB && canEdit() && viewCount === null){
    SB.rpc('post_views').then(function(r){ viewCount = {}; (r.data || []).forEach(function(x){ viewCount[x.path.slice(5)] = x.views; }); renderPosts(); });
  }
}
function renderPosts(){
  window.activeCat = activeCat;
  var all = DB.posts;
  $('postTabs').innerHTML = [['all','전체']].concat(BOARDS).map(function(b){
    var n = b[0] === 'all' ? all.length : all.filter(function(p){ return p.cat === b[0]; }).length;
    return '<button data-cat="' + b[0] + '" class="ftab sig rounded-full border border-line bg-panel px-4 py-1.5 text-mocha' + (activeCat === b[0] ? ' on' : '') + '">' + b[1] + ' <span class="tnum ml-1 text-[11px] text-faint">' + n + '</span></button>';
  }).join('');
  var st = $('postStatus').value;
  var rows = all.map(function(p, i){ return { p: p, i: i }; }).filter(function(r){
    var p = r.p;
    return (activeCat === 'all' || p.cat === activeCat) && plain(p.t).indexOf(keyword) >= 0
      && (st === 'all' || (st === 'pub' ? p.pub !== false : p.pub === false));
  });
  $('postCount').textContent = rows.length;
  $('postBody').innerHTML = rows.map(function(r){
    var p = r.p, i = r.i;
    return '<tr class="hover:bg-linesoft/40" data-i="' + i + '">'
      + '<td class="whitespace-nowrap px-3 py-3"><button type="button" class="ico h-7 w-7" data-a="up" aria-label="위로"><iconify-icon icon="solar:alt-arrow-up-linear" width="15"></iconify-icon></button><button type="button" class="ico h-7 w-7" data-a="down" aria-label="아래로"><iconify-icon icon="solar:alt-arrow-down-linear" width="15"></iconify-icon></button></td>'
      + '<td class="px-2 py-3"><button type="button" data-a="edit" class="flex items-center gap-3 text-left">'
      + (p.img ? '<img src="' + esc(p.img) + '" alt="" class="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy">' : '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linesoft text-faint"><iconify-icon icon="solar:document-text-linear" width="16"></iconify-icon></span>')
      + '<span class="max-w-[340px] break-keep font-semibold leading-snug hover:text-rosewood-deep">' + (p.pin ? '<iconify-icon icon="solar:pin-bold" width="13" class="mr-1 text-rosewood align-[-1px]"></iconify-icon>' : '') + esc(plain(p.t)) + '</span></button></td>'
      + '<td class="tnum whitespace-nowrap px-2 py-3 text-mocha">' + esc(p.d) + '</td>'
      + '<td class="tnum px-2 py-3 text-mocha">' + (viewCount ? (viewCount[p.id] || 0) + '회' : '-') + '</td>'
      + '<td class="px-2 py-3">' + (p.pub !== false ? '<button type="button" data-a="pub" class="pill-g">게시 중</button>' : '<button type="button" data-a="pub" class="pill-n">비공개</button>') + '</td>'
      + '<td class="whitespace-nowrap px-2 py-3 font-medium text-mocha">' + esc(BNAME[p.cat] || p.cat) + '</td>'
      + '<td class="whitespace-nowrap px-4 py-3 text-right">'
      + '<button type="button" class="sig rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold hover:bg-linesoft" data-a="move">이동</button>'
      + '<button type="button" class="ico ml-1' + (p.pin ? ' text-rosewood-deep' : '') + '" data-a="pin" aria-label="고정" title="맨 앞에 고정"><iconify-icon icon="solar:pin-' + (p.pin ? 'bold' : 'linear') + '" width="16"></iconify-icon></button>'
      + '<button type="button" class="ico" data-a="edit" aria-label="수정"><iconify-icon icon="solar:pen-linear" width="16"></iconify-icon></button>'
      + '<button type="button" class="ico hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button>'
      + '<a class="ico" href="index.html#post-' + encodeURIComponent(p.id) + '" target="_blank" aria-label="홈페이지에서 보기"><iconify-icon icon="solar:square-top-up-linear" width="16"></iconify-icon></a></td></tr>';
  }).join('') || '<tr><td colspan="7" class="py-14 text-center text-faint">게시글이 없어요. 「+ 게시글 작성」을 눌러 보세요.</td></tr>';
}
$('postTabs').addEventListener('click', function(e){ var b = e.target.closest('.ftab'); if (!b) return; activeCat = b.dataset.cat; renderPosts(); });
$('postSearch').addEventListener('input', function(e){ keyword = e.target.value.trim(); renderPosts(); });
$('postStatus').addEventListener('change', renderPosts);
$('postBody').addEventListener('click', function(e){
  var b = e.target.closest('[data-a]'); if (!b) return;
  var i = +b.closest('tr').dataset.i, P = DB.posts, p = P[i], a = b.dataset.a;
  if (a === 'edit') return openPostEditor(i);
  if (a === 'move') return openMove(i);
  if (a === 'up' || a === 'down'){
    /* 같은 게시판 안에서 위/아래 글과 자리 바꾸기 */
    var d = a === 'up' ? -1 : 1, j = i + d;
    while (j >= 0 && j < P.length && P[j].cat !== p.cat) j += d;
    if (j < 0 || j >= P.length) return;
    P[i] = P[j]; P[j] = p;
  }
  if (a === 'pin') p.pin = !p.pin;
  if (a === 'pub') p.pub = p.pub === false;
  if (a === 'del'){ if (!confirm('「' + plain(p.t) + '」 글을 삭제할까요? 되돌릴 수 없어요.')) return; P.splice(i, 1); }
  save(a === 'del' ? '삭제되었습니다' : null); renderPosts();
});
/* 게시판 이동 */
var moveIdx = null;
function openMove(i){
  moveIdx = i; var p = DB.posts[i];
  $('movePostName').textContent = '「' + plain(p.t) + '」';
  $('moveList').innerHTML = BOARDS.map(function(b){
    return '<label class="sig flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 hover:bg-linesoft/60' + (b[0] === p.cat ? ' bg-rosewood/10 text-rosewood-deep' : '') + '">' + b[1]
      + '<input type="radio" name="board" value="' + b[0] + '"' + (b[0] === p.cat ? ' checked' : '') + ' class="h-4 w-4 accent-[#3B4B3F]"></label>';
  }).join('');
  $('moveModal').showModal();
}
$('moveConfirm').addEventListener('click', function(){
  var sel = document.querySelector('#moveList input:checked');
  if (sel && moveIdx !== null){ DB.posts[moveIdx].cat = sel.value; save('이동했습니다'); renderPosts(); }
  $('moveModal').close();
});

/* 편집기 */
var edState = null;   /* { idx } 기존 글 / { cat } 새 글 / { custom } 맞춤 콘텐츠 */
$('edBoard').innerHTML = BOARDS.map(function(b){ return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('');
function edBoardUi(){ var c = $('edBoard').value; $('edBoardHint').textContent = BHINT[c] || ''; $('edPointsWrap').hidden = c !== 'focus'; }
$('edBoard').addEventListener('change', edBoardUi);
$('edTitle').addEventListener('input', function(){ $('edTitleCount').textContent = $('edTitle').value.length; });
$('edPub').addEventListener('click', function(){ tog(this, !this.classList.contains('on')); });
function fillEditor(p){
  $('edBoard').value = p.cat || 'notice';
  $('edTitle').value = p.t || ''; $('edTitleCount').textContent = (p.t || '').length;
  $('edSub').value = p.sub || '';
  if (p.img) $('edCover').src = p.img; else $('edCover').removeAttribute('src');
  $('edTag').value = p.tag || '';
  $('edPoints').value = (p.points || []).join('\n');
  $('edDate').value = String(p.d || today()).replace(/\./g, '-');
  tog($('edPub'), p.pub !== false);
  $('edBody').innerHTML = clean(p.body);
  edBoardUi();
}
window.openPostEditor = function(idx, cat){
  if (typeof idx === 'number'){ edState = { idx: idx }; fillEditor(DB.posts[idx]); $('edHead').textContent = '게시글 수정'; $('edDelete').hidden = false; }
  else { edState = { cat: cat || 'notice' }; fillEditor({ cat: cat || 'notice', pub: true }); $('edHead').textContent = '새 게시글 작성'; $('edDelete').hidden = true; }
  $('editorModal').showModal(); $('editorModal').querySelector('.overflow-y-auto').scrollTop = 0;
};
window.closeEditor = function(){ $('editorModal').close(); };
/* 본문에서 위험한 코드 제거 (홈페이지 site-app.js 의 safe 와 같은 규칙) */
function clean(html){
  var t = document.createElement('template'); t.innerHTML = String(html || '');
  t.content.querySelectorAll('script,style,object,embed,form,input,button,link,meta,base').forEach(function(n){ n.remove(); });
  t.content.querySelectorAll('iframe').forEach(function(f){ if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(f.getAttribute('src') || '')) f.remove(); });
  t.content.querySelectorAll('*').forEach(function(el){
    [].slice.call(el.attributes).forEach(function(a){
      var n = a.name.toLowerCase();
      if (n.indexOf('on') === 0) el.removeAttribute(a.name);
      if ((n === 'href' || n === 'src') && /^\s*(javascript|vbscript|data:(?!image\/))/i.test(a.value)) el.removeAttribute(a.name);
    });
  });
  return t.innerHTML;
}
function stripBody(h){ return clean(h).replace(/<(p|div)><br><\/(p|div)>\s*$/i, '').trim(); }
window.saveEditor = function(){
  var t = $('edTitle').value.trim();
  if (!t) return toast('제목을 입력해 주세요', true);
  var body = stripBody($('edBody').innerHTML);
  var sub = $('edSub').value.trim() || $('edBody').innerText.trim().replace(/\s+/g, ' ').slice(0, 120);
  var d = $('edDate').value ? $('edDate').value.replace(/-/g, '.') : today();
  var data = { cat: $('edBoard').value, t: t, sub: sub, body: body, img: srcOf('edCover'), tag: $('edTag').value.trim(), d: d, pub: $('edPub').classList.contains('on'),
    points: $('edPoints').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean) };
  if (edState && typeof edState.idx === 'number') Object.assign(DB.posts[edState.idx], data);
  else {
    data.id = YO_STORE.uid('p'); data.pin = false;
    /* 새 글은 해당 게시판 맨 위에 */
    var first = DB.posts.findIndex(function(p){ return p.cat === data.cat; });
    DB.posts.splice(first < 0 ? 0 : first, 0, data);
    if (edState && edState.custom){ var c = DB.custom.filter(function(x){ return x.id === edState.custom; })[0]; if (c){ c.done = true; c.postId = data.id; } }
  }
  save(data.pub ? '게시되었습니다' : '저장되었습니다 (비공개)');
  $('editorModal').close();
  if ($('view-custom').classList.contains('on')) renderCustom(); else { activeCat = data.cat; showView('posts'); }
};
$('edDelete').addEventListener('click', function(){
  if (!edState || typeof edState.idx !== 'number') return;
  var p = DB.posts[edState.idx];
  if (!confirm('「' + plain(p.t) + '」 글을 삭제할까요?')) return;
  DB.posts.splice(edState.idx, 1); save('삭제되었습니다'); $('editorModal').close(); renderPosts();
});

/* =====================================================================
   맞춤 콘텐츠 (초안 → 검토 후 게시)
   ===================================================================== */
var customKw = '';
function renderCustom(){
  var f = $('customFilter').value;
  var rows = DB.custom.filter(function(p){ return p.t.indexOf(customKw) >= 0 && (f === 'all' || (f === 'done') === !!p.done); });
  $('customCount').textContent = rows.length;
  $('customBody').innerHTML = rows.map(function(p){
    return '<tr class="hover:bg-linesoft/40"><td class="tnum whitespace-nowrap px-4 py-4 text-mocha">' + esc(p.d) + '</td>'
      + '<td class="px-2 py-4"><span class="flex items-start gap-3.5">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" class="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy">' : '')
      + '<span class="min-w-0"><b class="break-keep leading-snug">' + esc(p.t) + '</b><span class="mt-1 block break-keep text-[12.5px] text-mocha">' + esc(p.s) + '</span></span></span></td>'
      + '<td class="whitespace-nowrap px-2 py-4">' + (p.done ? '<span class="pill-g">게시 완료</span>' : '<span class="pill-n">게시 전</span>') + '</td>'
      + '<td class="max-w-[190px] px-2 py-4 text-[12px] leading-relaxed text-mocha">' + esc(p.kw) + '</td>'
      + '<td class="whitespace-nowrap px-4 py-4 text-right">' + (p.done
          ? '<a class="btn" href="index.html#post-' + encodeURIComponent(p.postId || '') + '" target="_blank">게시글 보기</a>'
          : '<button type="button" class="btn-p" data-id="' + esc(p.id) + '">검토 후 게시</button>') + '</td></tr>';
  }).join('') || '<tr><td colspan="5" class="py-14 text-center text-faint">해당하는 글이 없어요.</td></tr>';
}
$('customSearch').addEventListener('input', function(e){ customKw = e.target.value.trim(); renderCustom(); });
$('customFilter').addEventListener('change', renderCustom);
$('customBody').addEventListener('click', function(e){
  var b = e.target.closest('button[data-id]'); if (!b) return;
  var p = DB.custom.filter(function(x){ return x.id === b.dataset.id; })[0]; if (!p) return;
  edState = { custom: p.id };
  fillEditor({ cat: 'about', t: p.t, sub: p.s, img: p.img, pub: true,
    body: '<p><b>' + esc(p.s) + '</b></p><p><b>안녕하세요,<br>' + esc(DB.info.name) + ' ' + esc(DB.info.ceo) + ' 원장입니다.</b></p>'
      + '<p>저는 처방에 앞서, 지금 드시는 약과 전반적인 몸 상태부터 살핍니다. 이 글에서는 이 증상이 왜 생기는지, 한의원에서는 어떤 약과 치료로 접근하는지, 그리고 실제 진료는 어떻게 진행되는지 차례로 말씀드리겠습니다.</p>'
      + '<h3>왜 생길까요?</h3><p>(검토 후 본문을 이어서 작성해 주세요.)</p><p>' + esc(p.kw) + '</p>' });
  $('edHead').textContent = '맞춤 콘텐츠 검토 · 게시'; $('edDelete').hidden = true;
  $('editorModal').showModal();
});

/* =====================================================================
   팝업
   ===================================================================== */
var popItems = [];
function renderPopup(){
  var P = DB.popup;
  segSet('popOn', P.on ? 1 : 0);
  $('popPc').checked = P.pc !== false; $('popTab').checked = P.tab !== false; $('popMo').checked = P.mo !== false;
  popItems = JSON.parse(JSON.stringify(P.items || []));
  drawPopItems();
}
function drawPopItems(){
  $('popItems').innerHTML = popItems.length ? popItems.map(function(it, i){
    return '<div class="flex flex-wrap items-center gap-4 px-5 py-4" data-i="' + i + '"><img src="' + esc(it.img) + '" alt="" class="h-24 w-20 rounded-lg bg-linesoft object-cover">'
      + '<div class="min-w-[220px] flex-1 space-y-2"><input data-f="t" value="' + esc(it.t || '') + '" placeholder="팝업 이름 (관리용)" class="h-9 w-full rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]">'
      + '<input data-f="link" value="' + esc(it.link || '') + '" placeholder="눌렀을 때 이동할 주소 (선택, 예: #contact 또는 https://...)" class="h-9 w-full rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]"></div>'
      + '<div class="flex gap-1"><button type="button" class="ico" data-a="up" aria-label="위로"><iconify-icon icon="solar:alt-arrow-up-linear" width="16"></iconify-icon></button><button type="button" class="ico" data-a="down" aria-label="아래로"><iconify-icon icon="solar:alt-arrow-down-linear" width="16"></iconify-icon></button>'
      + '<button type="button" class="ico" data-a="img" aria-label="사진 바꾸기"><iconify-icon icon="solar:gallery-edit-linear" width="16"></iconify-icon></button><button type="button" class="ico hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button></div></div>';
  }).join('') : '<div class="flex flex-col items-center justify-center py-14 text-center"><p class="text-[13.5px] font-bold">팝업이 없습니다.</p><p class="mt-1 text-[12.5px] text-mocha">「+ 팝업 추가」로 이미지를 올려 주세요.</p></div>';
}
function readPop(){ $('popItems').querySelectorAll('[data-i]').forEach(function(r){ var it = popItems[+r.dataset.i]; it.t = r.querySelector('[data-f=t]').value.trim(); it.link = r.querySelector('[data-f=link]').value.trim(); }); }
$('popItems').addEventListener('click', async function(e){
  var b = e.target.closest('[data-a]'); if (!b) return; readPop();
  var i = +b.closest('[data-i]').dataset.i, a = b.dataset.a;
  if (a === 'up') move(popItems, i, -1); if (a === 'down') move(popItems, i, 1);
  if (a === 'del') popItems.splice(i, 1);
  if (a === 'img'){ var u = (await pickImages(false))[0]; if (u) popItems[i].img = u; }
  drawPopItems();
});
window.addPopupItem = async function(){ readPop(); var us = await pickImages(true); us.forEach(function(u){ popItems.push({ img: u, t: '', link: '' }); }); drawPopItems(); };
window.savePopup = function(){
  readPop();
  var on = segGet('popOn') === '1';
  if (on && !popItems.length) return toast('활성화하려면 팝업 이미지를 하나 이상 올려 주세요', true);
  Object.assign(DB.popup, { on: on, pc: $('popPc').checked, tab: $('popTab').checked, mo: $('popMo').checked, items: popItems });
  save(on ? '저장되었습니다 — 홈페이지에 팝업이 떠요' : '저장되었습니다 (팝업 꺼짐)');
};

/* =====================================================================
   홈 화면 꾸미기
   ===================================================================== */
var vids = [];
function renderHome(){
  var H = DB.home;
  $('hEyebrow').value = H.heroEyebrow || ''; $('hTitle').value = H.heroTitle || ''; $('hSub').value = H.heroSub || '';
  $('hImg').src = H.heroImg || ''; $('hBadgeTop').value = H.heroBadgeTop || ''; $('hBadge').value = H.heroBadge || '';
  var st = (H.dietStats || []).concat([['', ''], ['', ''], ['', '']]).slice(0, 3);
  $('hStats').innerHTML = st.map(function(s, i){ return '<div class="rounded-xl border border-line p-2"><input data-s="' + i + '" data-k="0" value="' + esc(s[0]) + '" placeholder="12주" class="h-9 w-full rounded-lg bg-ivory/60 px-2 text-center font-bold"><input data-s="' + i + '" data-k="1" value="' + esc(s[1]) + '" placeholder="기본 프로그램" class="mt-1 h-9 w-full rounded-lg bg-ivory/60 px-2 text-center text-[12px]"></div>'; }).join('');
  $('hVideoTitle').value = H.videoTitle || '';
  vids = JSON.parse(JSON.stringify(H.videos || [])); drawVids();
  $('hTele').value = H.teleTitle || ''; $('hTeleImg').src = H.teleImg || ''; $('hReviewNote').value = H.reviewNote || '';
}
function drawVids(){
  $('hVideos').innerHTML = vids.map(function(v, i){
    return '<div class="flex items-start gap-3 rounded-xl border border-line p-3" data-i="' + i + '">' + (v.img ? '<img src="' + esc(v.img) + '" alt="" class="h-14 w-24 shrink-0 rounded-lg object-cover">' : '<span class="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-linesoft text-[10.5px] text-faint">자동 썸네일</span>')
      + '<div class="flex-1 space-y-1.5"><input data-f="t" value="' + esc(v.t) + '" placeholder="영상 제목" class="h-9 w-full rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]"><input data-f="url" value="' + esc(v.url) + '" placeholder="유튜브 주소 https://youtu.be/..." class="h-9 w-full rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]"></div>'
      + '<div class="flex flex-col"><button type="button" class="ico" data-a="img" title="썸네일 직접 올리기"><iconify-icon icon="solar:gallery-edit-linear" width="16"></iconify-icon></button>' + (v.img ? '<button type="button" class="ico" data-a="noimg" title="자동 썸네일 사용"><iconify-icon icon="solar:restart-linear" width="16"></iconify-icon></button>' : '') + '<button type="button" class="ico hover:text-bad" data-a="del" title="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button></div></div>';
  }).join('');
}
function readVids(){ $('hVideos').querySelectorAll('[data-i]').forEach(function(r){ var v = vids[+r.dataset.i]; v.t = r.querySelector('[data-f=t]').value.trim(); v.url = r.querySelector('[data-f=url]').value.trim(); }); }
$('hVideos').addEventListener('click', async function(e){
  var b = e.target.closest('[data-a]'); if (!b) return; readVids();
  var i = +b.closest('[data-i]').dataset.i;
  if (b.dataset.a === 'del') vids.splice(i, 1);
  if (b.dataset.a === 'noimg') vids[i].img = '';
  if (b.dataset.a === 'img'){ var u = (await pickImages(false))[0]; if (u) vids[i].img = u; }
  drawVids();
});
window.addVideo = function(){ readVids(); vids.push({ t: '', url: '', img: '' }); drawVids(); };
window.saveHome = function(){
  readVids();
  var H = DB.home;
  H.heroEyebrow = $('hEyebrow').value.trim(); H.heroTitle = $('hTitle').value.trim(); H.heroSub = $('hSub').value.trim();
  H.heroImg = srcOf('hImg'); H.heroBadgeTop = $('hBadgeTop').value.trim(); H.heroBadge = $('hBadge').value.trim();
  var st = [['', ''], ['', ''], ['', '']];
  $('hStats').querySelectorAll('input').forEach(function(x){ st[+x.dataset.s][+x.dataset.k] = x.value.trim(); });
  H.dietStats = st.filter(function(s){ return s[0] || s[1]; });
  H.videoTitle = $('hVideoTitle').value.trim();
  H.videos = vids.filter(function(v){ return v.t || v.url; });
  H.teleTitle = $('hTele').value.trim(); H.teleImg = srcOf('hTeleImg'); H.reviewNote = $('hReviewNote').value.trim();
  save(); renderHome();
};

/* =====================================================================
   의료진
   ===================================================================== */
var docs = [];
function renderDoctors(){ docs = JSON.parse(JSON.stringify(DB.doctors)); drawDocs(); }
function drawDocs(){
  $('docList').innerHTML = docs.map(function(d, i){
    return '<div class="card flex gap-4 p-5" data-i="' + i + '"><div class="w-28 shrink-0">' + (d.img ? '<img src="' + esc(d.img) + '" alt="" class="h-36 w-28 rounded-xl object-cover">' : '<span class="flex h-36 w-28 items-center justify-center rounded-xl bg-linesoft text-faint"><iconify-icon icon="solar:user-linear" width="28"></iconify-icon></span>')
      + '<button type="button" class="btn mt-2 w-full py-1.5" data-a="img">사진</button></div>'
      + '<div class="min-w-0 flex-1 space-y-2"><div class="flex gap-2"><input data-f="name" value="' + esc(d.name) + '" placeholder="이름" class="h-9 w-full rounded-lg border border-line bg-ivory/50 px-3 font-bold"><input data-f="role" value="' + esc(d.role) + '" placeholder="직함" class="h-9 w-24 rounded-lg border border-line bg-ivory/50 px-3"></div>'
      + '<textarea data-f="lines" rows="4" placeholder="약력 (한 줄에 하나)" class="w-full rounded-lg border border-line bg-ivory/50 p-3 text-[12.5px] leading-relaxed">' + esc((d.lines || []).join('\n')) + '</textarea>'
      + '<div class="flex justify-end gap-1"><button type="button" class="ico" data-a="up" aria-label="앞으로"><iconify-icon icon="solar:alt-arrow-left-linear" width="16"></iconify-icon></button><button type="button" class="ico" data-a="down" aria-label="뒤로"><iconify-icon icon="solar:alt-arrow-right-linear" width="16"></iconify-icon></button><button type="button" class="ico hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button></div></div></div>';
  }).join('') || '<p class="py-10 text-center text-faint md:col-span-2">등록된 의료진이 없어요. 없으면 홈페이지에서 이 영역이 숨겨져요.</p>';
}
function readDocs(){ $('docList').querySelectorAll('[data-i]').forEach(function(r){ var d = docs[+r.dataset.i]; d.name = r.querySelector('[data-f=name]').value.trim(); d.role = r.querySelector('[data-f=role]').value.trim(); d.lines = r.querySelector('[data-f=lines]').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }); }
$('docList').addEventListener('click', async function(e){
  var b = e.target.closest('[data-a]'); if (!b) return; readDocs();
  var i = +b.closest('[data-i]').dataset.i, a = b.dataset.a;
  if (a === 'up') move(docs, i, -1); if (a === 'down') move(docs, i, 1);
  if (a === 'del'){ if (!confirm('삭제할까요?')) return; docs.splice(i, 1); }
  if (a === 'img'){ var u = (await pickImages(false))[0]; if (u) docs[i].img = u; }
  drawDocs();
});
window.addDoctor = function(){ readDocs(); docs.push({ id: YO_STORE.uid('d'), name: '', role: '원장', lines: [], img: '' }); drawDocs(); };
window.saveDoctors = function(){ readDocs(); if (docs.some(function(d){ return !d.name; })) return toast('이름이 비어 있는 의료진이 있어요', true); DB.doctors = docs; save(); renderDoctors(); };

/* =====================================================================
   사진첩
   ===================================================================== */
var gal = [];
function renderGallery(){ gal = JSON.parse(JSON.stringify(DB.gallery)); drawGal(); }
function drawGal(){
  $('galList').innerHTML = gal.map(function(g, i){
    return '<div class="overflow-hidden rounded-2xl border border-line bg-panel" data-i="' + i + '"><img src="' + esc(g.img) + '" alt="" class="aspect-[4/5] w-full object-cover" loading="lazy">'
      + '<div class="p-2"><input data-f="alt" value="' + esc(g.alt) + '" placeholder="사진 설명 (예: 진료실)" class="h-8 w-full rounded-lg border border-line bg-ivory/50 px-2 text-[12px]">'
      + '<div class="mt-1 flex justify-between"><span><button type="button" class="ico h-7 w-7" data-a="up" aria-label="앞으로"><iconify-icon icon="solar:alt-arrow-left-linear" width="15"></iconify-icon></button><button type="button" class="ico h-7 w-7" data-a="down" aria-label="뒤로"><iconify-icon icon="solar:alt-arrow-right-linear" width="15"></iconify-icon></button></span><button type="button" class="ico h-7 w-7 hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="15"></iconify-icon></button></div></div></div>';
  }).join('') || '<p class="col-span-full py-10 text-center text-faint">사진이 없어요. 없으면 홈페이지에서 사진첩이 숨겨져요.</p>';
}
function readGal(){ $('galList').querySelectorAll('[data-i]').forEach(function(r){ gal[+r.dataset.i].alt = r.querySelector('[data-f=alt]').value.trim(); }); }
$('galList').addEventListener('click', function(e){
  var b = e.target.closest('[data-a]'); if (!b) return; readGal();
  var i = +b.closest('[data-i]').dataset.i, a = b.dataset.a;
  if (a === 'up') move(gal, i, -1); if (a === 'down') move(gal, i, 1); if (a === 'del') gal.splice(i, 1);
  drawGal();
});
window.addGallery = async function(){ readGal(); var us = await pickImages(true); us.forEach(function(u){ gal.push({ id: YO_STORE.uid('g'), img: u, alt: '' }); }); drawGal(); };
window.saveGallery = function(){ readGal(); DB.gallery = gal; save(); renderGallery(); };

/* =====================================================================
   빠른 상담 · 예약 (Supabase reservations)
   ===================================================================== */
var quickList = [], quickF = 'all';
function when(iso){ if (!iso) return ''; var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function stPill(s){ return s === '미확정' ? '<span class="pill-w">연락 대기</span>' : s === '확정' ? '<span class="pill-g">연락 완료</span>' : '<span class="pill-b">취소</span>'; }
var SRC = { consult: '홈페이지', admin: '직접 등록', reserve: '예약', hero: '홈페이지', consult_bar: '홈페이지', mobile_sheet: '홈페이지' };
function getQuick(){
  if (!SB) return Promise.resolve((KK.get('yo_consult_local') || []).slice().reverse());
  return SB.from('reservations').select('*').order('created_at', { ascending: false }).limit(500).then(function(r){
    if (r.error){ toast('상담 목록을 불러오지 못했어요: ' + r.error.message, true); return []; }
    return r.data || [];
  });
}
window.loadQuick = function(){
  $('quickWrap').innerHTML = '<p class="py-16 text-center text-faint">불러오는 중…</p>';
  getQuick().then(function(list){ quickList = list; drawQuick(); badgeQuick(list.filter(function(c){ return c.status === '미확정'; }).length); });
};
function drawQuick(){
  var rows = quickList.filter(function(c){ return quickF === 'all' || c.status === quickF; });
  document.querySelectorAll('#quickTabs .ftab').forEach(function(b){
    var n = b.dataset.f === 'all' ? quickList.length : quickList.filter(function(c){ return c.status === b.dataset.f; }).length;
    b.classList.toggle('on', b.dataset.f === quickF); b.dataset.n = n;
    b.innerHTML = b.textContent.replace(/\s*\d+$/, '') + ' <span class="tnum ml-1 text-[11px] text-faint">' + n + '</span>';
  });
  if (!rows.length){
    $('quickWrap').innerHTML = '<div class="flex flex-col items-center justify-center py-20 text-center"><span class="flex h-16 w-16 items-center justify-center rounded-full bg-linesoft text-faint"><iconify-icon icon="solar:phone-calling-linear" width="28"></iconify-icon></span>'
      + '<p class="mt-4 text-[14px] font-semibold text-mocha">접수된 상담 요청이 없습니다.</p><p class="mt-1 text-[12.5px] text-faint">홈페이지에서 상담 신청이 들어오면 이곳에 표시됩니다.</p></div>';
    return;
  }
  $('quickWrap').innerHTML = '<table class="w-full min-w-[820px] text-left text-[13px]"><thead><tr class="th"><th class="px-4 py-3">신청일시</th><th class="px-2 py-3">이름</th><th class="px-2 py-3">연락처</th><th class="px-2 py-3">문의 · 메모</th><th class="px-2 py-3">경로</th><th class="px-2 py-3">상태</th><th class="px-4 py-3 text-right">처리</th></tr></thead><tbody class="divide-y divide-linesoft">'
    + rows.map(function(c){
      return '<tr class="hover:bg-linesoft/40" data-id="' + esc(c.id) + '"><td class="tnum whitespace-nowrap px-4 py-3.5 text-mocha">' + when(c.created_at) + '</td>'
        + '<td class="px-2 py-3.5 font-semibold">' + esc(c.name) + '</td><td class="tnum whitespace-nowrap px-2 py-3.5"><a href="tel:' + esc(String(c.phone).replace(/[^0-9]/g, '')) + '" class="hover:text-rosewood-deep">' + esc(c.phone) + '</a></td>'
        + '<td class="max-w-[260px] px-2 py-3.5"><button type="button" data-a="memo" class="w-full text-left text-[12.5px] ' + (c.memo ? '' : 'text-faint') + ' hover:text-rosewood-deep">' + (c.memo ? esc(c.memo) : '+ 메모') + '</button></td>'
        + '<td class="whitespace-nowrap px-2 py-3.5 text-[12px] text-mocha">' + esc(SRC[c.source] || c.source || '') + '</td>'
        + '<td class="px-2 py-3.5">' + stPill(c.status) + '</td><td class="whitespace-nowrap px-4 py-3.5 text-right">'
        + (c.status !== '확정' ? '<button type="button" class="btn-p py-1.5" data-a="확정">연락 완료</button>' : '<button type="button" class="btn py-1.5" data-a="미확정">대기로</button>')
        + (c.status !== '취소' ? '<button type="button" class="btn ml-1 py-1.5" data-a="취소">취소</button>' : '')
        + '<button type="button" class="ico ml-1 hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button></td></tr>';
    }).join('') + '</tbody></table>';
}
$('quickTabs').addEventListener('click', function(e){ var b = e.target.closest('.ftab'); if (!b) return; quickF = b.dataset.f; drawQuick(); });
function quickUpdate(id, patch, del){
  if (!SB){
    var loc = KK.get('yo_consult_local') || [];
    loc = del ? loc.filter(function(x){ return x.id !== id; }) : loc.map(function(x){ return x.id === id ? Object.assign(x, patch) : x; });
    KK.set('yo_consult_local', loc); loadQuick(); return;
  }
  var q = SB.from('reservations');
  (del ? q.delete() : q.update(patch)).eq('id', id).select().then(function(r){
    if (r.error || !(r.data || []).length) toast('처리하지 못했어요. 권한 또는 로그인을 확인해 주세요.' + (r.error ? ' (' + r.error.message + ')' : ''), true);
    else toast(del ? '삭제되었습니다' : '변경되었습니다');
    loadQuick();
  });
}
var memoId = null;
$('quickWrap').addEventListener('click', function(e){
  var b = e.target.closest('[data-a]'); if (!b) return;
  var id = b.closest('tr').dataset.id, a = b.dataset.a, c = quickList.filter(function(x){ return String(x.id) === id; })[0];
  if (a === 'del'){ if (confirm((c ? c.name + ' 님의 ' : '') + '상담 기록을 삭제할까요?')) quickUpdate(id, null, true); return; }
  if (a === 'memo'){ memoId = id; $('memoWho').textContent = c ? c.name + ' · ' + c.phone : ''; $('memoText').value = c && c.memo || ''; $('memoModal').showModal(); return; }
  quickUpdate(id, { status: a });
});
$('memoSave').addEventListener('click', function(){ quickUpdate(memoId, { memo: $('memoText').value.trim().slice(0, 500) || null }); $('memoModal').close(); });
$('quickForm').addEventListener('submit', function(e){
  e.preventDefault();
  var f = e.target, row = { name: f.name.value.trim(), phone: f.phone.value.trim(), memo: f.memo.value.trim() || null, source: 'admin', sms_agree: false };
  if (row.phone.replace(/[^0-9]/g, '').length < 9) return toast('연락처를 확인해 주세요', true);
  var done = function(){ f.reset(); $('quickModal').close(); loadQuick(); toast('등록되었습니다'); };
  if (!SB){ var loc = KK.get('yo_consult_local') || []; row.id = 'local' + Date.now(); row.status = '미확정'; row.created_at = new Date().toISOString(); loc.push(row); KK.set('yo_consult_local', loc); return done(); }
  SB.from('reservations').insert(row).then(function(r){ if (r.error) toast('등록 실패: ' + r.error.message, true); else done(); });
});

/* =====================================================================
   상품
   ===================================================================== */
function renderProducts(){
  var P = DB.products;
  $('prodCount').textContent = P.length;
  $('prodBody').innerHTML = P.map(function(p, i){
    var img = (p.imgs || [])[0];
    return '<tr class="hover:bg-linesoft/40" data-i="' + i + '"><td class="whitespace-nowrap px-3 py-3"><button type="button" class="ico h-7 w-7" data-a="up" aria-label="위로"><iconify-icon icon="solar:alt-arrow-up-linear" width="15"></iconify-icon></button><button type="button" class="ico h-7 w-7" data-a="down" aria-label="아래로"><iconify-icon icon="solar:alt-arrow-down-linear" width="15"></iconify-icon></button></td>'
      + '<td class="px-2 py-3 text-mocha">' + esc(p.cat || '원내 상품') + '</td>'
      + '<td class="px-2 py-3"><button type="button" data-a="edit" class="flex items-center gap-3 text-left">' + (img ? '<img src="' + esc(img) + '" alt="" class="h-9 w-9 rounded-lg object-cover" loading="lazy">' : '<span class="h-9 w-9 rounded-lg bg-linesoft"></span>') + '<b class="hover:text-rosewood-deep">' + esc(p.n) + '</b></button></td>'
      + '<td class="px-2 py-3"><button type="button" class="toggle' + (p.on !== false ? ' on' : '') + '" data-a="on" role="switch" aria-checked="' + (p.on !== false) + '" aria-label="활성화"></button></td>'
      + '<td class="px-2 py-3"><button type="button" data-a="sold" class="' + (p.soldout ? 'pill-b">품절' : 'pill-g">재고 있음') + '</button></td>'
      + '<td class="tnum px-2 py-3 text-right">' + (p.price ? fmt(p.price) + '원' : '-') + '</td><td class="tnum px-2 py-3 text-right font-semibold">' + (p.sale ? fmt(p.sale) + '원' : '-') + '</td>'
      + '<td class="whitespace-nowrap px-4 py-3 text-right"><button type="button" class="ico" data-a="edit" aria-label="수정"><iconify-icon icon="solar:pen-linear" width="16"></iconify-icon></button>'
      + '<button type="button" class="ico hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button>'
      + '<button type="button" class="sig ml-1 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold hover:bg-linesoft" data-a="copy">복제</button>'
      + '<a class="ico" href="index.html#product-' + encodeURIComponent(p.id) + '" target="_blank" aria-label="홈페이지에서 보기"><iconify-icon icon="solar:square-top-up-linear" width="16"></iconify-icon></a></td></tr>';
  }).join('') || '<tr><td colspan="8" class="py-14 text-center text-faint">등록된 상품이 없어요.</td></tr>';
}
$('prodBody').addEventListener('click', function(e){
  var b = e.target.closest('[data-a]'); if (!b) return;
  var i = +b.closest('tr').dataset.i, P = DB.products, p = P[i], a = b.dataset.a;
  if (a === 'edit') return openProdEdit(i);
  if (a === 'up') move(P, i, -1); if (a === 'down') move(P, i, 1);
  if (a === 'on') p.on = p.on === false;
  if (a === 'sold') p.soldout = !p.soldout;
  if (a === 'del'){ if (!confirm('「' + p.n + '」 상품을 삭제할까요?')) return; P.splice(i, 1); }
  if (a === 'copy'){ var c = JSON.parse(JSON.stringify(p)); c.id = YO_STORE.uid('pr'); c.n = p.n + ' (복사본)'; c.on = false; P.splice(i + 1, 0, c); }
  save(a === 'copy' ? '복제했어요 (비활성 상태)' : null); renderProducts();
});
var curProd = null, peImgs = [];
function supplyText(n){ n = num(n); if (!n) return ''; var s = Math.round(n / 1.1); return '공급가 ' + fmt(s) + '원 / 부가세 ' + fmt(n - s) + '원'; }
function bindPrice(inp, out){ $(inp).addEventListener('input', function(){ var n = num(this.value); this.value = n ? fmt(n) : ''; $(out).textContent = segGet('peTax') === '면세' ? '' : supplyText(n); }); }
bindPrice('pePrice', 'peSupply1'); bindPrice('peSale', 'peSupply2');
$('peTax').addEventListener('click', function(){ $('pePrice').dispatchEvent(new Event('input')); $('peSale').dispatchEvent(new Event('input')); });
function drawPeImgs(){
  $('peImgs').innerHTML = peImgs.map(function(u, i){
    return '<div class="group relative aspect-square overflow-hidden rounded-xl border-2 ' + (i ? 'border-line' : 'border-rosewood-deep') + '" data-i="' + i + '"><img src="' + esc(u) + '" alt="" class="h-full w-full object-cover">'
      + (i ? '' : '<span class="absolute inset-x-0 bottom-0 bg-rosewood-deep py-0.5 text-center text-[9.5px] font-bold text-ivory">대표</span>')
      + '<span class="absolute right-1 top-1 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">' + (i ? '<button type="button" data-a="main" title="대표로" class="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-rosewood-deep"><iconify-icon icon="solar:star-linear" width="13"></iconify-icon></button>' : '')
      + '<button type="button" data-a="del" title="빼기" class="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-bad"><iconify-icon icon="solar:close-square-linear" width="13"></iconify-icon></button></span></div>';
  }).join('') + (peImgs.length < 10 ? '<button type="button" data-a="add" class="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-line text-faint hover:bg-linesoft"><iconify-icon icon="solar:add-square-linear" width="20"></iconify-icon><span class="tnum mt-0.5 text-[10.5px] font-semibold">' + peImgs.length + '/10</span></button>' : '');
}
$('peImgs').addEventListener('click', async function(e){
  var b = e.target.closest('[data-a]'); if (!b) return;
  if (b.dataset.a === 'add'){ var us = await pickImages(true); peImgs = peImgs.concat(us).slice(0, 10); }
  else { var i = +b.closest('[data-i]').dataset.i; if (b.dataset.a === 'del') peImgs.splice(i, 1); else { var u = peImgs.splice(i, 1)[0]; peImgs.unshift(u); } }
  drawPeImgs();
});
window.openProdEdit = openProdEdit;
function openProdEdit(i){
  curProd = i;
  var p = i === null ? { n: '', desc: '', imgs: [], price: 0, sale: 0, on: true, soldout: false, tax: '과세', body: '', btitle: '', cat: '원내 상품', info: {} } : DB.products[i];
  $('peHead').textContent = i === null ? '상품 추가' : '상품 수정';
  $('peName').value = p.n || ''; $('peDesc').value = p.desc || '';
  $('peCat').value = p.cat || '원내 상품';
  var cats = {}; DB.products.forEach(function(x){ if (x.cat) cats[x.cat] = 1; }); cats['원내 상품'] = 1;
  $('peCatList').innerHTML = Object.keys(cats).map(function(c){ return '<option value="' + esc(c) + '">'; }).join('');
  segSet('peOn', p.on !== false ? 1 : 0); segSet('peSold', p.soldout ? 1 : 0); segSet('peTax', p.tax || '과세');
  $('pePrice').value = p.price ? fmt(p.price) : ''; $('peSale').value = p.sale ? fmt(p.sale) : '';
  $('pePrice').dispatchEvent(new Event('input')); $('peSale').dispatchEvent(new Event('input'));
  $('peCTitle').value = p.btitle || ''; $('peBody').innerHTML = clean(p.body);
  var I = p.info || {}; $('peIng').value = I.ing || ''; $('peVol').value = I.vol || ''; $('peEff').value = I.eff || ''; $('peExp').value = I.exp || ''; $('peEtc').value = I.etc || '';
  peImgs = (p.imgs || []).slice(); drawPeImgs();
  showView('prodedit', i === null ? '상품 추가' : '상품 수정');
}
window.newProduct = function(){ openProdEdit(null); };
window.saveProdEdit = function(){
  var n = $('peName').value.trim();
  if (!n) return toast('상품명을 입력해 주세요', true);
  if (!$('peDesc').value.trim()) return toast('짧은 설명을 입력해 주세요', true);
  var price = num($('pePrice').value), sale = num($('peSale').value) || price;
  var data = { n: n, desc: $('peDesc').value.trim(), cat: $('peCat').value.trim() || '원내 상품', imgs: peImgs, price: price, sale: sale,
    on: segGet('peOn') === '1', soldout: segGet('peSold') === '1', tax: segGet('peTax'), btitle: $('peCTitle').value.trim(), body: stripBody($('peBody').innerHTML),
    info: { ing: $('peIng').value.trim(), vol: $('peVol').value.trim(), eff: $('peEff').value.trim(), exp: $('peExp').value.trim(), etc: $('peEtc').value.trim() } };
  if (curProd === null){ data.id = YO_STORE.uid('pr'); DB.products.push(data); }
  else Object.assign(DB.products[curProd], data);
  save('저장되었습니다 — 홈페이지 한방 상품에 반영돼요');
  showView('products');
};

/* =====================================================================
   배송·환불
   ===================================================================== */
function renderShipping(){ var S = DB.shipping; $('shShip').value = S.ship || ''; $('shCancel').value = S.cancel || ''; $('shRefund').value = S.refund || ''; }
window.saveShipping = function(){ DB.shipping = { ship: $('shShip').value.trim(), cancel: $('shCancel').value.trim(), refund: $('shRefund').value.trim() }; save(); };

/* =====================================================================
   방문 통계
   ===================================================================== */
var statDays = 30;
$('statDays').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; statDays = +b.dataset.v; loadStats(); });
function ymd(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function loadStats(){
  segSet('statDays', statDays);
  var end = new Date(), start = new Date(); start.setDate(end.getDate() - statDays + 1);
  $('statRange').textContent = ymd(start).replace(/-/g, '.') + ' ~ ' + ymd(end).replace(/-/g, '.');
  if (!SB){ $('chart').innerHTML = '<p class="m-auto text-[13px] text-faint">DB 연결 후 방문 기록이 쌓입니다.</p>'; $('chartLabels').innerHTML = ''; $('topPosts').innerHTML = ''; return; }
  SB.rpc('visit_stats', { days: statDays }).then(function(r){
    var by = {}; (r.data || []).forEach(function(x){ by[x.day] = x; });
    var days = []; for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { var k = ymd(d); days.push([k, (by[k] || {}).views || 0, (by[k] || {}).uniques || 0]); }
    var max = Math.max.apply(null, days.map(function(x){ return x[1]; }).concat([1]));
    var sum = 0, uni = 0, best = days[0]; days.forEach(function(x){ sum += x[1]; uni += x[2]; if (x[1] > best[1]) best = x; });
    $('stSum').textContent = fmt(sum) + '회'; $('stUni').textContent = fmt(uni) + '명'; $('stAvg').textContent = (sum / days.length).toFixed(1) + '회';
    $('stMax').textContent = best[1] ? best[0].slice(5).replace('-', '/') + ' · ' + best[1] + '회' : '-';
    $('chart').innerHTML = days.map(function(x){
      return '<div class="group relative flex h-full flex-1 items-end justify-center gap-[1px]"><span class="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-lg bg-espresso px-2 py-1 text-[10.5px] font-semibold text-ivory group-hover:block">' + x[0].slice(5) + ' · ' + x[1] + '회 · ' + x[2] + '명</span>'
        + '<div class="bar w-1/2 max-w-[16px] rounded-t bg-rosewood/85" style="height:' + (x[1] / max * 100) + '%"></div><div class="bar w-1/2 max-w-[16px] rounded-t bg-champagne/80" style="height:' + (x[2] / max * 100) + '%"></div></div>';
    }).join('');
    var step = Math.ceil(days.length / 10);
    $('chartLabels').innerHTML = days.map(function(x, i){ return '<span class="flex-1">' + (i % step === 0 ? x[0].slice(5).replace('-', '/') : '') + '</span>'; }).join('');
  });
  SB.rpc('post_views').then(function(r){
    var rows = (r.data || []).map(function(x){ var id = x.path.slice(5), p = DB.posts.filter(function(q){ return q.id === id; })[0]; return { p: p, v: x.views }; }).filter(function(x){ return x.p; }).sort(function(a, b){ return b.v - a.v; }).slice(0, 10);
    $('topPosts').innerHTML = rows.map(function(x, i){ return '<li class="flex items-center justify-between gap-3 py-2.5"><span><b class="tnum mr-2 text-faint">' + (i + 1) + '</b>' + esc(plain(x.p.t)) + ' <span class="text-[12px] text-faint">' + esc(BNAME[x.p.cat] || '') + '</span></span><span class="tnum font-semibold">' + x.v + '회</span></li>'; }).join('') || '<li class="py-6 text-center text-faint">아직 조회 기록이 없어요.</li>';
  });
}

/* =====================================================================
   직원 계정 (admin_members) — 최고관리자만 변경
   ===================================================================== */
var ROLE = { owner: '최고관리자', manager: '관리자', staff: '직원' };
window.loadStaff = function(){
  var w = $('staffWrap');
  if (!SB){ w.innerHTML = '<p class="px-6 py-14 text-center text-[13px] text-faint">DB 연결 후 사용할 수 있어요.</p>'; return; }
  w.innerHTML = '<p class="py-14 text-center text-faint">불러오는 중…</p>';
  SB.from('admin_members').select('*').order('requested_at', { ascending: true }).then(function(r){
    if (r.error){ w.innerHTML = '<p class="py-14 text-center text-bad">' + esc(r.error.message) + '</p>'; return; }
    var list = (r.data || []).sort(function(a, b){ return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1); });
    var pend = list.filter(function(m){ return m.status === 'pending'; }).length;
    $('sideStaff').hidden = !pend; $('sideStaff').textContent = pend;
    var owner = ME && ME.role === 'owner';
    w.innerHTML = '<table class="w-full min-w-[760px] text-left text-[13px]"><thead><tr class="th"><th class="px-4 py-3">이름</th><th class="px-2 py-3">이메일</th><th class="px-2 py-3">신청일</th><th class="px-2 py-3">상태</th><th class="px-2 py-3">등급</th><th class="px-4 py-3 text-right">관리</th></tr></thead><tbody class="divide-y divide-linesoft">'
      + list.map(function(m){
        var self = ME && m.email === ME.email;
        return '<tr data-e="' + esc(m.email) + '"><td class="px-4 py-3.5 font-semibold">' + esc(m.name || '-') + (self ? ' <span class="pill-n">나</span>' : '') + '</td><td class="px-2 py-3.5">' + esc(m.email) + '</td>'
          + '<td class="tnum px-2 py-3.5 text-mocha">' + esc(String(m.requested_at || '').slice(0, 10)) + '</td>'
          + '<td class="px-2 py-3.5">' + (m.status === 'approved' ? '<span class="pill-g">승인</span>' : m.status === 'pending' ? '<span class="pill-w">승인 대기</span>' : '<span class="pill-b">거절</span>') + '</td>'
          + '<td class="px-2 py-3.5">' + (owner && !self ? '<select data-a="role" class="rounded-lg border border-line bg-ivory/50 px-2 py-1.5 text-[12.5px] font-semibold">' + ['staff', 'manager', 'owner'].map(function(k){ return '<option value="' + k + '"' + (m.role === k ? ' selected' : '') + '>' + ROLE[k] + '</option>'; }).join('') + '</select>' : esc(ROLE[m.role] || m.role)) + '</td>'
          + '<td class="whitespace-nowrap px-4 py-3.5 text-right">' + (owner && !self ? (m.status !== 'approved' ? '<button type="button" class="btn-p py-1.5" data-a="approve">승인</button>' : '')
            + (m.status !== 'rejected' ? '<button type="button" class="btn ml-1 py-1.5" data-a="reject">' + (m.status === 'approved' ? '권한 정지' : '거절') + '</button>' : '')
            + '<button type="button" class="ico ml-1 hover:text-bad" data-a="del" aria-label="삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon></button>' : '<span class="text-[12px] text-faint">' + (owner ? '' : '최고관리자만 변경') + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table>';
  });
};
function staffDo(email, patch, del){
  var q = SB.from('admin_members');
  (del ? q.delete() : q.update(patch)).eq('email', email).select().then(function(r){
    if (r.error || !(r.data || []).length) toast('변경하지 못했어요' + (r.error ? ': ' + r.error.message : ' (권한 확인)'), true);
    else toast('변경되었습니다');
    loadStaff();
  });
}
$('staffWrap').addEventListener('click', function(e){
  var b = e.target.closest('button[data-a]'); if (!b) return;
  var em = b.closest('tr').dataset.e, a = b.dataset.a, by = ME ? ME.email : '';
  if (a === 'approve') staffDo(em, { status: 'approved', decided_at: new Date().toISOString(), decided_by: by });
  if (a === 'reject'){ if (confirm(em + ' 계정의 관리자 권한을 막을까요?')) staffDo(em, { status: 'rejected', decided_at: new Date().toISOString(), decided_by: by }); }
  if (a === 'del'){ if (confirm(em + ' 를 명단에서 삭제할까요? (로그인 계정 자체는 Supabase에 남아요)')) staffDo(em, null, true); }
});
$('staffWrap').addEventListener('change', function(e){
  if (e.target.dataset.a !== 'role') return;
  var em = e.target.closest('tr').dataset.e;
  if (e.target.value === 'owner' && !confirm(em + ' 를 최고관리자로 바꿀까요? (직원 승인 권한이 생겨요)')) return loadStaff();
  staffDo(em, { role: e.target.value });
});

/* =====================================================================
   설정 (의원 정보)
   ===================================================================== */
function renderSettings(){
  var I = DB.info;
  $('sName').value = I.name || ''; $('sCeo').value = I.ceo || ''; $('sAddr').value = I.addr || ''; $('sPhone').value = I.phone || ''; $('sBiz').value = I.bizno || '';
  $('sNear').value = I.near || ''; $('sHoursShort').value = I.hoursShort || ''; $('sNote').value = I.note || ''; $('sClosed').value = I.closed || '';
  $('sNaver').value = I.naver || ''; $('sKakao').value = I.kakao || ''; $('sMap').value = I.map || ''; $('sMapImg').src = I.mapImg || '';
  $('sFees').value = I.fees || ''; $('sTerms').value = I.terms || ''; $('sPrivacy').value = I.privacy || '';
  hours = JSON.parse(JSON.stringify(I.hours || [])); drawHours();
}
var hours = [];
function drawHours(){
  $('sHours').innerHTML = hours.map(function(h, i){
    return '<div class="flex flex-wrap items-center gap-2" data-i="' + i + '"><input data-f="d" value="' + esc(h.d) + '" placeholder="요일 (예: 토요일)" class="h-9 w-36 rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px] font-semibold">'
      + '<input data-f="t" value="' + esc(h.t) + '" placeholder="09:00 ~ 18:00 또는 휴무" class="h-9 w-40 rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]">'
      + '<input data-f="sub" value="' + esc(h.sub) + '" placeholder="보조 문구 (예: 점심시간)" class="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ivory/50 px-3 text-[12.5px]">'
      + '<button type="button" class="ico hover:text-bad" data-a="del" aria-label="줄 삭제"><iconify-icon icon="solar:trash-bin-trash-linear" width="15"></iconify-icon></button></div>';
  }).join('');
}
function readHours(){ $('sHours').querySelectorAll('[data-i]').forEach(function(r){ var h = hours[+r.dataset.i]; ['d', 't', 'sub'].forEach(function(k){ h[k] = r.querySelector('[data-f=' + k + ']').value.trim(); }); }); }
$('sHours').addEventListener('click', function(e){ var b = e.target.closest('[data-a=del]'); if (!b) return; readHours(); hours.splice(+b.closest('[data-i]').dataset.i, 1); drawHours(); });
window.addHour = function(){ readHours(); hours.push({ d: '', t: '', sub: '' }); drawHours(); };
window.saveSettings = function(){
  readHours();
  var I = DB.info, url = function(v){ v = v.trim(); return v && !/^https?:\/\//.test(v) ? 'https://' + v : v; };
  Object.assign(I, { name: $('sName').value.trim(), ceo: $('sCeo').value.trim(), addr: $('sAddr').value.trim(), phone: $('sPhone').value.trim(), bizno: $('sBiz').value.trim(),
    near: $('sNear').value.trim(), hoursShort: $('sHoursShort').value.trim(), note: $('sNote').value.trim(), closed: $('sClosed').value.trim(),
    naver: url($('sNaver').value), kakao: url($('sKakao').value), map: url($('sMap').value), mapImg: srcOf('sMapImg'),
    fees: $('sFees').value.trim(), terms: $('sTerms').value.trim(), privacy: $('sPrivacy').value.trim(),
    hours: hours.filter(function(h){ return h.d || h.t; }) });
  if (!I.name || !I.phone) return toast('상호명과 전화번호는 꼭 넣어 주세요', true);
  save(); renderSettings();
};

/* =====================================================================
   로그인 · 권한
   ===================================================================== */
function canEdit(){ return !!ME && (ME.role === 'owner' || ME.role === 'manager'); }
function pane(id, msg){ document.querySelectorAll('[data-pane]').forEach(function(p){ p.hidden = p.id !== id; }); $('authMsg').textContent = msg || ''; $('authMsg').className = 'mt-4 min-h-[1.2em] break-keep text-[12.5px] font-semibold ' + (msg && /보냈|완료|신청되었|변경되었/.test(msg) ? 'text-good' : 'text-bad'); $('auth').hidden = false; }
document.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click', function(){ pane(b.dataset.go); }); });
var AUTHERR = { 'Invalid login credentials': '이메일 또는 비밀번호가 맞지 않아요.', 'Email not confirmed': '이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 눌러 주세요.' };
function busy(form, on){ var b = form.querySelector('button:not([type=button])'); if (b){ b.disabled = on; b.style.opacity = on ? '.6' : ''; } }
$('fLogin').addEventListener('submit', async function(e){
  e.preventDefault(); busy(this, true);
  var r = await SB.auth.signInWithPassword({ email: this.email.value.trim().toLowerCase(), password: this.pw.value });
  busy(this, false);
  if (r.error) return pane('fLogin', AUTHERR[r.error.message] || r.error.message);
  checkMember();
});
$('fApply').addEventListener('submit', async function(e){
  e.preventDefault();
  var f = this, email = f.email.value.trim().toLowerCase(), name = f.name.value.trim();
  if (f.pw.value.length < 8) return pane('fApply', '비밀번호는 8자 이상으로 정해 주세요.');
  busy(f, true);
  var r = await SB.auth.signUp({ email: email, password: f.pw.value, options: { data: { name: name }, emailRedirectTo: location.origin + location.pathname } });
  if (r.error){ busy(f, false); return pane('fApply', r.error.message); }
  var q = await SB.from('admin_members').insert({ email: email, name: name, role: 'staff', status: 'pending' });
  busy(f, false);
  if (q.error && !/duplicate/i.test(q.error.message)) return pane('fApply', '신청 저장 실패: ' + q.error.message);
  f.reset();
  pane('fLogin', '신청되었습니다. 메일함의 인증 링크를 누른 뒤, 원장님 승인이 나면 로그인할 수 있어요.');
});
$('fReset').addEventListener('submit', async function(e){
  e.preventDefault(); busy(this, true);
  var r = await SB.auth.resetPasswordForEmail(this.email.value.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
  busy(this, false);
  pane('fReset', r.error ? r.error.message : '재설정 메일을 보냈어요. 메일의 링크를 누르면 새 비밀번호를 정할 수 있어요.');
});
$('fNewPw').addEventListener('submit', async function(e){
  e.preventDefault();
  if (this.pw.value.length < 8) return pane('fNewPw', '8자 이상으로 정해 주세요.');
  var r = await SB.auth.updateUser({ password: this.pw.value });
  if (r.error) return pane('fNewPw', r.error.message);
  history.replaceState(null, '', location.pathname);
  pane('fLogin', '비밀번호가 변경되었습니다.'); checkMember();
});
window.logout = async function(){ if (SB) await SB.auth.signOut(); location.reload(); };

async function checkMember(){
  var s = (await SB.auth.getSession()).data.session;
  if (!s) return pane('fLogin');
  var r = await SB.rpc('my_admin_status');
  var m = (r.data || [])[0];
  if (!m){
    pane('pWait'); $('waitTitle').textContent = '관리자 신청 기록이 없어요';
    $('waitMsg').textContent = s.user.email + ' 계정은 관리자 명단에 없어요. 로그아웃 후 「관리자 신청」을 해 주세요.'; return;
  }
  if (m.status !== 'approved'){
    pane('pWait'); $('waitTitle').textContent = m.status === 'pending' ? '승인 대기 중' : '사용이 제한된 계정';
    $('waitMsg').textContent = m.status === 'pending' ? '원장님(최고관리자)이 승인하면 이용할 수 있어요. 승인 후 「다시 확인」을 눌러 주세요.' : '관리자 권한이 정지되었어요. 원장님께 문의해 주세요.'; return;
  }
  ME = { email: m.email, name: m.name || m.email, role: m.role };
  enter();
}
function enter(){
  $('auth').hidden = true;
  $('meName').textContent = ME.name + ' (' + (ROLE[ME.role] || '') + ')';
  $('meBadge').textContent = (ME.name || '연오').slice(0, 2);
  var edit = canEdit();
  document.querySelectorAll('[data-role=edit]').forEach(function(el){ el.hidden = !edit; });
  showView(edit ? 'dash' : 'quick');
  if (SB && ME.role === 'owner') SB.from('admin_members').select('email').eq('status', 'pending').then(function(r){ var n = (r.data || []).length; $('sideStaff').hidden = !n; $('sideStaff').textContent = n; });
  if (!edit) renderDash();
}

/* 시작 */
if (!SB){
  ME = { email: 'preview', name: '미리보기', role: 'owner' };
  $('previewBar').hidden = false; $('btnLogout').hidden = true;
  enter();
} else {
  SB.auth.onAuthStateChange(function(evt){ if (evt === 'PASSWORD_RECOVERY') pane('fNewPw'); });
  if (/type=recovery/.test(location.hash)) pane('fNewPw');
  else checkMember();
}
})();
