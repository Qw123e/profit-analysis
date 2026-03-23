export interface PerformanceValue {
  name: string;
  sales: number;
  contributionProfit: number;
  operatingProfit: number;
  opm: number;
  evaluationClass: string;
  salesRatio?: number;
}

export interface GroupValue {
  name: string;
  value: number;
}

export interface TrendPoint {
  name: string;
  sales: number;
  op: number;
}

export interface TrendData {
  categories: string[];
  sales: number[];
  opMargin: number[];
  salesRange: [number, number];
  marginRange: [number, number];
}

export interface MatrixPoint {
  name: string;
  sales: number;
  opm: number;
  operatingProfit: number;
}

export interface MatrixData {
  points: MatrixPoint[];
  salesThreshold: number;
  opmThreshold: number;
  quadrants: Record<"HH" | "HL" | "LH" | "LL", MatrixPoint[]>;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function sortPerformanceBySales(values: PerformanceValue[]): PerformanceValue[] {
  return [...values].sort((a, b) => b.sales - a.sales);
}

export function sortPerformanceByOperatingProfit(values: PerformanceValue[]): PerformanceValue[] {
  return [...values].sort((a, b) => b.operatingProfit - a.operatingProfit);
}

export function sortGroupValues(values: GroupValue[]): GroupValue[] {
  return [...values].sort((a, b) => b.value - a.value);
}

export function buildTrendData(periods: TrendPoint[]): TrendData | null {
  if (periods.length === 0) return null;

  const withMargin = periods.map((item) => ({
    name: item.name,
    sales: item.sales,
    opMargin: item.sales > 0 ? round1((item.op / item.sales) * 100) : 0
  }));

  const maxSales = Math.max(...withMargin.map((item) => item.sales), 1);
  const maxMargin = Math.max(...withMargin.map((item) => item.opMargin), 1);
  const minMargin = Math.min(...withMargin.map((item) => item.opMargin), 0);
  const marginSpan = maxMargin - minMargin || 1;

  return {
    categories: withMargin.map((item) => item.name),
    sales: withMargin.map((item) => item.sales),
    opMargin: withMargin.map((item) => item.opMargin),
    salesRange: [0, maxSales * 2],
    marginRange: [round1(minMargin - marginSpan * 2), round1(maxMargin + marginSpan * 0.3)]
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function buildMatrixData(values: PerformanceValue[]): MatrixData | null {
  if (values.length === 0) return null;

  const points: MatrixPoint[] = values.map((item) => ({
    name: item.name,
    sales: item.sales / 100_000_000,
    opm: item.opm,
    operatingProfit: item.operatingProfit / 100_000_000
  }));

  const salesThreshold = median(points.map((p) => p.sales));
  const opmThreshold = median(points.map((p) => p.opm));

  const quadrants: Record<"HH" | "HL" | "LH" | "LL", MatrixPoint[]> = {
    HH: [],
    HL: [],
    LH: [],
    LL: []
  };

  points.forEach((point) => {
    const salesHigh = point.sales >= salesThreshold;
    const opHigh = point.opm >= opmThreshold;
    const key = `${salesHigh ? "H" : "L"}${opHigh ? "H" : "L"}` as "HH" | "HL" | "LH" | "LL";
    quadrants[key].push(point);
  });

  return { points, salesThreshold, opmThreshold, quadrants };
}

export function buildTreemapData(values: GroupValue[]): Array<{ name: string; size: number; fill: string }> {
  const colors = [
    "#5FB8C7", "#D64933", "#6B6B6B", "#B89AA8", "#3498DB",
    "#E67E22", "#7F8C8D", "#2980B9", "#E74C3C", "#34495E",
    "#D68A7A", "#5D6D7E", "#2874A6", "#D35400", "#1F618D"
  ];
  return values
    .filter((item) => item.value > 0)
    .slice(0, 18)
    .map((item, idx) => ({
      name: item.name,
      size: Math.round(item.value / 100_000_000),
      fill: colors[idx % colors.length]
    }));
}
