export interface DataPoint {
  date: string;
  value: number;
}

export interface FredSeriesData {
  id: string;
  title: string;
  units: string;
  frequency: string;
  data: DataPoint[];
  lastUpdated: string;
}

export interface FredSeriesInfo {
  id: string;
  title: string;
  description: string;
  category?: string;
}

export interface FredApiResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: Array<{
    realtime_start: string;
    realtime_end: string;
    date: string;
    value: string;
  }>;
}

export interface FredSeriesInfoResponse {
  realtime_start: string;
  realtime_end: string;
  seriess: Array<{
    id: string;
    realtime_start: string;
    realtime_end: string;
    title: string;
    observation_start: string;
    observation_end: string;
    frequency: string;
    frequency_short: string;
    units: string;
    units_short: string;
    seasonal_adjustment: string;
    seasonal_adjustment_short: string;
    last_updated: string;
    popularity: number;
    notes: string;
  }>;
}
