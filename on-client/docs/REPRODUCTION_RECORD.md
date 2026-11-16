# 케셰브(Keshev) 새 환경 실행 재현 기록 및 최종 인수인계 (22단계)

> **문서 성격 (시연 · 학생 진술 · 원문 검토 구분)**  
> 이 문서는 학생이 기존 작업 폴더를 보존한 채 별도의 빈 폴더에서 직접 실행·확인한 **학생 진술(재현 기록)** 입니다.  
> - `npm run demo` 에서 확인한 **예제 자료(demo) 결과**는 실제 회사/운영 시스템(`connected`) 연결 성공이나 성취가 아닙니다.  
> - ALEPH 포털의 AI 판정 통과는 제출 커밋 원문(코드·문서)의 정합성 검토이며, 판정 서버가 본 앱을 직접 실행해 검증했음을 증명하지 않습니다.

---

## 1. 버전 및 저장소 메타데이터

| 항목 | 내용 |
|---|---|
| **현재 릴리스 상태** | **검증 중인 버전 (`0.2.21-verifying`, pre-release — `v1.0` 아님)** |
| **저장소 URL** | `https://github.com/prosild/keshev-security-agent` |
| **브랜치** | `main` |
| **재현 검증 대상 기준 커밋** | `1a790bd2bc216ca1f061f0e9cab36b3d5e4cbb5e` (21단계 통과 커밋; `on-client/student/extension.mjs` 코드는 20단계 통과 커밋 `70ecd4d9f88fb1e95fac9363b4bde65af8138b4d`와 동일) |
| **최종 제출 커밋** | 본 22단계 문서 추가 커밋(`HEAD`, 포털 22단계 제출란에 기재한 40자리 커밋 해시). 문서 외 학생 코드·제공 코드는 수정하지 않았습니다. |
| **재현 환경** | Windows / PowerShell, Node.js `v24.21.0` (`package.json` 선언 `24.19.0`), npm `12.2.0`, 시작 틀 `alekov-client-starter` `0.2.21`, 외부 npm 의존성 없음 (`package-lock.json` 없음) |

> **v1.0 을 붙이지 않는 이유 (누락 · 미해결 사항)**  
> 19단계의 실제 원천 보안 조치 집행 연결, 실제 회사/운영 SDP 어댑터(`connected`) 연동, 알레프게이트/CLCO OAuth 승인 후 `verified` AI 호출, 승인 패키지 기반 OSV 실조회, 그리고 최종 공식 수용이 아직 완료되지 않아 본 버전은 `v1.0` 이 아닌 **검증 중인 버전**으로 남깁니다. 서로 다른 커밋의 통과 결과를 합쳐 최종 버전 전체의 실제 운영 성공으로 표시하지 않습니다.

---

## 2. 새 빈 폴더 이동 · 재현 절차 (이동 가능한 구성)

기존 작업 폴더를 보존한 채 다른 환경이나 새 빈 폴더로 옮겨 실행하는 절차입니다. (로컬 절대 경로나 비밀값에 의존하지 않습니다.)

1. 새 빈 폴더에 저장소를 내려받습니다.
   ```powershell
   git clone https://github.com/prosild/keshev-security-agent.git keshev-repro
   cd keshev-repro/on-client
   ```
2. 설정이 필요하면 비밀 없는 견본인 `on-client/.env.example` (`ON_PORT`, `ON_ENGINE_ADAPTER`, `ON_AI_MODEL`, `ON_PROJECT_DIRECTORY`, `ON_APPROVED_PUBLIC_PACKAGES`)을 참고해 로컬 환경 변수만 구성합니다. **기존 작업 폴더의 인증·자격·설정 파일(`native.json`, `.env`, 사용자 폴더 내 보관함)을 무작정 복사하지 않습니다.**
3. 런타임과 구문을 확인합니다. (외부 npm 의존성이 없으므로 `npm install` 은 필요하지 않습니다.)
   ```powershell
   node -v
   npm --version
   npm run check
   ```
4. 기본 모드로 실행 → 종료 → 재실행해 일관된 응답을 확인합니다.
   - `npm start` (`node src/server.mjs`) 실행 후 `케셰브 연결 확인: http://127.0.0.1:5189` 및 `GET /api/diagnostics` 응답(`engine.mode: "disconnected"`, `engine.code: "ENGINE_NOT_CONNECTED"`) 확인
   - `Ctrl+C`로 종료 뒤 다시 실행해도 동일 결과 확인
5. 예제(데모) 모드로 실행해 브라우저 UI를 확인합니다.
   - `npm run demo` (`node src/server.mjs --demo`) 실행 후 `케셰브 예제: http://127.0.0.1:5189` 확인
   - 브라우저에서 `http://127.0.0.1:5189/` 접속 후 **보호 현황** / **업무 앱** / **보안 기록** 탭 확인

---

## 3. 새 환경 실행 재현 기록 (13~21단계)

기준 커밋(`1a790bd2bc216ca1f061f0e9cab36b3d5e4cbb5e`)을 임시 빈 폴더(`<TEMP>/keshev-repro-check`)에 `git clone` 하여 **2026-11-16 10:40~10:44 KST** 사이에 직접 실행·관찰한 결과입니다.

| 단계 | 확인한 기능 | 결과 | 확인 시각 (KST) | 비고 (구분 · 근거 · 미확인 원인) |
|---|---|---|---|---|
| 13 | 로그인 사용자·기기·세션 표시 (`renderIdentity`) | 연결 없음(기본) / 확인 불가(모의: 예제 자료) | 2026-11-16 10:42~10:43 | 기본 실행 시 `ENGINE_NOT_CONNECTED`. `--demo` 시 `#student-identity`에 `practice-user`, `practice-pc`, `practice-session` 표시 확인(**예제 자료**, 실제 연결 아님). |
| 14 | 업무 앱 접속 판정 (`renderDecision`) | 확인 불가(모의: 예제 자료) | 2026-11-16 10:43 | `--demo` **업무 앱** 탭에서 `library` 요청 시 `#student-decision`에 `접근 허용 (allow)` 표시 확인(**예제 자료**). 실제 SDP 판정은 연결 없음. |
| 15 | 접속·XDR 기록 목록 및 상세 (`renderEvents`) | 확인 불가(모의: 예제 자료) | 2026-11-16 10:43 | `--demo` **보안 기록** 탭에서 `#student-events` 목록(`표시 건수: 1건 / 전체 1건`)·필터 표시 확인(**예제 자료**). 실제 XDR 원천 기록은 연결 없음. |
| 16 | 기기·세션·알림·도움정보 및 미지원 조치 (`renderStatus`, `renderEvents`) | 연결 없음(기본) / 확인 불가(모의: 예제 자료) | 2026-11-16 10:43 | `--demo`에서 `도움정보 불러오기` 클릭 후 `#student-status` 렌더링 확인(**예제 자료**). 이전 검증에서 서버 중단 후 `NETWORK_ERROR` 수동 재시도 안내 확인. |
| 17 | 앱 내부 AI 연결 상태 (`renderAiConnection`) | 확인 불가 | 2026-11-16 10:43 | `--demo`에서 `AI 연결 점검` 클릭 시 `ON_AI_PROVISIONING_PENDING` (`권한 준비 중·확인 불가`) 표시 확인. 운영 측 계정·앱 권한 준비 전이라 실제 `verified` 응답 미확인(**기다림/UNV**). |
| 18 | 근거 연결 AI 사건 설명 (`renderExplanation`) | 확인 불가 | 2026-11-16 10:43 | `--demo` 초기 `event === null` 안내(`보안 기록에서 기록을 먼저 고르세요`) 확인. 이전 검증에서 오류 시 `data-student-explanation-event` 미부착 확인. 실제 AI 설명 `ok` 응답은 **기다림/UNV**(단위 테스트로만 검증). |
| 19 | 보안 조치 요청 상태·결과 구분 (`renderAction`) | 확인 불가 | 2026-11-16 10:43 | `--demo`에서 `#student-action` 초기 `아직 미실행 (idle)` 및 `supportedActions` 비어 있음 정상 안내·버튼 0개 확인. 실제 집행 서버 연결 미준비로 실집행 미확인(**기다림/UNV**, 11종 상태는 단위 테스트로 검증). |
| 20 | 설치 패키지 버전·OSV 취약점 조회 (`renderVulnerabilities`) | 확인 불가 | 2026-11-16 10:43 | `--demo`에서 `설치 패키지 조회` 클릭 시 `not_configured` (`PROJECT_NOT_CONFIGURED`) 표시 확인. 프로젝트 설정·`package-lock.json` 미구성으로 실제 OSV 조회(`complete`/`partial`) 미확인(**기다림/UNV**, 단위 테스트로 검증). |
| 21 | 실행 설명서·구성도·종료 후 재실행 (`README.md`, `STUDENT_RUNBOOK.md`) | 재현됨(로컬 기본/예제 실행) | 2026-11-16 10:41~10:43 | 새 클론 폴더에서 `npm run check` 통과, `npm start` 기동(`ENGINE_NOT_CONNECTED`) → 종료 → 재기동 동일 응답 확인. 단 `tools/start-alekov.ps1` 및 `npm run package-app` 실행은 미확인. |

---

## 4. 기다림(UNV) 및 미확인 항목 요약

- **운영 SDP `connected` 연동**: 기본 실행 시 `ENGINE_NOT_CONNECTED` 상태이며, 실제 회사/운영 어댑터를 연결한 상태의 로그인·기기·세션·접속 판정·보안 기록은 미확인입니다.
- **실제 알레프게이트 OAuth 승인 및 AI 호출 (`17~18단계`)**: `ON_AI_PROVISIONING_PENDING` 상태로 인해 실제 `verified` 모델 점검 및 실제 AI 사건 설명 `ok` 응답은 **기다림(UNV)** 입니다.
- **실제 보안 조치 집행 및 관측 (`19단계`)**: 현재 기록의 `supportedActions`가 비어 있고 실집행 연결이 준비되지 않아 `prepared` → `executing` → `pending` → `succeeded` 실제 흐름은 **기다림(UNV)** 입니다.
- **실제 프로젝트 OSV 취약점 조회 (`20단계`)**: 외부 의존성과 `package-lock.json`이 없고 프로젝트/승인 패키지 미설정(`PROJECT_NOT_CONFIGURED`) 상태라 실제 `complete`/`partial` 결과는 **기다림(UNV)** 입니다.
- **미실행 보조 스크립트**: `tools/start-alekov.ps1`, `npm run package-app` 은 직접 실행하지 않아 미확인입니다.

---

## 5. 데이터 보존 · 백업 · 복원 계획

### 5.1 기존 폴더 및 Git 이력 보존
- 재현 검증은 반드시 원래 작업 폴더 밖의 **새 빈 폴더**에서 수행해 기존 작업 트리, `.git` 이력, 로컬 설정을 건드리지 않습니다.

### 5.2 데이터 구분별 보존 · 백업 · 복원 절차 및 제한

| 데이터 구분 | 해당 파일 / 위치 | 보존 · 백업 방법 | 복원 절차 | 제한 사항 |
|---|---|---|---|---|
| **학생 소스 및 문서 (Git 추적)** | `on-client/student/extension.mjs`, `README.md`, `on-client/docs/STUDENT_RUNBOOK.md`, `on-client/docs/REPRODUCTION_RECORD.md` | Git 커밋 후 원격 저장소(`origin/main`)에 푸시해 이력 보존 | 새 폴더에 `git clone` 후 필요한 커밋(`git checkout <commit>`)으로 복원 | 제공 파일(`on-client/.on-starter-manifest.json` 74개)은 원본 SHA-256을 유지해야 합니다. |
| **런타임 환경 설정 견본 (비밀 없음)** | `on-client/.env.example` | Git으로 함께 백업·이동 | 새 폴더에서 필요 시 `.env.example`을 참고해 로컬 환경 변수 설정 | 비밀 키·토큰·비밀번호는 `.env.example`이나 Git 커밋에 절대 저장하지 않습니다. |
| **로컬 전용 인증·자격·승인 상태 (Git 비추적)** | 로컬 `.env`, `native.json`, Windows 사용자 폴더 내 프로젝트별 자격 보관소 | Git에 포함하지 않고 사용자 로컬 보안 영역에만 유지 | 새 환경에서는 기존 폴더에서 자격 파일을 무작정 복사하지 말고, 계정 연결·AI 승인 절차를 통해 재발급·재확인 | 운영자 권한/승인 연결이 준비되기 전에는 새 환경으로 자격을 복사해도 `connected`로 동작하지 않습니다. |
| **화면 상태 및 데모 데이터** | 브라우저 세션, `npm run demo` 내장 예제 | 영구 저장소 없음 (`demo`는 모의 데이터 전용) | 앱 재실행 후 **다시 불러오기** 버튼으로 현재 상태 재조회 | 서버 종료 시 화면 상태는 초기화되며, 조치·AI 취소 상태가 서버의 기존 처리 효과를 되돌리지는 않습니다. |
