export interface ConceptBrief {
  code: string;
  name: string;
}

export interface StockInThemeOut {
  code: string;
  name: string;
  role_name: string;
  rank: number;
  concepts: ConceptBrief[];
}

export interface ThemeTreeOut {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  narrative: string | null;
  started_at: string;
  ended_at: string | null;
  children: ThemeTreeOut[];
  stocks: StockInThemeOut[];
}

export interface PublicThemesByDateResponse {
  date: string;
  timezone: string;
  themes: ThemeTreeOut[];
}

export interface ThemeRow {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  narrative: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface StockBulkItem {
  code: string;
  name: string;
  region?: string | null;
  region_secondary?: string | null;
  industry?: string | null;
  industry_secondary?: string | null;
  industry_segment?: string | null;
  concept_codes: string[];
  concepts: { code: string; name: string }[];
}

export interface StockBulkRequest {
  stocks: StockBulkItem[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
