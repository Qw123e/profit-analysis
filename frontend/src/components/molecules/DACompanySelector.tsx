"use client";

interface DACompanySelectorProps {
  companyCodes: string[];
  selectedCompany: string | undefined;
  onChange: (companyCode: string | undefined) => void;
}

const COMPANY_CODE_LABELS: Record<string, string> = {
  "1700": "1700 (NBT)",
  "1400": "1400 (BIO)",
};

export function DACompanySelector({ companyCodes, selectedCompany, onChange }: DACompanySelectorProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>회사</span>
      {companyCodes.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: selectedCompany === code ? "1px solid #2563eb" : "1px solid #e2e8f0",
            background: selectedCompany === code ? "#2563eb" : "#f8fafc",
            color: selectedCompany === code ? "#ffffff" : "#475569",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {COMPANY_CODE_LABELS[code] ?? code}
        </button>
      ))}
    </div>
  );
}
