/* =========================================================================
   연오재 · 홈페이지 데이터 저장소 (YO_STORE)
   - 관리자 화면에서 고친 내용이 여기(브라우저 저장소)에 저장되고,
     yeonohjae-supabase.js 가 KK.set 을 감싸 Supabase(site_kv)에도 저장합니다.
   - 아직 저장된 값이 없는 항목은 아래 기본값(시안 내용)이 표시됩니다.
   - 순서: site-config.js → yeonohjae_store.js → yeonohjae-supabase.js
   ========================================================================= */
(function(){
  var NS = 'kkeut:';
  var PIC = function(seed, w, h){ return 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h; };

  /* ---------- 공통 저장 함수 (Supabase 연동 파일이 set 을 감쌉니다) ---------- */
  if (!window.KK){
    window.KK = {
      get: function(k){ try { var v = localStorage.getItem(NS + k); return v == null ? null : JSON.parse(v); } catch(e){ return null; } },
      set: function(k, v){ try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch(e){ alert('저장 공간이 부족합니다. 사진 크기를 줄여 주세요.'); return false; } }
    };
  }

  var DEF = {};

  DEF.info = {
    name: '연오재한의원',
    ceo: '김경민',
    addr: '경기 고양시 덕양구 화중로 60 (화정빌딩) 205, 206호 연오재한의원',
    phone: '010-4313-4735',
    bizno: '779-09-03367',
    near: '화정역 도보 3분',
    hoursShort: '평일 09:00–18:00 · 토 09:00–13:00',
    note: '점심시간 12:30~14:00, 주말/공휴일은 점심시간 없이 15:00까지 접수합니다.',
    closed: '없음',
    hours: [
      { d: '월요일 – 금요일', t: '09:00 ~ 18:00', sub: '12:00 ~ 13:00 점심시간' },
      { d: '토요일', t: '09:00 ~ 13:00', sub: '' },
      { d: '일요일', t: '휴무', sub: '' }
    ],
    naver: '',
    kakao: '',
    map: 'https://map.naver.com',
    mapImg: PIC('yeonohjae-map', 980, 760)
  };

  DEF.home = {
    heroEyebrow: 'Yeonohjae Oriental Clinic · Hwajeong',
    heroTitle: '천편일률적인\n약이 아닙니다\n*단 한 첩*의 약도\n맞춤형으로 다립니다',
    heroSub: '체질과 증상을 먼저 살피고, 그날의 몸에 맞는 처방을 짓습니다.\n혼자 가는 길이 아닌, 한의사가 함께합니다.',
    heroImg: PIC('yeonohjae-tea-hero', 900, 1080),
    heroBadgeTop: 'Since — 진심으로 짓는 처방',
    heroBadge: '우리는 단순히 처방만 하지 않습니다\n환자와 관계를 만듭니다',
    dietStats: [['12주', '기본 프로그램'], ['1:1', '주치의 관리'], ['맞춤', '체질별 처방']],
    videoTitle: '린다이어트 유튜브',
    videos: [
      { t: '건강한 다이어트, 일반 제품과 무엇이 다른가요', url: '', img: PIC('yeonohjae-yt1', 980, 552) },
      { t: '린다이어트 12주 도전기 — 감량 그 이후의 이야기', url: '', img: PIC('yeonohjae-yt2', 980, 552) }
    ],
    teleTitle: '미루면 더 큰 병이 됩니다\n단 5분, 비대면으로 상담받아 보세요',
    teleImg: PIC('yeonohjae-tele', 1600, 520),
    reviewNote: '* 실제 내원 환자의 동의를 받은 후기이며, 치료 효과는 개인에 따라 다를 수 있습니다.'
  };

  DEF.menus = [
    { id: 'm-home',   name: '홈',               target: '#home',       fixed: true, on: true },
    { id: 'm-event',  name: '진행 중인 이벤트', target: '#events',     board: 'event',  on: true },
    { id: 'm-prod',   name: '원내 상품',         target: '#products',   on: true },
    { id: 'm-res',    name: '진료 예약',         target: '#contact',    on: true },
    { id: 'm-review', name: '진료 후기',         target: '#reviews',    board: 'review', on: true },
    { id: 'm-diet',   name: '다이어트 치료',     target: '#diet',       board: 'diet',   on: true },
    { id: 'm-focus',  name: '집중 진료',         target: '#focus',      board: 'focus',  on: true },
    { id: 'm-treat',  name: '한방 치료',         target: '#treatments', board: 'treat',  on: true },
    { id: 'm-about',  name: '한의원 소개',       target: '#about',      board: 'about',  on: true },
    { id: 'm-notice', name: '공지사항',          target: '#notice',     board: 'notice', on: true }
  ];

  function P(id, cat, t, sub, img, extra){
    var p = { id: id, cat: cat, t: t, sub: sub, body: '<p>' + sub + '</p>', img: img || '', d: '2026.03.16', pub: true, pin: false };
    for (var k in (extra || {})) p[k] = extra[k];
    return p;
  }
  DEF.posts = [
    P('p-ev1', 'event', '환절기 필수 상비약 콜드퀵\n출시 기념 *2+1* 이벤트', '졸음 걱정 없는 천연 감기약 한 포, 지금 원내에서 만나보세요.', PIC('yeonohjae-coldquick', 1100, 640), { tag: 'Launch Event' }),
    P('p-rv1', 'review', '하윤서 님 · 맞춤 한약', '상담이 정말 꼼꼼했어요. 증상만 듣고 약을 주는 게 아니라 생활 습관까지 물어보시고, 복약 중에도 연락으로 상태를 챙겨주셨습니다.'),
    P('p-rv2', 'review', '박도현 님 · 침 / 추나', '만성 어깨 통증으로 방문했는데 침과 추나를 병행하고 3주 만에 확실히 편해졌어요. 치료 과정 설명이 자세해서 믿음이 갔습니다.'),
    P('p-rv3', 'review', '이서진 님 · 린다이어트', '다이어트 프로그램 12주 마쳤습니다. 굶는 방식이 아니라서 힘들지 않았고, 무엇보다 끝나고도 유지가 되는 게 가장 만족스러워요.'),
    P('p-dt1', 'diet', '다이어트는\n*건강해야* 합니다', '검증된 효과, 건강한 감량을 함께하세요. 무리한 절식이 아닌 체질 분석에 기반한 한약 처방과 식단·생활 관리로, 요요 없는 변화를 만듭니다. 함께 가야 멀리 갈 수 있습니다 — 혼자 가는 길이 아닌 한의사가 함께합니다.', PIC('yeonohjae-lean', 980, 760), { tag: 'Lean Diet Program' }),
    P('p-fc1', 'focus', '러시아 직수입 *수壽* 녹용을\n사용하고 있습니다', '러시아의 혹독한 자연이 키운 강인한 생명력, 최상급 수壽(빼어날 수) 녹용입니다. 일반적인 녹용과는 다릅니다. 엄격한 기준을 통과하여 검증된 원료만을 처방에 사용합니다.', PIC('yeonohjae-antler', 980, 760), { points: ['원산지 직수입 · 유통 이력 관리', '부위·등급 선별 후 처방', '체질에 맞춘 경옥고 · 공진단 조제'] }),
    P('p-tr1', 'treat', '한약', '개인별 맞춤 처방으로 몸의 균형을 되찾고, 부족한 기운을 채워 근본적인 회복을 돕습니다. 탕전실에서 당일 정성껏 달여 드립니다.', PIC('yeonohjae-herbal', 1100, 700), { tag: 'Signature' }),
    P('p-tr2', 'treat', '침 / 약침', '막힌 경락을 풀어 빠르게 통증을 잡고, 순수 한약 성분으로 염증 제거와 재생을 돕습니다.', PIC('yeonohjae-acupuncture', 520, 620)),
    P('p-tr3', 'treat', '뜸 / 부항', '따뜻한 기운으로 기혈 순환을 촉진하고, 체내 독소와 노폐물을 배출해 근육을 풀어줍니다.'),
    P('p-tr4', 'treat', '추나', '한의사가 직접 틀어진 뼈와 관절을 바로잡아 신체 불균형을 해소하고 통증의 원인을 치료합니다.'),
    P('p-ab1', 'about', '천편일률적인 약이 아닙니다\n단 한 첩의 약도 맞춤형으로 다립니다', '같은 증상이라도 사람마다 원인이 다릅니다. 진맥과 상담으로 몸의 상태를 먼저 읽고, 그에 맞는 약재와 용량으로 처방을 짓습니다.', PIC('yeonohjae-teapot', 1000, 620)),
    P('p-ab2', 'about', '우리는 단순히 처방만 하지 않습니다\n환자와 관계를 만듭니다', '치료는 진료실에서 끝나지 않습니다. 복약 중의 변화를 함께 살피고, 생활 습관까지 챙기며 회복의 과정을 끝까지 동행합니다.', PIC('yeonohjae-book', 1000, 620)),
    P('p-nt1', 'notice', '원활한 진료를 위한 예약 취소 및 변경 안내', '예약 취소·변경은 진료 전날까지 전화로 알려 주세요.'),
    P('p-nt2', 'notice', '진단서, 진료확인서 등 발급 절차 및 비용 안내', '서류 발급은 접수처에서 신청하실 수 있습니다.'),
    P('p-nt3', 'notice', '맞춤 한약 보관 방법 및 복용 시 주의사항', '한약은 서늘한 곳이나 냉장 보관해 주세요.')
  ];

  function C(id, t, s, kw, seed){ return { id: id, d: '26.07.23', t: t, s: s, kw: kw, img: PIC('adm-' + seed, 600, 400), done: false }; }
  DEF.custom = [
    C('c1', '귀에서 계속 삐 소리가 난다면 | 일산 화정 이명 연오재한의원', '조용한 방에만 들어가면, 귀에서 소리가 들리시나요?', '#이명난청 #어지럼증 #이명 #난청 #일산 이명 #일산 난청', 'c-ear'),
    C('c2', '쉬어도 회복이 안 될 때, 공진단 | 원장이 직접 조제하는 화정 연오재한의원', '몸이 버티는 걸 넘어서서, 이제는 버겁다고 느껴지시나요?', '#공진단 #수 공진단 #공진단 효능 #공진단 가격', 'c-gong'),
    C('c3', '감기에 자주 걸리는 분께, 경옥고 | 화정 연오재한의원', '요즘 들어 부쩍 피로하신가요?', '#경옥고 효능 #경옥고 가격 #일산 경옥고 #경옥고 선물', 'c-kyung'),
    C('c4', '소아 성장클리닉, 검사부터 한약까지 | 화정 소아 성장 연오재한의원', '우리 아이 키 고민, 어떻게 하면 좋을까요?', '#소아성장 #일산 소아성장 #화정 소아성장 #성장치료', 'c-kid'),
    C('c5', '몸이 편한 속도로 빼는 다이어트, 연오재 | 고양시 다이어트 한의원', '평생의 숙제, 다이어트 무리하지 않아야 오래갑니다.', '#다이어트한약 #한방다이어트 #다이어트한약 부작용', 'c-diet'),
    C('c6', '사고 며칠 뒤에 시작되는 통증 | 화정 교통사고 연오재 한의원', '사고 당일에는 괜찮았는데, 왜 며칠이 지나서야 아픈걸까요?', '#교통사고 한의원 #교통사고 후유증 #자동차보험 한방치료', 'c-acc'),
    C('c7', '뒷목부터 어깨까지 뭉치는 통증 | 화정 추나 연오재한의원', '모니터 앞에만 앉으면 어깨가 돌처럼 굳으시나요?', '#일자목 #거북목 #추나요법 #어깨통증 한의원', 'c-neck'),
    C('c8', '먹으면 더부룩하고 소화가 안 될 때 | 화정 소화불량 연오재한의원', '속이 편한 날이 손에 꼽히시나요?', '#소화불량 #위장장애 #담적 #일산 소화불량 한의원', 'c-digest'),
    C('c9', '밤에 자꾸 깨는 분들께 | 화정 불면 연오재한의원', '누우면 오히려 정신이 말똥해지시나요?', '#불면증 #수면장애 #불면 한약 #일산 불면증', 'c-sleep'),
    C('c10', '수험생 집중력이 걱정될 때, 총명탕 | 화정 연오재한의원', '책상 앞에 오래 앉아도 머리가 무겁다면?', '#총명탕 #수험생 보약 #집중력 #기억력 한약', 'c-study'),
    C('c11', '출산 후 몸조리, 산후보약 | 화정 산후조리 연오재한의원', '출산 후 회복, 시기를 놓치면 오래갑니다.', '#산후보약 #산후조리 #산후풍 #일산 산후보약', 'c-postp'),
    C('c12', '환절기마다 반복되는 비염 | 화정 비염 연오재한의원', '아침마다 재채기로 하루를 시작하시나요?', '#비염 #알레르기비염 #코막힘 #비염 한약', 'c-nose'),
    C('c13', '갱년기, 몸의 변화를 다스리는 법 | 화정 연오재한의원', '이유 없이 열이 오르고 잠이 얕아지셨나요?', '#갱년기 #갱년기 한약 #안면홍조 #일산 갱년기', 'c-meno'),
    C('c14', '반복되는 두통, 원인부터 살핍니다 | 화정 두통 연오재한의원', '진통제로 버티는 하루, 이제 원인을 봐야 할 때입니다.', '#두통 #편두통 #긴장성두통 #두통 한의원', 'c-head')
  ];

  DEF.popup = { on: false, name: '기본 팝업 그룹 1', where: 'home', pc: true, tab: true, mo: true, items: [] };

  function PR(id, n, desc, price, sale, seed){
    return { id: id, cat: '원내 상품', n: n, desc: desc, imgs: [PIC('adm-' + seed, 900, 900)], price: price, sale: sale,
      on: true, soldout: false, tax: '과세', body: '', info: { ing: '', vol: '', eff: '', exp: '', etc: '' } };
  }
  DEF.products = [
    PR('pr1', '콜드퀵', '졸음 걱정 없는 천연 감기약', 30000, 30000, 'pr-cold'),
    PR('pr2', '경옥고 수壽 - 30포', '면역과 기력 회복을 돕는 경옥고', 175000, 175000, 'pr-kyung'),
    PR('pr3', '녹용공진단 수壽 - 10환', '원장이 직접 조제하는 공진단', 200000, 200000, 'pr-gong'),
    PR('pr4', '생맥산 수壽 - 30포', '여름철 기력 보충', 150000, 120000, 'pr-saeng')
  ];
  DEF.prodcats = ['원내 상품'];

  DEF.shipping = {
    ship: '한의원과 진료가 완료되면 배송이 시작됩니다.\n한의원에 직접 방문하여 한약을 수령할 수 있습니다. 주문 단계에서 선택하세요.\n결제완료 후 영업일기준 1~3일 정도 배송 소요 됩니다. (단, 도서산간, 물량 급증, 천재지변 등 택배사 사정 및 생산 이슈 등에 의하여 배송 지연이 발생할 수 있습니다.)\n택배사는 진료 받는 한의원에 따라 다를 수 있습니다.',
    cancel: "'진료대기' 상태 시 [주문 내역] 페이지에서 가능하며, 진료가 시작된 이후에는 주문취소는 불가합니다.\n카드 결제 승인 취소 반영은 카드사 정책에 따르며 자세한 사항은 카드사에 문의해주세요.",
    refund: '교환/반품의 신청은 주문 오류 또는 단순 변심일 경우 상품 배송 완료일로부터 7일 이내 가능합니다.\n상품이 표시내용과 다르거나 불량일 경우 상품 수령일로부터 3개월, 이상 확인을 한 날로부터 30일까지 교환/반품 신청 가능합니다.'
  };

  DEF.doctors = [
    { id: 'd1', name: '박준우', role: '원장', lines: ['연오재한의원 대표 원장', '맞춤 한약 · 다이어트 치료 총괄'], img: PIC('yeonohjae-doctor1', 720, 860) },
    { id: 'd2', name: '김서영', role: '부원장', lines: ['침구 · 추나 진료', '피부 · 여성 질환 진료'], img: PIC('yeonohjae-doctor2', 720, 860) }
  ];

  DEF.gallery = [
    { id: 'g1', img: PIC('yeonohjae-int1', 620, 820), alt: '대기 공간' },
    { id: 'g2', img: PIC('yeonohjae-int2', 620, 560), alt: '접수 데스크' },
    { id: 'g3', img: PIC('yeonohjae-int3', 620, 760), alt: '진료실' },
    { id: 'g4', img: PIC('yeonohjae-int4', 620, 620), alt: '채광이 드는 창가' },
    { id: 'g5', img: PIC('yeonohjae-int5', 620, 700), alt: '탕전실' },
    { id: 'g6', img: PIC('yeonohjae-int6', 620, 540), alt: '상담 라운지' }
  ];

  var FIELDS = Object.keys(DEF);
  var clone = function(v){ return JSON.parse(JSON.stringify(v)); };
  var cache = null, snap = {};

  function load(){
    var db = {};
    FIELDS.forEach(function(f){
      var v = KK.get('yo_' + f);
      db[f] = (v == null) ? clone(DEF[f]) : v;
      /* 기본값에 새로 생긴 항목이 저장본에 없으면 채움 (객체형만) */
      if (v != null && DEF[f] && !Array.isArray(DEF[f]) && typeof v === 'object'){
        for (var k in DEF[f]) if (!(k in v)) v[k] = clone(DEF[f][k]);
      }
      snap[f] = JSON.stringify(db[f]);
    });
    return db;
  }

  window.YO_STORE = {
    FIELDS: FIELDS,
    defaults: function(f){ return clone(DEF[f]); },
    get: function(){ return cache || (cache = load()); },
    /* fn 안에서 db 를 고친 뒤, 바뀐 항목만 저장 */
    update: function(fn){
      var db = this.get();
      var r = fn ? fn(db) : null;
      var ok = true;
      FIELDS.forEach(function(f){
        var s = JSON.stringify(db[f]);
        if (s !== snap[f]){
          if (KK.set('yo_' + f, db[f]) === false) ok = false;
          snap[f] = s;
        }
      });
      return r === undefined ? ok : r;
    },
    uid: function(p){ return (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  };
})();
