/* =========================================================================
   연오재 새 사이트 · 연결 설정 (이 파일 하나만 고치면 됩니다)
   - 새 Supabase 프로젝트를 만든 뒤: Project Settings → API (또는 Connect) 에서
       Project URL           → SUPABASE_URL
       Publishable key(anon) → SUPABASE_KEY
   - 사이트 주소: Vercel 에 배포한 주소 (도메인을 연결하면 그 주소)
   ※ Publishable key 는 공개돼도 괜찮은 키입니다. (secret / service_role 키는 절대 넣지 마세요)
   ========================================================================= */
window.SITE_CONFIG = {
  SUPABASE_URL: 'https://여기에-새-프로젝트-주소.supabase.co',
  SUPABASE_KEY: 'sb_publishable_여기에-새-키',
  SITE_URL:     'https://새-사이트-주소.vercel.app'
};
