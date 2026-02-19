import type { FredSeriesInfo } from '../types/fred';

export const INDICATOR_CATEGORIES: Record<string, Omit<FredSeriesInfo, 'category'>[]> = {
  NATIONAL_ACCOUNTS: [
    { id: 'GDP', title: '국내총생산 (GDP)', description: '재화와 서비스의 시장 가치' },
    { id: 'GDPC1', title: '실질 GDP', description: '인플레이션 조정 GDP' },
  ],
  INFLATION_PRICES: [
    { id: 'CPIAUCSL', title: '소비자물가지수 (CPI)', description: '도시 소비자 물가 변동' },
    { id: 'PCE', title: 'PCE 물가지수', description: '개인소비지출 물가 변동' },
    { id: 'CPILFESL', title: '근원 CPI', description: '식품·에너지 제외 CPI' },
  ],
  LABOR_MARKET: [
    { id: 'UNRATE', title: '실업률', description: '노동력 대비 실업자 비율' },
    { id: 'PAYEMS', title: '비농업 고용', description: '비농업 부문 총 고용자 수' },
    { id: 'ICSA', title: '신규 실업수당 청구', description: '신규 실업보험 청구 건수' },
  ],
  MONETARY: [
    { id: 'FEDFUNDS', title: '연방기금금리', description: '미국 기준금리 (오버나이트)' },
    { id: 'M2SL', title: 'M2 통화량', description: '현금, 예금, 준화폐 포함' },
    { id: 'DGS10', title: '10년물 국채금리', description: '미 국채 10년 만기 수익률' },
  ],
  MARKETS: [
    { id: 'SP500', title: 'S&P 500', description: '미국 대형주 주가지수' },
    { id: 'VIXCLS', title: 'VIX 변동성 지수', description: '시장 공포 지수' },
    { id: 'DCOILWTICO', title: 'WTI 원유 가격', description: '서부 텍사스산 원유 현물 가격' },
  ]
};

export const MAJOR_INDICATORS: FredSeriesInfo[] = Object.entries(INDICATOR_CATEGORIES)
  .flatMap(([category, items]) =>
    items.map(item => ({ ...item, category }))
  );

export const SERIES_ID_MAP: Record<string, string> = {
  // 한국어 키워드
  '물가': 'CPIAUCSL',
  '인플레이션': 'CPIAUCSL',
  '소비자물가': 'CPIAUCSL',
  '실업률': 'UNRATE',
  '실업': 'UNRATE',
  '고용': 'PAYEMS',
  '일자리': 'PAYEMS',
  '금리': 'FEDFUNDS',
  '기준금리': 'FEDFUNDS',
  '이자율': 'FEDFUNDS',
  '국내총생산': 'GDP',
  '경제성장': 'GDP',
  '주식': 'SP500',
  '주가': 'SP500',
  '증시': 'SP500',
  '원유': 'DCOILWTICO',
  '유가': 'DCOILWTICO',
  '국채': 'DGS10',
  '통화량': 'M2SL',
  '변동성': 'VIXCLS',
  '공포지수': 'VIXCLS',
  // English keywords
  'inflation': 'CPIAUCSL',
  'cpi': 'CPIAUCSL',
  'unemployment': 'UNRATE',
  'jobs': 'UNRATE',
  'interest rate': 'FEDFUNDS',
  'fed rate': 'FEDFUNDS',
  'gdp': 'GDP',
  'stock market': 'SP500',
  's&p': 'SP500',
  'oil': 'DCOILWTICO',
  'treasury': 'DGS10',
};

export const CATEGORY_NAMES_KO: Record<string, string> = {
  NATIONAL_ACCOUNTS: '국민계정',
  INFLATION_PRICES: '물가·인플레이션',
  LABOR_MARKET: '노동시장',
  MONETARY: '통화·금리',
  MARKETS: '금융시장',
};

/** Quick lookup: series ID → Korean name */
export const INDICATOR_NAMES_KO: Record<string, string> = Object.fromEntries(
  MAJOR_INDICATORS.map((ind) => [ind.id, ind.title])
);

