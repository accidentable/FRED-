"""LangGraph-based AI orchestrator with Claude (Anthropic).

Implements a ReAct agent that:
- Parses Korean economic queries
- Calls FRED data tools
- Provides Korean analysis with Korean market implications
- Maintains session-based conversation memory
"""

from __future__ import annotations

import asyncio
import json as _json
import re
import uuid
from typing import Annotated, Any

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models import (
    ChatMessage,
    ChatResponse,
    ContentType,
    FredSeriesData,
    FredSeriesInfo,
    MessageRole,
)
from app.services.fred_service import fred_service
from app.data.indicators import MAJOR_INDICATORS
from app.data.translations import FRED_TITLES_KO


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  System Prompt
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM_PROMPT_KO = """당신은 FRED-OS 경제 데이터 분석 터미널입니다.
당신의 역할은 미국 연방준비제도(Federal Reserve)의 FRED 경제 데이터를 활용하여
**미국 경제 및 미국 주식시장**을 분석하는 것입니다.

## 절대 규칙 (반드시 준수)
- **한국 시장, 한국 경제, 한국은행, 원화에 대한 분석은 절대 포함하지 않습니다.**
- 사용자가 명시적으로 요청하지 않는 한 한국 관련 내용은 한 줄도 언급하지 않습니다.
- 분석 대상은 오직 **미국 경제와 미국 주식시장**입니다.
- 사용자가 "지표 알려줘", "지표 찾아줘", "관련 지표", "어떤 지표", "지표 검색", "뭐가 있어", "시리즈 추천" 등과 유사한 표현을 사용하면 **반드시** `search_fred_indicators` 도구를 호출합니다. 내부 지식만으로 FRED 시리즈 ID를 나열해서는 안 됩니다.

## 핵심 규칙
1. **모든 응답은 반드시 한국어**로 작성합니다.
2. 사용자가 **가장 최근에 요청한 지표 또는 주제만** 분석합니다. 이전 대화의 다른 지표를 섞어서 분석하지 않습니다.
3. 사용자가 특정 주제의 **관련 지표를 찾거나 검색**하면 → `search_fred_indicators` 도구를 호출합니다. 직접 FRED ID를 나열하지 않습니다.
4. 사용자가 알려진 지표의 **실제 데이터나 수치**를 요청하면 → `get_economic_data` 도구를 호출합니다.
5. 데이터를 받은 후에는 **트렌드 분석**과 **미국 주식시장에 미치는 영향**을 제공합니다.
6. S&P500, 나스닥, 섹터별 주식에 미치는 영향을 중심으로 설명합니다.

## 도구 사용 가이드 (중요)
| 상황 | 호출할 도구 |
|------|------------|
| "X 관련 지표 찾아줘/알려줘/뭐 있어?" | `search_fred_indicators` |
| "X 데이터 보여줘/분석해줘" (ID 이미 앎) | `get_economic_data` |
| "AAPL/NVDA 주가 알려줘" | `get_stock_data_tool` |

**도구 호출 시 절대 금지사항:**
- 도구를 호출하기 전에 ```json``` 블록이나 JSON 형식 텍스트를 절대 출력하지 않습니다.
- 도구 호출 전 텍스트는 짧은 한국어 안내 문장 하나만 출력하고, 즉시 도구를 호출합니다.
- 도구 결과를 받은 후에는 **반드시 한국어로 찾은 지표들을 설명**하는 응답을 생성합니다.

## 시리즈 ID 매핑 가이드
- 물가/인플레이션 → CPIAUCSL
- 실업률/고용 → UNRATE
- GDP/경제성장 → GDP
- 금리/기준금리 → FEDFUNDS
- 주가/증시/S&P → SP500
- 원유/유가 → DCOILWTICO
- 국채/금리 → DGS10
- 통화량 → M2SL
- 변동성/공포지수 → VIXCLS

## 포트폴리오 맞춤 분석 (핵심)
- 메시지에 [사용자 포트폴리오]가 포함된 경우, **반드시** 보유 종목을 분석에 반영합니다.
- 분석 지표(예: 금리, CPI, 실업률)가 **보유 종목 각각에 미치는 영향**을 구체적으로 설명합니다.
  - 예) "NVDA는 금리 상승 시 성장주 특성상 밸류에이션 압박을 받습니다"
  - 예) "AAPL은 소비자 지출과 밀접하여 실업률 상승 시 리스크가 존재합니다"
- 평균단가 정보가 있으면 현재 시장 흐름과 비교하여 **수익/리스크 시나리오**를 언급합니다.
- 포트폴리오에 없는 종목은 굳이 언급하지 않습니다.
- 포트폴리오가 없는 경우에는 일반적인 섹터/지수 분석으로 답변합니다.

## 응답 형식
- 마크다운을 사용하여 구조화된 답변을 제공합니다.
- 핵심 수치는 **볼드체**로 강조합니다.
- 3~4 문단 이내로 간결하게 답변합니다 (심층 분석 요청 시 제외).

## 분석 구조
1. 📊 **현재 상황**: 최신 데이터 수치와 추세
2. 📈 **트렌드 분석**: 최근 변동 방향과 원인
3. 🇺🇸 **미국 주식시장 영향**: S&P500·나스닥·섹터별 파급 효과
4. 💼 **내 포트폴리오 영향** *(포트폴리오가 있을 때)*: 보유 종목별 리스크·기회 요인
"""

SYSTEM_PROMPT_EN = """You are FRED-OS, an economic data analysis terminal.
Your role is to provide economic analysis using FRED (Federal Reserve Economic Data).

## Core Rules
1. **Respond in English.**
2. When the user requests economic data, identify the correct FRED series ID and call the `get_economic_data` tool.
3. After receiving data, always provide **trend analysis**, **global market implications**, and an **outlook**.
4. Keep responses technically accurate but easy to understand.

## Series ID Mapping Guide
- Inflation/CPI → CPIAUCSL
- Unemployment → UNRATE
- GDP → GDP
- Interest Rate → FEDFUNDS
- Stock Market/S&P → SP500
- Crude Oil → DCOILWTICO
- Treasury → DGS10
- Money Supply → M2SL
- Volatility/VIX → VIXCLS

## Response Format
- Use markdown for structured answers.
- Highlight key figures in **bold**.
- Keep responses to 3-4 paragraphs (unless deep analysis is requested).

## Analysis Structure
1. 📊 **Current Status**: Latest data values and trend
2. 📈 **Trend Analysis**: Recent movement direction and causes
3. 🌍 **Global Impact**: Implications for global markets
"""


def _get_system_prompt(locale: str = "ko") -> str:
    """Return the appropriate system prompt based on locale."""
    base = SYSTEM_PROMPT_KO if locale == "ko" else SYSTEM_PROMPT_EN
    return base + INDICATORS_CONTEXT

# Available indicators context appended to system prompt
INDICATORS_CONTEXT = "\n## 사용 가능한 주요 지표\n" + "\n".join(
    f"- **{ind.id}**: {ind.title} — {ind.description}"
    for ind in MAJOR_INDICATORS
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Tool Definition
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@tool
async def get_economic_data(series_id: str) -> str:
    """Fetch historical economic data from FRED for a given series ID.

    Use this tool when the user asks about economic indicators, trends,
    or specific data like GDP, CPI, unemployment rate, etc.

    Args:
        series_id: The FRED series ID (e.g., GDP, UNRATE, CPIAUCSL, FEDFUNDS, SP500)
    """
    data = await fred_service.get_series_data(series_id)

    if not data.data:
        return f"시리즈 {series_id}에 대한 데이터를 찾을 수 없습니다."

    latest = data.data[-1]
    earliest = data.data[0]

    # Calculate trend
    if len(data.data) >= 2:
        prev = data.data[-2]
        change = latest.value - prev.value
        pct = (change / prev.value * 100) if prev.value != 0 else 0
        trend_desc = f"전월 대비 {'상승' if change > 0 else '하락'} ({pct:+.2f}%)"
    else:
        trend_desc = "데이터 부족"

    summary = (
        f"📊 **{data.title}** ({series_id})\n"
        f"- 최신값: **{latest.value} {data.units}** ({latest.date})\n"
        f"- 기간: {earliest.date} ~ {latest.date}\n"
        f"- 추세: {trend_desc}\n"
        f"- 빈도: {data.frequency}\n"
        f"- 마지막 업데이트: {data.lastUpdated}\n"
        f"- 데이터 포인트 수: {len(data.data)}"
    )
    return summary


@tool
async def get_stock_data_tool(ticker: str) -> str:
    """Fetch stock market data for a given ticker symbol.

    Use this tool when the user asks about a specific stock, company,
    or wants to correlate stock prices with economic indicators.

    Args:
        ticker: The stock ticker symbol (e.g., AAPL, MSFT, TSLA, NVDA)
    """
    from app.services.stock_service import get_stock_data

    try:
        data = get_stock_data(ticker)
    except Exception as e:
        return f"종목 {ticker} 데이터를 가져올 수 없습니다: {e}"

    if not data.get("price"):
        return f"종목 {ticker}에 대한 가격 정보를 찾을 수 없습니다."

    change_emoji = "📈" if data["change"] >= 0 else "📉"
    summary = (
        f"{change_emoji} **{data['name']}** ({data['ticker']})\n"
        f"- 현재가: **${data['price']:,.2f}**\n"
        f"- 전일 대비: {'+' if data['change'] >= 0 else ''}{data['change']:,.2f} "
        f"({'+' if data['changePercent'] >= 0 else ''}{data['changePercent']:.2f}%)\n"
        f"- 섹터: {data.get('sector', 'N/A')}\n"
        f"- 산업: {data.get('industry', 'N/A')}\n"
    )

    if data.get("marketCap"):
        cap = data["marketCap"]
        if cap >= 1e12:
            cap_str = f"${cap/1e12:.1f}T"
        elif cap >= 1e9:
            cap_str = f"${cap/1e9:.1f}B"
        else:
            cap_str = f"${cap/1e6:.0f}M"
        summary += f"- 시가총액: {cap_str}\n"

    if data.get("history") and len(data["history"]) >= 2:
        hist = data["history"]
        first_price = hist[0]["value"]
        last_price = hist[-1]["value"]
        period_change = ((last_price - first_price) / first_price * 100) if first_price else 0
        summary += f"- 6개월 수익률: {'+' if period_change >= 0 else ''}{period_change:.1f}%\n"
        summary += f"- 기간: {hist[0]['date']} ~ {hist[-1]['date']} ({len(hist)}일)\n"

    return summary


def _dedupe_freq_variants(results: list) -> list:
    """Remove frequency variants (D/M/W/Q/A prefix) keeping the best-frequency version.

    E.g. DCOILWTICO (daily) + MCOILWTICO (monthly) + WCOILWTICO (weekly)
    → keep only MCOILWTICO (monthly preferred).
    """
    FREQ_RANK = {'M': 0, 'Q': 1, 'A': 2, 'W': 3, 'D': 4}

    def _base(series_id: str) -> str:
        rid = series_id.upper()
        if len(rid) >= 2 and rid[0] in 'DMWQA' and rid[1].isupper():
            return rid[1:]
        return rid

    seen_bases: dict[str, object] = {}
    ordered_bases: list[str] = []

    for r in results:
        base = _base(r.id)
        if base not in seen_bases:
            seen_bases[base] = r
            ordered_bases.append(base)
        else:
            existing = seen_bases[base]
            existing_rank = FREQ_RANK.get(existing.id.upper()[0] if existing.id else 'Z', 5)
            new_rank = FREQ_RANK.get(r.id.upper()[0] if r.id else 'Z', 5)
            if new_rank < existing_rank:
                seen_bases[base] = r

    return [seen_bases[base] for base in ordered_bases]


@tool
async def search_fred_indicators(query: str) -> str:
    """MUST be called when the user asks to find, list, discover, or search for FRED indicators on a topic.

    CALL THIS TOOL whenever the user:
    - Asks "X 관련 지표 알려줘/찾아줘/뭐 있어?"
    - Wants to discover indicators for a topic (housing, mortgage, employment, etc.)
    - Uses words like: 찾아줘, 알려줘, 검색, 관련 지표, 어떤 지표, 추천

    DO NOT answer from memory. Always call this tool to search the real FRED database (800,000+ series).
    Results are automatically shown in the Watch panel as 5 slots: 2 sector + 2 macro + 1 risk.

    Args:
        query: 검색 쿼리 (한국어 또는 영어, 예: "부동산 대출 금리", "housing mortgage rate")
    """
    settings = get_settings()

    keyword_llm = ChatAnthropic(
        model="claude-haiku-4-5-20251001",
        anthropic_api_key=settings.ANTHROPIC_API_KEY,
        temperature=0,
        max_tokens=300,
    )

    # Step 1: Haiku generates 3-category plan: sector keyword + macro IDs + risk ID
    # Layout: 1 sector (commodity/asset price) + 3 macro + 1 risk = 5 slots
    keyword_prompt = (
        "For the given economic/stock query, return a JSON object with 3 fields.\n"
        "Return ONLY valid JSON. No explanation.\n\n"
        f"Query: {query}\n\n"
        "JSON format:\n"
        "{\n"
        '  "sector_keyword": "1 specific English FRED search term for the asset/commodity price most directly related to this query (e.g. \'uranium spot price\', \'gold price\', \'oil price\')",\n'
        '  "macro_ids": ["ID1", "ID2", "ID3"],\n'
        '  "risk_id": "ID"\n'
        "}\n\n"
        "Available macro_ids (pick exactly 3 most relevant to the query, prefer sector-specific ones):\n"
        "FEDFUNDS (기준금리), DGS10 (10년 국채), CPIAUCSL (CPI 인플레이션), UNRATE (실업률),\n"
        "PCE (PCE 소비지출), PAYEMS (비농업 고용), INDPRO (산업생산지수), HOUST (주택착공),\n"
        "RETAILSMNSA (소매판매), DGS2 (2년 국채)\n\n"
        "Available risk_id (pick exactly 1 — choose the most relevant fear/stress indicator):\n"
        "VIXCLS (VIX 공포지수), BAMLH0A0HYM2 (하이일드 스프레드), T10Y2Y (장단기 금리차),\n"
        "STLFSI4 (세인트루이스 금융스트레스지수), T10Y3M (10년-3개월 금리차)"
    )

    kw_response = await keyword_llm.ainvoke([HumanMessage(content=keyword_prompt)])
    kw_text = kw_response.content if isinstance(kw_response.content, str) else str(kw_response.content)

    json_match = re.search(r'\{.*?\}', kw_text, re.DOTALL)
    categories: dict = {}
    if json_match:
        try:
            categories = _json.loads(json_match.group())
        except Exception:
            pass

    sector_keyword: str = categories.get("sector_keyword", query)
    macro_ids: list[str] = categories.get("macro_ids", ["FEDFUNDS", "CPIAUCSL", "UNRATE"])
    risk_id: str = categories.get("risk_id", "VIXCLS")

    # Validate macro_ids and risk_id against curated, actively-updated series only
    ALLOWED_MACRO = {
        "FEDFUNDS",   # 기준금리 (월별, 계속 업데이트)
        "DGS10",      # 10년 국채 (일별)
        "CPIAUCSL",   # CPI 인플레이션 (월별)
        "UNRATE",     # 실업률 (월별)
        "PCE",        # PCE 소비지출 (월별)
        "PAYEMS",     # 비농업 고용 (월별)
        "INDPRO",     # 산업생산지수 (월별)
        "HOUST",      # 주택착공 (월별)
        "RETAILSMNSA",# 소매판매 (월별)
        "DGS2",       # 2년 국채 (일별)
    }
    ALLOWED_RISK = {
        "VIXCLS",        # VIX 공포지수 (일별)
        "BAMLH0A0HYM2",  # 하이일드 스프레드 (일별)
        "T10Y2Y",        # 장단기 금리차 (일별)
        "STLFSI4",       # 세인트루이스 금융스트레스 (주별, 현재 활성)
        "T10Y3M",        # 10년-3개월 금리차 (일별)
    }

    macro_ids = [m.upper() for m in macro_ids if m.upper() in ALLOWED_MACRO][:3]
    if len(macro_ids) < 3:
        macro_ids = (macro_ids + ["CPIAUCSL", "UNRATE", "FEDFUNDS"])[:3]
        macro_ids = list(dict.fromkeys(macro_ids))[:3]  # dedupe

    risk_id = risk_id.upper() if isinstance(risk_id, str) and risk_id.upper() in ALLOWED_RISK else "VIXCLS"

    # Step 2: Search FRED for 1 sector-specific keyword
    async def search_one(kw: str) -> list:
        try:
            return await fred_service.search_series(kw)
        except Exception:
            return []

    raw_results = await search_one(sector_keyword)

    # Deduplicate by exact ID, then by frequency variant, take top 1
    seen_ids: set[str] = set()
    raw_sector = []
    for r in raw_results:
        if r.id not in seen_ids:
            seen_ids.add(r.id)
            raw_sector.append(r)

    sector_top1 = _dedupe_freq_variants(raw_sector)[:1]

    # Fallback: if FRED returned nothing for the keyword, try a broader search
    if not sector_top1:
        fallback_results = await search_one("commodity price")
        seen_ids2: set[str] = set()
        raw_fallback = []
        for r in fallback_results:
            if r.id not in seen_ids2:
                seen_ids2.add(r.id)
                raw_fallback.append(r)
        sector_top1 = _dedupe_freq_variants(raw_fallback)[:1]

    # Last resort: use CPI as a universal fallback
    if not sector_top1:
        sector_top1 = [FredSeriesInfo(
            id="CPIAUCSL",
            title=FRED_TITLES_KO.get("CPIAUCSL", "소비자물가지수 (CPI)"),
            description="Consumer Price Index for All Urban Consumers",
            category="sector",
        )]

    # Step 3: Translate unknown sector title with Haiku
    unknown_sector = [r for r in sector_top1 if r.id.upper() not in FRED_TITLES_KO]
    translated: dict[str, str] = {}
    if unknown_sector:
        titles_text = "\n".join(f"{r.id}: {r.title}" for r in unknown_sector)
        translate_prompt = (
            "Translate the following FRED economic indicator titles into concise Korean (한국어).\n"
            "Return ONLY a JSON object: {\"SERIES_ID\": \"Korean title\", ...}. No explanation.\n\n"
            f"{titles_text}"
        )
        try:
            tr_response = await keyword_llm.ainvoke([HumanMessage(content=translate_prompt)])
            tr_text = tr_response.content if isinstance(tr_response.content, str) else str(tr_response.content)
            json_match2 = re.search(r'\{.*?\}', tr_text, re.DOTALL)
            if json_match2:
                translated = _json.loads(json_match2.group())
        except Exception:
            pass

    def _title(series_id: str, fallback: str) -> str:
        uid = series_id.upper()
        if uid in FRED_TITLES_KO:
            return FRED_TITLES_KO[uid]
        return translated.get(series_id, fallback)

    # Build 5 results: 1 sector + 3 macro + 1 risk
    sector_dicts = [
        {
            "id": r.id,
            "title": _title(r.id, r.title),
            "description": (r.description or "")[:120],
            "category": "sector",
        }
        for r in sector_top1
    ]

    macro_dicts = [
        {
            "id": mid,
            "title": FRED_TITLES_KO.get(mid, mid),
            "description": "",
            "category": "macro",
        }
        for mid in macro_ids
    ]

    risk_dict = {
        "id": risk_id,
        "title": FRED_TITLES_KO.get(risk_id, risk_id),
        "description": "",
        "category": "risk",
    }

    all_results = sector_dicts + macro_dicts + [risk_dict]

    return _json.dumps({
        "query": query,
        "keywords": [sector_keyword],
        "count": len(all_results),
        "results": all_results,
    }, ensure_ascii=False)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LangGraph Agent
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOOLS = [get_economic_data, get_stock_data_tool, search_fred_indicators]


class AgentState(BaseModel):
    """State passed through the LangGraph agent."""
    messages: Annotated[list[BaseMessage], add_messages] = Field(default_factory=list)
    logs: list[str] = Field(default_factory=list)
    series_data: dict[str, Any] | None = None


def _build_graph() -> StateGraph:
    """Build the LangGraph ReAct agent graph."""
    settings = get_settings()

    llm = ChatAnthropic(
        model=settings.LLM_MODEL,
        anthropic_api_key=settings.ANTHROPIC_API_KEY,
        temperature=settings.LLM_TEMPERATURE,
    )
    llm_with_tools = llm.bind_tools(TOOLS)

    # ── Nodes ─────────────────────────────────────────────────────

    async def agent_node(state: AgentState) -> dict:
        """Call the LLM with tools."""
        response = await llm_with_tools.ainvoke(state.messages)
        logs = list(state.logs)

        if response.tool_calls:
            for tc in response.tool_calls:
                logs.append(f"🔧 도구 호출: {tc['name']}({tc['args']})")
        else:
            logs.append("💬 응답 생성 완료")

        return {"messages": [response], "logs": logs}

    tool_node = ToolNode(TOOLS)

    async def tool_wrapper(state: AgentState) -> dict:
        """Wrap tool execution with logging."""
        logs = list(state.logs)
        last_msg = state.messages[-1]

        if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
            for tc in last_msg.tool_calls:
                tool_name = tc.get("name", "")
                if tool_name == "search_fred_indicators":
                    logs.append(f"🔍 FRED 지표 검색 중: {tc['args'].get('query', '')}...")
                elif tool_name == "get_economic_data":
                    logs.append(f"📡 FRED 데이터 조회 중: {tc['args'].get('series_id', 'unknown')}...")
                else:
                    logs.append(f"⚡ 도구 실행 중: {tool_name}...")

        result = await tool_node.ainvoke(state)

        # Capture fetched series data (only for get_economic_data)
        series_data = state.series_data
        if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
            for tc in last_msg.tool_calls:
                if tc.get("name") == "get_economic_data":
                    series_id = tc["args"].get("series_id", "")
                    if series_id:
                        data = await fred_service.get_series_data(series_id)
                        series_data = data.model_dump()
                        logs.append(f"✅ {series_id} 데이터 수신 완료 ({len(data.data)}개 포인트)")

        result["logs"] = logs
        result["series_data"] = series_data
        return result

    # ── Routing ───────────────────────────────────────────────────

    def should_continue(state: AgentState) -> str:
        last_msg = state.messages[-1]
        if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
            return "tools"
        return END

    # ── Build Graph ───────────────────────────────────────────────

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_wrapper)

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    return graph.compile()


# Compiled graph singleton
_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Session Memory
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_sessions: dict[str, list[BaseMessage]] = {}


def _get_session(session_id: str | None, locale: str = "ko") -> tuple[str, list[BaseMessage]]:
    """Get or create a session."""
    if session_id and session_id in _sessions:
        return session_id, _sessions[session_id]["messages"]

    new_id = session_id or f"SES-{uuid.uuid4().hex[:8].upper()}"
    _sessions[new_id] = {"messages": [], "locale": locale}
    return new_id, _sessions[new_id]["messages"]


def _init_session_messages(session_id: str, locale: str) -> None:
    """Ensure session has a system message with the right locale."""
    session = _sessions.get(session_id)
    if session and not session["messages"]:
        session["messages"].append(SystemMessage(content=_get_system_prompt(locale)))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Public API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def run_orchestrator(
    message: str,
    session_id: str | None = None,
    locale: str = "ko",
) -> ChatResponse:
    """Run the orchestrator agent and return structured response.

    Args:
        message: User message text.
        session_id: Optional session ID for conversation continuity.
        locale: Language preference — 'ko' (default) or 'en'.

    Returns:
        ChatResponse with message, logs, data_objects, and chart_data.
    """
    sid, history = _get_session(session_id, locale)
    _init_session_messages(sid, locale)
    graph = _get_graph()

    # Add user message to history
    history.append(HumanMessage(content=message))

    # Initial logs
    logs = [
        f"📥 사용자 입력 수신: \"{message}\"",
        "🧠 의도 분석 중...",
    ]

    # Run the graph
    initial_state = AgentState(
        messages=list(history),
        logs=logs,
    )

    result = await graph.ainvoke(initial_state)

    # Extract final AI response
    ai_messages = [m for m in result["messages"] if isinstance(m, AIMessage) and m.content]
    if ai_messages:
        raw = ai_messages[-1].content
        if isinstance(raw, list):
            final_text = "".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in raw
            )
        else:
            final_text = raw
    else:
        final_text = "응답을 생성할 수 없습니다."
    final_logs = result.get("logs", logs)

    # Update session history
    _sessions[sid] = result["messages"]

    # Build data_objects from any fetched series
    data_objects: list[FredSeriesInfo] = []
    chart_data: FredSeriesData | None = None
    series_data_raw = result.get("series_data")

    if series_data_raw:
        chart_data = FredSeriesData(**series_data_raw)
        data_objects.append(
            FredSeriesInfo(
                id=chart_data.id,
                title=chart_data.title,
                description=f"{chart_data.units} | {chart_data.frequency}",
            )
        )

    # Determine content type
    content_type = ContentType.CHART if chart_data else ContentType.TEXT

    return ChatResponse(
        message=ChatMessage(
            role=MessageRole.ASSISTANT,
            type=content_type,
            content=final_text,
            data=chart_data,
        ),
        sessionId=sid,
        logs=final_logs,
        data_objects=data_objects,
        chart_data=chart_data,
    )
