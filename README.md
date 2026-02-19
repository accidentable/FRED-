# FRED-OS 🖥️

AI 기반 경제 데이터 분석 터미널 플랫폼.
FRED(Federal Reserve Economic Data)를 활용한 한국어 경제 분석 서비스.

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python 3.11+ · FastAPI · LangGraph · Gemini 2.0 Flash |
| **Frontend** | React 19 · Vite · Recharts · Zustand · TailwindCSS |
| **Data** | FRED API · Pandas |

## 프로젝트 구조

```
fred-terminal-orchestrator/
├── apps/
│   ├── server-py/        # Python FastAPI 백엔드
│   │   ├── app/
│   │   │   ├── main.py           # FastAPI 앱 진입점
│   │   │   ├── config.py         # 환경 설정
│   │   │   ├── models.py         # Pydantic 모델
│   │   │   ├── data/indicators.py # 한국어 경제 지표
│   │   │   ├── services/
│   │   │   │   ├── orchestrator.py  # LangGraph AI 에이전트
│   │   │   │   └── fred_service.py  # FRED API 서비스
│   │   │   └── routes/
│   │   │       ├── chat.py       # POST /api/chat
│   │   │       ├── fred.py       # GET  /api/fred/*
│   │   │       └── sessions.py   # 세션 관리
│   │   └── requirements.txt
│   └── web/              # React 프론트엔드
├── packages/
│   └── shared/           # 공유 TypeScript 타입
├── start.ps1             # 원클릭 실행 스크립트
└── .env.example          # 환경 변수 템플릿
```

## 실행 방법

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일에 API 키 입력
```

| 키 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `FRED_API_KEY` | ❌ | 없으면 Mock 데이터 사용. [FRED](https://fred.stlouisfed.org/docs/api/api_key.html)에서 발급 |

### 2. 한번에 실행 (PowerShell)

```powershell
.\start.ps1
```

> 자동으로 Python venv 생성, 의존성 설치, 백엔드 + 프론트엔드 동시 실행

### 3. 수동 실행

**백엔드** (터미널 1):
```powershell
cd apps/server-py
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 3001
```

**프론트엔드** (터미널 2):
```powershell
pnpm install
pnpm dev:web
```

### 접속

- 🖥️ Frontend: http://localhost:5173
- 🐍 API Server: http://localhost:3001
- 📚 API Docs: http://localhost:3001/docs

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/chat` | AI 채팅 (한국어) |
| `GET` | `/api/fred/indicators` | 경제 지표 목록 |
| `GET` | `/api/fred/series/:id` | 시계열 데이터 조회 |
| `GET` | `/api/fred/search?q=` | 시리즈 검색 |
| `GET` | `/health` | 서버 상태 체크 |

## 사용 예시

```
사용자: 요즘 물가 어때?
AI: 📊 소비자물가지수(CPI) 분석...

사용자: 그럼 실업률은?
AI: 📊 실업률(UNRATE) 분석... (이전 대화 맥락 유지)
```
