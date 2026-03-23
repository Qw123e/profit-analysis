import React from "react";

import { DataTable } from "@/components/molecules/DataTable";
import { numberFormat } from "@/utils/snapshotTransformers";

export function DetailDataTable({
  data,
  customers
}: {
  data: Array<{ name: string; sales: number; op: number }>;
  customers: Array<{ name: string; value: number }>;
}) {
  const detailRows = data.flatMap(period =>
    customers.slice(0, 5).map(customer => ({
      period: period.name,
      customer: customer.name,
      sales: customer.value / data.length,
      op: (customer.value / data.length) * (period.op / period.sales),
      opMargin: period.sales > 0 ? (period.op / period.sales) * 100 : 0
    }))
  );

  return (
    <DataTable
      columns={["기간", "고객사", "매출", "영업이익", "이익률(%)"]}
      rows={detailRows.map((row) => [
        row.period,
        row.customer,
        `${numberFormat(Math.round(row.sales / 100_000_000))} 억원`,
        `${numberFormat(Math.round(row.op / 100_000_000))} 억원`,
        `${row.opMargin.toFixed(2)}%`
      ])}
      pageSize={6}
      title="상세 데이터 (Detail Data)"
      meta="단위: 억원, %"
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5h18M3 12h18M3 19h18"
            stroke="#64748b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    />
  );
}
