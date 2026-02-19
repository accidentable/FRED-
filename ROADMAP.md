# FRED-OS 개발 로드맵

> **비전**: 데이터를 지식으로, 지식을 수익으로 바꾸는 프로세스를 자동화하는 도구
> 한국인 투자자가 월가 분석가와 동일한 수준의 데이터를 한국어로 즉시 받아보는 환경

---

## 현재 상태 (완료)

### 인프라 / 공통
- [x] FastAPI + SSE 스트리밍 채팅
- [x] LangGraph ReAct 에이전트 (Claude claude-sonnet-4-20250514)
- [x] FRED API 실데이터 연결 (`FRED_API_KEY` 설정 완료)
- [x] `start.ps1` Windows PowerShell 5.1 호환 수정
- [x] Pretendard + JetBrains Mono 타이포그래피

### UI / UX
- [x] FRED 지표 카드 + 드래그앤드롭 → 채팅 칩
- [x] Watch 패널 (인라인 차트 모니터, 최대 3개)
- [x] ★ 즐겨찾기 버튼 (Watch 카드, localStorage 영속화)
- [x] 세션 관리 / 새 채팅 버튼
- [x] 히스토리 제한 (컨텍스트 오염 방지)
- [x] 미국 시장 분석 집중 (한국 시장 제외)
- [x] 오른쪽 패널 종목 탭 (검색 + 드래그앤드롭)
- [x] 시스템 로그 패널 제거 → LeftPanel 정리

### AI 기능
- [x] AI 채팅 → `search_fred_indicators` tool → Watch 패널 자동 업데이트
- [x] 터미널 감성 진행 토큰 `[SEARCH] / [EXEC] / [SUCCESS]`
- [x] 시스템 프롬프트 강화 (tool 호출 강제)

### Phase 1 — 포트폴리오 연결 (완료)
- [x] `portfolioStore.ts` — Zustand + localStorage 영속화
- [x] `PortfolioHolding` — ticker, quantity, **avgPrice** 저장
- [x] `PortfolioSection` — LeftPanel 전체 공간 점유 (flex-1), 드래그앤드롭 수신
- [x] `PortfolioDropModal` — 드롭 시 수량/평단가 입력 팝업
- [x] HoldingRow — 실시간 가격 + 평단가 대비 손익률(%) 표시
- [x] AI 채팅 시 포트폴리오 컨텍스트 자동 주입 (ticker + quantity)
- [x] `models.py` — `PortfolioHolding` + `ChatRequest.portfolio` 필드

---

## Phase 1.5 — 섹터 기반 지표 추천  ← **다음 구현**

> "기술주 비중이 높으니 금리·CPI 지표를 주목하세요"

### 배경
`stock_service.py`의 `get_stock_data()`는 이미 yfinance에서 `sector`와 `industry`를
반환한다. 이 정보를 포트폴리오에 연결하면 AI가 섹터 비중을 계산해
관련 FRED 지표를 자동 추천할 수 있다.

### 섹터 ↔ 추천 지표 매핑 (orchestrator 내장 lookup table)

| 섹터 | 관련 FRED 지표 |
|------|--------------|
| Technology / Software | FEDFUNDS, DGS10, CPIAUCSL, BAMLH0A0HYM2 (High Yield OAS) |
| Consumer Discretionary / Retail | RSXFS (Retail Sales), UMCSENT (Consumer Sentiment), UNRATE, PCE |
| Consumer Staples | CPIAUCSL, PCEPI, UNRATE |
| Financials | T10Y2Y (Yield Curve), FEDFUNDS, DRTSCILM (Bank Lending) |
| Energy | DCOILWTICO (WTI Crude), INDPRO (Industrial Production) |
| Healthcare | CPIMEDSL (Medical CPI) |
| Real Estate | MORTGAGE30US, CSUSHPISA (Case-Shiller Home Price) |

### 1.5-1. 포트폴리오 섹터 자동 감지 (프론트엔드)
- [ ] `PortfolioHolding` 타입에 `sector?: string` 필드 추가 (`portfolioStore.ts`)
- [ ] `addHolding()` — sector 파라미터 수용
- [ ] 드롭/추가 시 `/api/stocks/:ticker` 호출 → 응답의 `sector` 자동 저장
  - `PortfolioDropModal` — 백그라운드로 sector 조회 (사용자에게 불투명)
  - `AddForm` — 추가 완료 후 별도 fetch로 sector 보충
- [ ] `HoldingRow` — 섹터 뱃지 표시 (예: `Tech`, `Retail`)

### 1.5-2. AI 컨텍스트에 섹터 + 비중 포함 (백엔드)
- [ ] `models.py` — `PortfolioHolding.sector: str = ""` 추가
- [ ] `chat_stream.py` — 포트폴리오 컨텍스트 문자열 강화
  ```
  [내 포트폴리오 현황]
  - NVDA: 10주 보유 (Technology)
  - WMT: 5주 보유 (Consumer Staples)
  섹터 비중: Technology 67%, Consumer Staples 33%
  ```

### 1.5-3. `recommend_indicators_for_portfolio` AI Tool (백엔드)
- [ ] `orchestrator.py` — 새 tool 추가
  ```python
  @tool
  async def recommend_indicators_for_portfolio(portfolio_summary: str) -> str:
      """사용자가 '어떤 지표를 봐야해?', '내 포트폴리오 관련 지표' 등
      포트폴리오 기반 추천을 요청할 때 호출.
      섹터 비중 분석 → 관련 지표 pool 매핑 → search_fred_indicators 검증
      """
  ```
- [ ] `chat_stream.py` — `on_tool_end` 처리 (기존 `fred_search_results` SSE 재활용)
- [ ] 시스템 프롬프트 — 호출 트리거 규칙 추가

**완료 기준**: 포트폴리오에 기술주 비중이 높은 상태에서 "어떤 지표를 봐야 해?" 질문 시,
AI가 섹터 비중을 분석하고 FEDFUNDS·DGS10·High Yield OAS 등을 Watch 패널에 자동 추가.

---

## Phase 2 — AI 큐레이션 (목표 3: 네비게이터)

> "지금 당신이 주목해야 할 지표는 이것입니다"

### 2-1. 마켓 브리핑 (앱 시작 시 자동 실행)
- [ ] 앱 최초 로딩 시 AI가 오늘의 브리핑 자동 출력
- [ ] 내용: 이번 주 주요 발표 예정 지표 + 포트폴리오 영향 예측
- [ ] 백엔드 `/api/briefing` 엔드포인트 추가

### 2-2. 지표 중요도 레이블
- [ ] 지표 카드에 중요도 배지 표시 (🔴 이번 주 발표 / 🟡 주목 / ⚪ 일반)
- [ ] FRED API 릴리스 캘린더 연동 또는 하드코딩된 주요 발표 일정

### 2-3. "왜 중요한가" 한 줄 설명
- [ ] 각 지표 카드 hover 시 한국어 설명 표시
- [ ] 예: CPIAUCSL → "연준 금리 결정의 핵심 지표. 2% 이상 시 금리 인상 압력"

**완료 기준**: 앱을 켜면 "오늘 오후 8:30 CPI 발표 예정 — NVDA에 영향 가능성 분석" 메시지가 자동으로 나타남

---

## Phase 3 — 상관관계 분석 (목표 2 심화)

> "거시 지표 ↔ 내 종목 캔버스"

### 3-1. 듀얼 오버레이 차트
- [ ] Watch 패널에서 지표 + 종목 동시 오버레이 가능
- [ ] 예: CPI 차트 위에 NVDA 주가 겹쳐서 시각화

### 3-2. 상관계수 계산 및 표시
- [ ] 선택한 지표 ↔ 종목 간 Pearson 상관계수 계산
- [ ] Watch 카드 헤더에 `r = 0.73` 형태로 표시

### 3-3. AI 인과관계 내러티브
- [ ] "이 지표가 왜 내 종목에 영향을 주는가" 자동 설명
- [ ] 예: "CPI ↑ → 금리 인상 가능성 ↑ → 성장주(NVDA) 밸류에이션 압박"

**완료 기준**: Watch 패널에 CPI와 NVDA를 나란히 두면 "r = -0.68 (역상관)" + AI 한 줄 설명이 표시됨

---

## Phase 3.5 — 시나리오 시뮬레이터 (What-if Analysis)

> "만약 CPI가 예상보다 높게 나오면 내 포트폴리오는?"

### 3.5-1. 매크로 시나리오 입력
- [ ] 채팅창에서 "만약 CPI가 3.5%로 나오면?" 형태로 가상 시나리오 입력
- [ ] AI가 과거 유사한 수치 발표 당시의 주가 변동 데이터를 기반으로 확률적 시나리오 레포트 작성

### 3.5-2. 지표 슬라이더 UI
- [ ] Watch 패널 지표 카드에 예측치 설정 슬라이더 추가
- [ ] 슬라이더 조절 시 AI에게 해당 시나리오 질의 자동 전송

**완료 기준**: "금리가 0.5% 인상되면 내 NVDA는?" 질문 시 AI가 "2022년 0.75bp 인상 당시 NVDA -18%..." 형태로 데이터 기반 답변

---

## Phase 4 — 완성도 (Accessibility 마무리)

> "처음 쓰는 사람도 5분 안에 가치를 느끼는 앱"

### 4-1. FRED 검색 고도화
- [ ] 한국어 검색어 → 영어 FRED 시리즈 자동 매핑 (예: "소비자물가" → CPIAUCSL)
- [ ] 연관 지표 추천 (예: CPI 보는 중 → PCE, 근원CPI 추천)

### 4-2. 차트 날짜 범위 선택
- [ ] Watch 카드 / ChartOverlay에 `1Y / 3Y / 5Y / 10Y / MAX` 토글
- [ ] 선택한 기간만큼 FRED API 재요청

### 4-3. 알림 기능 (앱 내 + 외부 연동)
- [ ] 지표가 특정 임계값을 넘으면 Watch 카드에 뱃지 표시
- [ ] Telegram Bot / Webhook 연동 — 앱을 켜두지 않아도 발표 직후 AI 브리핑 전송

### 4-4. 공유 / 리포트 익스포트
- [ ] 현재 채팅 내용 + 차트 스냅샷을 이미지로 내보내기
- [ ] 터미널 감성 레이아웃의 PDF 분석 리포트 익스포트

### 4-5. 지표 관계도 (Relationship Map)
- [ ] 특정 지표 클릭 시 영향을 주고받는 다른 지표를 선으로 연결하여 시각화
- [ ] 예: FEDFUNDS → 달러 인덱스, 2년물 국채, 주택 착공 건수

---

## 기술 부채 / 리팩토링

- [ ] `fred_service.py` — API 응답 캐싱 (같은 지표 반복 요청 방지, Redis or in-memory)
- [ ] `WatchCard` — 데이터 중복 fetch 제거 (React Query 또는 SWR 도입 검토)
- [ ] 에러 바운더리 추가 (차트 렌더링 실패 시 앱 전체 크래시 방지)
- [ ] 환경변수 검증 강화 (시작 시 필수 키 누락 알림)
- [ ] 시계열 정규화 레이어 — FRED 지표별 주기(월간/분기/일간) 불일치 자동 보정
- [ ] 마켓 브리핑 병렬 처리 — `asyncio.gather`로 속도 단축
- [ ] 시스템 프롬프트 버전 관리 — 프롬프트를 코드와 분리

---

## 우선순위 요약

```
지금  → Phase 1.5   (섹터 감지 + 포트폴리오 기반 지표 추천 AI Tool)
다음  → Phase 2-1   (마켓 브리핑 자동 실행)
이후  → Phase 2-2   (지표 중요도 레이블)
나중  → Phase 3     (상관관계 + 오버레이 차트)
최종  → Phase 3.5 / 4 (시나리오 시뮬레이터 / 완성도)
```
