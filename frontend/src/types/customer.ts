export type GroupValue = {
  name: string;
  value: number;
};

export type FilterOptions = {
  years: string[];
  quarters: string[];
  countries: string[];
  customers: string[];
  groups: string[];
  eval_classes: string[];
  products: string[];
};

export type AggregateRequest = {
  feed_key?: string;
  snapshot_date?: string;
  years?: string[];
  quarters?: string[];
  countries?: string[];
  customers?: string[];
  groups?: string[];
  eval_classes?: string[];
  products?: string[];
};

export type AggregateResponse = {
  dashboardKey: string;
  feedKey: string;
  snapshotDate: string;
  totalSales: number;
  totalCM: number;
  totalOP: number;
  totalSGA: number;
  opMargin: number;
  sgaRatio: number;
  byPeriod: GroupValue[];
  topCustomers: GroupValue[];
  topProducts: GroupValue[];
  byCountry: GroupValue[];
  periodScaleLabel: string;
};
