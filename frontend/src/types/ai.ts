export interface AIInsightRequest {
  snapshot_date?: string;
  year?: string;
  quarter?: string;
  customer?: string;
  product?: string;
  form_type?: string;
  function?: string;
  biz_unit?: string;
  company_code?: string;
  evaluation_class?: string;
  business_area?: string;
  sales_country?: string;
  procurement_type?: string;
  distribution_channel?: string;
  distribution_channel_detail?: string;
  food_type?: string;
  period_start?: number;
  period_end?: number;
}

export interface KeyInsight {
  title: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
  urgency: "high" | "medium" | "low";
}

export interface Risk {
  risk: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
}

export interface Opportunity {
  opportunity: string;
  potential_impact: string;
}

export interface ActionItem {
  action: string;
  owner: string;
  timeline: string;
  priority: "즉시" | "이번주" | "이번달";
}

export interface AIInsightResponse {
  model: string;
  executive_summary: string;
  key_insights: KeyInsight[];
  risks: Risk[];
  opportunities: Opportunity[];
  action_items: ActionItem[];
  outlook: string;
  raw?: string | null;
}
