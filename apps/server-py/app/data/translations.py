"""Korean translations for FRED series IDs.

Known series → 정적 번역 (빠름, 비용 없음)
Unknown series → 호출부에서 Haiku로 번역 (폴백)
"""

from __future__ import annotations

FRED_TITLES_KO: dict[str, str] = {
    # ── 국민계정 ─────────────────────────────────────────
    "GDP":          "국내총생산 (GDP)",
    "GDPC1":        "실질 GDP",
    "GDPPOT":       "잠재 GDP",
    "GDPDEF":       "GDP 디플레이터",
    "GDI":          "국내총소득 (GDI)",
    "A191RL1Q225SBEA": "실질 GDP 성장률",

    # ── 물가·인플레이션 ─────────────────────────────────
    "CPIAUCSL":     "소비자물가지수 (CPI)",
    "CPILFESL":     "근원 CPI (식품·에너지 제외)",
    "CPIENGSL":     "에너지 CPI",
    "CPIFABSL":     "식품·음료 CPI",
    "CPIHOSSL":     "주거비 CPI",
    "PCE":          "개인소비지출 (PCE)",
    "PCEPI":        "PCE 물가지수",
    "PCEPILFE":     "근원 PCE 물가지수",
    "T5YIFR":       "5년 기대 인플레이션",
    "T10YIE":       "10년 기대 인플레이션",
    "MICH":         "미시건대 인플레이션 기대",
    "PPIFIS":       "생산자물가지수 (PPI)",
    "PPIACO":       "원자재 PPI",

    # ── 노동시장 ─────────────────────────────────────────
    "UNRATE":       "실업률",
    "U6RATE":       "광의 실업률 (U-6)",
    "PAYEMS":       "비농업 고용",
    "ICSA":         "신규 실업수당 청구",
    "CCSA":         "연속 실업수당 청구건수",
    "CIVPART":      "경제활동참가율",
    "EMRATIO":      "고용-인구 비율",
    "AWHAETP":      "주평균 근로시간 (민간)",
    "CES0500000003": "민간 시간당 평균 임금",
    "LNS12300060":  "핵심 근로연령 고용률",
    "JOLTSJOL":     "구인 공석 (JOLTS)",
    "JOLTSQUL":     "자발적 이직자 수",
    "JTSHIL":       "채용 건수",

    # ── 통화정책 ─────────────────────────────────────────
    "FEDFUNDS":     "연방기금금리",
    "DFF":          "연방기금금리 (일별)",
    "DFEDTARL":     "연방기금금리 하단 목표",
    "DFEDTARU":     "연방기금금리 상단 목표",
    "M1SL":         "M1 통화량",
    "M2SL":         "M2 통화량",
    "BOGMBASE":     "본원통화 (화폐기반)",
    "WALCL":        "연준 총자산",
    "WTREGEN":      "연준 지급준비금",
    "RRPONTSYD":    "연준 역레포 잔액",

    # ── 금리·채권 ─────────────────────────────────────────
    "DGS1MO":       "미 국채 1개월 금리",
    "DGS3MO":       "미 국채 3개월 금리",
    "DGS6MO":       "미 국채 6개월 금리",
    "DGS1":         "미 국채 1년 금리",
    "DGS2":         "미 국채 2년 금리",
    "DGS5":         "미 국채 5년 금리",
    "DGS10":        "미 국채 10년 금리",
    "DGS30":        "미 국채 30년 금리",
    "T10Y2Y":       "장단기 금리차 (10년-2년)",
    "T10Y3M":       "장단기 금리차 (10년-3개월)",
    "T5YIEM":       "5년 손익분기 인플레이션",
    "BAMLH0A0HYM2": "하이일드 채권 스프레드",
    "BAMLC0A0CM":   "투자등급 회사채 스프레드",
    "DBAA":         "Baa 등급 회사채 금리",
    "DAAA":         "Aaa 등급 회사채 금리",
    "MORTGAGE30US": "30년 고정 모기지 금리",
    "MORTGAGE15US": "15년 고정 모기지 금리",
    "MORTGAGEPURCHASEINDEX": "모기지 구매 신청 지수",

    # ── 주식시장 ─────────────────────────────────────────
    "SP500":        "S&P 500",
    "NASDAQCOM":    "나스닥 종합지수",
    "DJIA":         "다우존스 산업평균 (DJIA)",
    "VIXCLS":       "VIX 변동성 지수 (공포지수)",
    "WILL5000IND":  "윌셔 5000 전체 시장 지수",

    # ── 원자재 ───────────────────────────────────────────
    "DCOILWTICO":   "WTI 원유 현물 가격",
    "DCOILBRENTEU": "브렌트유 현물 가격",
    "DHHNGSP":      "천연가스 헨리허브 가격",
    "GOLDAMGBD228NLBM": "금 현물 가격 (런던 오전)",
    "SLVPRUSD":     "은 현물 가격",

    # ── 주택시장 ─────────────────────────────────────────
    "HOUST":        "주택 착공 건수",
    "PERMIT":       "건축 허가 건수",
    "EXHOSLUSM495S":"기존주택 판매량",
    "HSN1F":        "신규주택 판매량",
    "CSUSHPISA":    "케이스-실러 주택가격지수",
    "MSPUS":        "신규주택 중위가격",
    "USHOWN":       "자가 보유율",

    # ── 소비·소득 ─────────────────────────────────────────
    "UMCSENT":      "미시건대 소비자심리지수",
    "CSCICP03USM665S": "컨퍼런스보드 소비자신뢰지수",
    "DSPIC96":      "실질 가처분소득",
    "PSAVERT":      "개인 저축률",
    "RSXFS":        "핵심 소매판매",
    "RSAFS":        "전체 소매판매",
    "TOTALSA":      "자동차 총 판매량",

    # ── 기업·생산 ─────────────────────────────────────────
    "INDPRO":       "산업생산지수",
    "TCU":          "제조업 가동률",
    "ISRATIO":      "재고/매출 비율",
    "DGORDER":      "내구재 주문",
    "AMTMNO":       "제조업 신규 주문",
    "BUSLOANS":     "기업 대출 잔액",
    "DPCREDIT":     "국내 민간 신용",

    # ── 대외·환율 ─────────────────────────────────────────
    "BOPGSTB":      "미국 무역수지",
    "DEXUSEU":      "달러/유로 환율",
    "DEXJPUS":      "엔/달러 환율",
    "DEXCHUS":      "위안/달러 환율",
    "DEXKOUS":      "원/달러 환율",
    "DTWEXBGS":     "달러 무역가중지수 (광의)",
    "DTWEXEMEGS":   "달러 무역가중지수 (신흥)",

    # ── 신용·금융 ─────────────────────────────────────────
    "DRSFRMACBS":   "모기지 연체율",
    "DRCCLACBS":    "신용카드 연체율",
    "STLFSI":       "세인트루이스 연준 금융스트레스지수",
    "NFCI":         "시카고 연준 금융여건지수",
}


def get_korean_title(series_id: str, fallback: str) -> str:
    """Known series ID → Korean title. Unknown → original English fallback."""
    return FRED_TITLES_KO.get(series_id.upper(), fallback)
