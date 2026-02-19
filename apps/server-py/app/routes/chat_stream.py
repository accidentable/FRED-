"""SSE streaming chat endpoint — POST /api/chat/stream.

Streams AI responses as Server-Sent Events for real-time terminal output.
Event types: token, tool_call, tool_result, done, error
"""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.models import ChatRequest
from app.services.orchestrator import (
    _get_graph,
    _sessions,
    SYSTEM_PROMPT_KO,
    SYSTEM_PROMPT_EN,
)

router = APIRouter(prefix="/api/chat", tags=["chat-stream"])


def _extract_text(content) -> str:
    """Extract text from Claude's content (can be str or list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content) if content else ""


def _strip_json_blocks(new_text: str, accumulated: str) -> str:
    """Remove ```json ... ``` code blocks that Claude emits as pre-tool planning text.
    Works by checking if the accumulated buffer is inside a code fence and suppressing
    tokens until the fence closes.
    """
    combined = accumulated + new_text
    import re as _re
    # Remove complete ```json ... ``` blocks
    cleaned = _re.sub(r'```json[\s\S]*?```', '', combined)
    # If the combined buffer has an OPEN fence with no closing (block still streaming),
    # suppress the new token entirely
    open_fence = _re.search(r'```(?:json)?[^`]*$', combined)
    if open_fence:
        return ''
    # Return only the newly added clean characters
    prev_cleaned = _re.sub(r'```json[\s\S]*?```', '', accumulated)
    delta = cleaned[len(prev_cleaned):]
    return delta

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream AI responses as SSE events."""

    session_id = request.sessionId or str(uuid.uuid4())
    locale = request.locale or "ko"
    system_prompt = SYSTEM_PROMPT_KO if locale == "ko" else SYSTEM_PROMPT_EN

    # Get or create session
    if session_id not in _sessions:
        _sessions[session_id] = [SystemMessage(content=system_prompt)]

    history = _sessions[session_id]
    history.append(HumanMessage(content=request.message))

    # Build portfolio context string (injected into AI only, not saved to history)
    portfolio_prefix = ""
    if request.portfolio:
        lines = []
        for h in request.portfolio:
            line = f"  - {h.ticker}: {h.quantity:g}주 보유"
            if h.avgPrice:
                line += f" (평균단가 ${h.avgPrice:,.2f})"
            lines.append(line)
        portfolio_prefix = (
            "[사용자 포트폴리오]\n"
            + "\n".join(lines)
            + "\n\n"
            "위 포트폴리오를 반드시 참고하여 분석하세요. "
            "보유 종목과의 연관성, 리스크/기회 요인을 구체적으로 언급하세요.\n\n"
        )

    async def event_generator():
        """Generate SSE events from the LangGraph agent."""
        try:
            compiled = _get_graph()

            full_response = ""
            full_buffer = ""   # raw accumulated text for JSON-block filtering
            logs: list[str] = []

            # Limit context: SystemMessage + last 6 messages (3 exchanges max)
            # Prevents the model from mixing topics from far-back history
            MAX_HISTORY = 6
            system_msgs = history[:1]
            recent_msgs = list(history[1:])
            if len(recent_msgs) > MAX_HISTORY:
                recent_msgs = recent_msgs[-MAX_HISTORY:]
                # Ensure slice starts with HumanMessage (not AIMessage)
                while recent_msgs and not isinstance(recent_msgs[0], HumanMessage):
                    recent_msgs = recent_msgs[1:]
            messages_to_send = list(system_msgs + recent_msgs)

            # Inject portfolio context into the last HumanMessage (AI-only, not persisted)
            if portfolio_prefix and messages_to_send and isinstance(messages_to_send[-1], HumanMessage):
                last = messages_to_send[-1]
                messages_to_send[-1] = HumanMessage(
                    content=portfolio_prefix + last.content
                )

            async for event in compiled.astream_events(
                {"messages": messages_to_send, "logs": []},
                version="v2",
            ):
                kind = event.get("event", "")
                name = event.get("name", "")
                data = event.get("data", {})

                # Token streaming from LLM
                if kind == "on_chat_model_stream":
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        text = _extract_text(chunk.content)
                        if text:
                            full_response += text
                            yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

                # Tool call started
                elif kind == "on_tool_start":
                    tool_input = data.get("input", {})
                    log_msg = f"TOOL_CALL: {name}({json.dumps(tool_input, ensure_ascii=False)})"
                    logs.append(log_msg)
                    # Reset buffer so pre-tool JSON text doesn't bleed into post-tool filtering
                    full_buffer = ""
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool': name, 'input': tool_input})}\n\n"

                # Tool call finished
                elif kind == "on_tool_end":
                    output = data.get("output", "")
                    if hasattr(output, "content"):
                        output = _extract_text(output.content)

                    if name == "search_fred_indicators":
                        try:
                            result_data = json.loads(str(output))
                            keywords = result_data.get("keywords", [])
                            count = result_data.get("count", 0)
                            results = result_data.get("results", [])
                            top5 = results[:5]
                            yield f"data: {json.dumps({'type': 'fred_search_results', 'indicators': top5, 'keywords': keywords, 'count': count})}\n\n"
                        except (json.JSONDecodeError, KeyError, TypeError):
                            pass

                    log_msg = f"TOOL_RESULT: {name} -> {str(output)[:200]}"
                    logs.append(log_msg)
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool': name, 'result': str(output)[:500]})}\n\n"

            # Save AI response to session history so next turn has proper context
            if full_response:
                history.append(AIMessage(content=full_response))

            # Done — send final event with session info
            yield f"data: {json.dumps({'type': 'done', 'sessionId': session_id, 'logs': logs})}\n\n"

        except Exception as e:
            # Remove the last HumanMessage on error to avoid corrupted session state
            if history and isinstance(history[-1], HumanMessage):
                history.pop()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
