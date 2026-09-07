# Cloudflare Pages 배포 체크리스트

## 권장 방식: GitHub 연결 배포

1. 이 프로젝트 폴더의 내용을 GitHub 저장소 루트에 올립니다.
2. Cloudflare Dashboard에서 **Workers & Pages → Create application → Pages → Connect to Git**으로 이동합니다.
3. GitHub 저장소를 선택합니다.
4. 아래 빌드 설정을 입력합니다.

```text
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (비워두기)
```

5. 현재 정적 버전은 Cloudflare 빌드 환경변수가 필요하지 않습니다.
6. **Save and Deploy**를 실행합니다.
7. 배포 후 `https://<프로젝트명>.pages.dev/` 및 `/login`을 새로고침하여 확인합니다.

## SPA 라우팅

`404.html`을 일부러 만들지 않았습니다. Cloudflare Pages는 최상위 `404.html`이 없는 프로젝트를 SPA로 취급하여 `/login` 같은 경로를 루트 React 앱으로 전달합니다.

`/* /index.html 200` 형태의 catch-all `_redirects`도 넣지 않았습니다. Cloudflare Pages에서는 기본 SPA 동작을 사용하는 것이 이 프로젝트에 더 단순하고 안전합니다.

## Node 버전

루트의 `.node-version`에 `22.16.0`을 지정했습니다.

## 배포 실패 시 먼저 볼 것

- Build command가 `npm run build`인지
- Output directory가 `dist`인지
- Root directory를 잘못된 하위 폴더로 설정하지 않았는지
- `package.json`, `vite.config.ts`, `index.html`이 저장소 루트에 있는지

## 운영 전 필수 주의

이 버전의 로그인/회원/휴가 데이터는 브라우저 `localStorage`/`sessionStorage` 기반입니다. 여러 직원이 하나의 중앙 데이터베이스를 공유하는 회사 운영용 시스템이 아닙니다. 실제 운영 전에는 Supabase Auth + Database + RLS 같은 서버측 인증/DB 구조로 이전해야 합니다.
