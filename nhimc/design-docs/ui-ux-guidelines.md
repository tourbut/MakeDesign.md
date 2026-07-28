# UI/UX Evaluation Guidelines

<!-- AI Harness Rule: Create a specific evaluation rubric focusing on design quality, originality, and functionality so that subjective measures for evaluating frontend deliverables can be scored mechanically. -->

> UI와 UX 디자인을 표준화하기 위한 평가 지표, 가이드라인, 루브릭을 정의합니다.
> 상세한 등급 기준은 `FRONTEND.md`의 Design Quality / Originality & UX / Functionality 섹션을 참조하세요.
> 이 문서는 `DESIGN.md §4 표준 디자인 소스 세트`의 구성원이다.

---

## 1. 디자인 시스템 원칙

- **일관성(Consistency)**: 색상, 타이포그래피, 간격, 컴포넌트 스타일이 모든 페이지에서 동일해야 합니다.
- **계층 구조(Hierarchy)**: 시각적 계층을 통해 사용자가 중요한 정보를 먼저 인식할 수 있어야 합니다.
- **응답성(Responsiveness)**: 모든 UI는 모바일/태블릿/데스크탑에서 정상 작동해야 합니다.
- **최소 인지 부하(Minimal Cognitive Load)**: 한 화면에 표시되는 정보 밀도를 적정 수준으로 유지합니다.

---

## 2. 컬러 팔레트 가이드

| 용도 | 색상 토큰 | 설명 |
|------|-----------|------|
| Primary | `--color-primary` | 주요 CTA, 강조 요소 |
| Secondary | `--color-secondary` | 보조 액션, 덜 중요한 요소 |
| Background | `--color-bg` | 페이지/카드 배경 |
| Surface | `--color-surface` | 카드, 모달 등 떠 있는 레이어 |
| Error | `--color-error` | 에러 상태 표시 |
| Success | `--color-success` | 성공 상태 표시 |
| Text Primary | `--color-text` | 주요 텍스트 |
| Text Secondary | `--color-text-muted` | 보조 텍스트 |

> 구체적인 색상 값은 `.agents/design-docs/design-system-reference-llms.txt`에 정의합니다.

---

## 3. 상태별 UI 처리 체크리스트

모든 화면/컴포넌트에서 아래 상태를 처리해야 합니다:

- [ ] **로딩 상태(Loading)**: 스켈레톤 UI 또는 스피너 표시
- [ ] **빈 상태(Empty)**: 데이터 없음 안내 + 행동 유도(CTA)
- [ ] **에러 상태(Error)**: 사용자 친화적 에러 메시지 + 재시도 버튼
- [ ] **성공 상태(Success)**: 작업 완료 피드백 (토스트, 배지 등)
- [ ] **부분 로딩(Partial)**: 점진적 로딩 처리 (e.g., 무한 스크롤)

---

## 4. 인터랙션 디자인 원칙

- **즉각적 피드백**: 버튼 클릭, 폼 제출 등 모든 사용자 액션에 즉각적 시각 피드백 제공
- **애니메이션 절제**: 의미 있는 전환(transition)만 사용하며, 300ms 이하로 제한
- **터치 영역**: 모바일 탭 영역은 최소 44x44px 보장
- **포커스 관리**: 모달 오픈 시 포커스 트랩, 닫을 때 원래 위치로 복귀

---

## 5. 평가 방법

| 평가 항목 | 방법 | 도구 |
|-----------|------|------|
| 시각적 일관성 | 디자인 시스템 토큰 준수 여부 확인 | 수동 검토 |
| 접근성 | WCAG AA 기준 충족 확인 | axe-core, Lighthouse |
| 반응형 | 3개 브레이크포인트 테스트 (375px, 768px, 1440px) | Chrome DevTools |
| 성능 체감 | 로딩/전환 시 체감 지연 여부 | Lighthouse, 수동 검토 |
