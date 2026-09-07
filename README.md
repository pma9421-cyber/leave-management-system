# 연차 및 휴가 관리 시스템 — Cloudflare Pages 배포판

React 19 + TypeScript + Vite + Tailwind CSS 기반의 연차/휴가 관리 웹앱입니다.
이 버전은 **Cloudflare Pages 정적 SPA 배포**에 맞게 정리되어 있습니다.

## 변경된 배포 구조

- Vite 개발 서버에서만 동작하던 `/api/audit-logs` 미들웨어 제거
- 빌드 결과 디렉터리를 `dist`로 명시
- Node.js 버전을 `.node-version`으로 고정
- Cloudflare Pages용 보안 헤더(`public/_headers`) 추가
- 검색엔진 색인 방지(`public/robots.txt`) 추가
- AI Studio 전용 환경변수 설명 제거
- `/login` 등 SPA 경로는 Cloudflare Pages의 기본 SPA fallback 사용
- production sourcemap 비활성화

## 로컬 실행

Node.js 22 권장.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 빌드 확인

```bash
npm run lint
npm run build
```

정상 빌드되면 `dist/` 폴더가 생성됩니다.

## Cloudflare Pages 배포

### 1) GitHub에 프로젝트 업로드

프로젝트 루트를 GitHub 저장소에 올립니다.

### 2) Cloudflare Pages에서 저장소 연결

Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → Git 저장소 연결.

빌드 설정:

| 항목 | 값 |
|---|---|
| Framework preset | React (Vite) 또는 Vite |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 저장소 루트라면 비워둠 |

현재 버전에는 빌드 시 필요한 환경변수가 없습니다.

### 3) 배포 후 확인

다음 주소들을 각각 새로고침해 확인합니다.

- `/`
- `/login`

Cloudflare Pages는 프로젝트 루트에 `404.html`이 없으면 SPA로 간주하여 알 수 없는 경로를 루트 앱으로 전달합니다. 따라서 별도의 catch-all `_redirects` 파일이 필요하지 않습니다.

## 중요한 운영 주의사항

현재 데이터 저장 방식은 `localStorage`/`sessionStorage` 기반입니다. 따라서 이 배포본은 **정적 데모/단일 브라우저 사용에는 적합하지만 실제 여러 직원이 함께 쓰는 운영 시스템에는 적합하지 않습니다.**

특히 현재 구조에서는:

- 브라우저마다 사용자/연차 데이터가 따로 저장됨
- 비밀번호가 브라우저 저장 데이터에 포함됨
- 사용자 권한 검증이 서버에서 이루어지지 않음
- 감사로그가 서버의 불변 로그가 아님

실제 회사 운영 전에는 Supabase Auth + PostgreSQL + RLS 방식으로 전환하는 것을 권장합니다.

### 초기 최고관리자 계정 주의

원본에 포함되어 있던 초기 최고관리자 비밀번호 값은 공개 배포 시 번들에서 노출될 수 있어 제거했습니다. 현재 정적 데모용 초기 비밀번호는 `change-me-after-first-login`입니다. 이 값 역시 브라우저용 소스에 포함되므로 **실제 운영용 비밀번호로 간주하면 안 됩니다.** 운영 전에는 반드시 서버측 인증으로 이전하세요.

> 보안 주의: Vite의 `VITE_*` 환경변수는 브라우저 번들에 포함됩니다. 비밀번호, Secret key, service-role key 같은 비밀값을 넣지 마세요.
