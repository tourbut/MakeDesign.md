# nhimc — 국민건강보험 일산병원 디자인 시스템

공공 의료기관용 디자인 시스템 세트. **신뢰·전문성·정돈됨**을 지향하며, 정보 인지도를 시각적 임팩트보다 우선합니다.

## 한눈에 보기

| 항목 | 값 |
|---|---|
| Primary | **메디컬 블루** `#0067B1` (다크 `#4DA3DE`) |
| Accent / Error | **일산레드** `#E2231A` (다크 `#FF5247`) — 긴급·폐기·에러 **전용** |
| 타이포 | Pretendard / IBM Plex Sans KR, 수치는 IBM Plex Mono |
| 타이포 위계 | 32 / 24 / 20 / 16px 4단 (48px 이상 디스플레이 단계 없음) |
| 모서리 | 카드 12px · 버튼 8px · 배지 pill |
| 그림자 | 2단계뿐 (`sm`, `md`) — 대부분의 표면은 평면 |
| 테마 | 라이트 + 다크 **양쪽 필수** |
| 접근성 | 터치 ≥44px · 포커스 링 3px · 전환 ≤300ms · WCAG AA 이상 |

이 시스템의 색은 **두 개**입니다. 블루가 브랜드 전압이고, 레드는 브랜드 컬러가 아니라 **경고 채널**입니다. `accent`와 `error`가 같은 값을 공유하는 것은 의도된 설계로, "빨강이 보이면 항상 주의하라"는 뜻이 되게 합니다. 장식용으로 쓰지 마세요.

## 파일

| 파일 | 역할 |
|---|---|
| [DESIGN.md](DESIGN.md) | 디자인 철학·의사결정 프레임워크·브랜드 언어 (§1~§5) |
| [design-docs/design-system-reference-llms.txt](design-docs/design-system-reference-llms.txt) | **토큰 SSOT** — 색상 16종(라이트/다크 각각), 타이포 17종, 컴포넌트 29종 |
| [design-docs/ui-ux-guidelines.md](design-docs/ui-ux-guidelines.md) | 평가 루브릭 + 상태 처리 체크리스트 |
| [generated/design-mockup.html](generated/design-mockup.html) | 전체 규칙의 시각화 미러 (`[DESIGN.md §x]` 태그 매핑) |
| [generated/design-mockup.css](generated/design-mockup.css) | 목업 스타일 + 토큰 CSS 변수 |

### 토큰 파일 형식

`design-system-reference-llms.txt`는 **YAML frontmatter + 산문** 구조입니다. frontmatter에 기계가 읽을 값이 들어가고, 산문은 그 값을 `{colors.primary}` 형태로 참조하며 "왜 그런가"를 설명합니다.

```
---
version / name / description
colors / colors-dark / typography / rounded / spacing / shadow / motion / components
---
## Overview / Colors / Typography / Layout / Elevation / Components
## Responsive Behavior / Accessibility / Known Gaps
```

값을 바꿀 때는 **이 파일을 먼저** 고치고, 그다음 `design-mockup.css`의 `:root` / `[data-theme="dark"]`를 맞춥니다.

## 목업 열기

```bash
cd generated
python -m http.server 8000
# → http://127.0.0.1:8000/design-mockup.html
```

목업이 시각화하는 것: 브랜드 색상 카드 · 색상 스와치 10종 · 타이포 스케일 13종 · 간격 스케일 · **4상태 데모**(로딩 스켈레톤 / 빈 상태 / 에러 / 성공 토스트) · 명도 대비 검증 · 키보드 포커스 · 반응형 체크리스트.

우측 상단 토글로 다크모드를 확인하세요.

## 완료된 것

- 라이트·다크 토큰 전체 정의 (frontmatter ↔ CSS 변수 1:1 동기화)
- 타이포 스케일 17종 — 전부 정수 px, 소수 rem 없음
- 컴포넌트 스펙 29종 (버튼·내비·카드·배지·상태·토스트 등)
- 4상태(로딩/빈/에러/성공) 목업 시연
- 접근성 기준 명문화 및 목업 내 검증 블록

## 남은 작업 (Known Gaps)

토큰 파일의 `## Known Gaps` 섹션이 정식 목록입니다. 요약하면:

1. **부분 로딩(Partial) 상태** — `ui-ux-guidelines.md §3`이 5번째 필수 상태로 요구하지만 토큰·목업 모두 없음. 가장 시급
2. **폼 컴포넌트** — input / select / checkbox / radio 토큰 미정의
3. **테이블·데이터 그리드** — 병원 업무 화면의 핵심인데 미정의
4. **모달·다이얼로그** — 스크림 색·불투명도 미정의, 포커스 트랩 검증 불가
5. **차트 팔레트** — Primary 하나로는 다계열 차트 표현 불가
6. **아이콘 세트** — 현재 목업은 이모지 자리표시자 사용
7. **컴포넌트 라이브러리** — 프레임워크·라이브러리 미확정
8. **`design-docs/design.md`** — 컴포넌트·패턴 상세 스펙 문서 미작성

이 작업들은 **Claude의 design 기능**으로 이어서 진행합니다.
