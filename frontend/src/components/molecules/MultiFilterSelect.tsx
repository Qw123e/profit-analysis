import { useMemo, useState } from "react";

interface MultiFilterSelectProps {
  label: string;
  values: string[];
  options?: string[];
  onChange: (values: string[]) => void;
  variant?: "dark" | "light";
}

export function MultiFilterSelect({ label, values, options, onChange, variant = "light" }: MultiFilterSelectProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const filteredOptions = useMemo(() => {
    const base = options ?? [];
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const displayValue = values.length > 0 ? values.join(", ") : "";

  const styles = variant === "dark"
    ? {
        inputBg: "#0f172a",
        inputBorder: "#1e293b",
        inputColor: "#e2e8f0",
        dropdownBg: "#0f172a",
        dropdownBorder: "#1e293b",
        hoverBg: "#1e293b",
        selectedBg: "#1f2a44",
        borderColor: "#1e293b",
        checkboxBg: "#0f172a",
        checkboxChecked: "#3b82f6",
        focusRing: "0 0 0 2px rgba(59, 130, 246, 0.35)",
        labelColor: "#94a3b8"
      }
    : {
        inputBg: "#f8fafc",
        inputBorder: "#e2e8f0",
        inputColor: "#334155",
        dropdownBg: "#ffffff",
        dropdownBorder: "#e2e8f0",
        hoverBg: "#f1f5f9",
        selectedBg: "#e0edff",
        borderColor: "#e2e8f0",
        checkboxBg: "#f8fafc",
        checkboxChecked: "#3b82f6",
        focusRing: "0 0 0 2px rgba(59, 130, 246, 0.25)",
        labelColor: "#64748b"
      };

  const toggleValue = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: styles.labelColor, marginBottom: 6 }}>
        {label}
      </div>
      <input
        type="text"
        value={isFocused ? query : displayValue}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setShowDropdown(true);
          setQuery("");
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            setShowDropdown(false);
            setQuery("");
          }, 200);
        }}
        placeholder={values.length > 0 ? `${values.length}개 선택됨 - 검색하여 추가/제거` : "검색 또는 선택 (복수 선택 가능)"}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${isFocused ? "#3b82f6" : styles.inputBorder}`,
          background: styles.inputBg,
          color: styles.inputColor,
          outline: "none",
          boxShadow: isFocused ? styles.focusRing : "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease"
        }}
      />
      {showDropdown && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            maxHeight: 250,
            overflowY: "auto",
            background: styles.dropdownBg,
            border: `1px solid ${styles.dropdownBorder}`,
            borderRadius: 10,
            zIndex: 10,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)"
          }}
        >
          <div
            onClick={() => onChange([])}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              borderBottom: `1px solid ${styles.borderColor}`,
              background: values.length === 0 ? styles.selectedBg : styles.dropdownBg,
              fontWeight: 600,
              color: styles.inputColor
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = values.length === 0 ? styles.selectedBg : styles.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = values.length === 0 ? styles.selectedBg : styles.dropdownBg)}
          >
            전체
          </div>
          {filteredOptions.map((opt) => {
            const isSelected = values.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggleValue(opt)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: isSelected ? styles.selectedBg : styles.dropdownBg,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isSelected ? styles.selectedBg : styles.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? styles.selectedBg : styles.dropdownBg)}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `2px solid ${isSelected ? styles.checkboxChecked : styles.inputBorder}`,
                  background: isSelected ? styles.checkboxChecked : styles.checkboxBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
