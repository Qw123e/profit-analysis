"use client";

import { useState, useMemo } from "react";

interface CheckboxFilterListProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxHeight?: number;
  height?: number | string;
  showSearch?: boolean;
  showSelectAll?: boolean;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
};

const searchInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  outline: "none",
  backgroundColor: "#f8fafc",
  color: "#334155",
};

const listContainerStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  overflowY: "auto",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  cursor: "pointer",
  transition: "background-color 0.15s",
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: 4,
  border: "1px solid #cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.15s",
};

const checkboxCheckedStyle: React.CSSProperties = {
  ...checkboxStyle,
  backgroundColor: "#3b82f6",
  borderColor: "#3b82f6",
};

const selectAllStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 0",
  fontSize: 12,
  color: "#64748b",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#3b82f6",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
};

export function CheckboxFilterList({
  label,
  options,
  selected,
  onChange,
  maxHeight = 200,
  height,
  showSearch = true,
  showSelectAll = true,
}: CheckboxFilterListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    onChange([...filteredOptions]);
  };

  const handleDeselectAll = () => {
    // 검색 결과 중에서 선택된 것만 해제
    const filteredSet = new Set(filteredOptions);
    onChange(selected.filter((s) => !filteredSet.has(s)));
  };

  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => selected.includes(opt));

  const rootStyle: React.CSSProperties = height
    ? { ...containerStyle, height, minHeight: 0, overflow: "hidden" }
    : containerStyle;

  const listStyle: React.CSSProperties = height
    ? { ...listContainerStyle, flex: 1, minHeight: 0, height: "auto", maxHeight: "none" }
    : { ...listContainerStyle, maxHeight, height: maxHeight };

  return (
    <div style={rootStyle}>
      <div style={labelStyle}>{label}</div>

      {showSearch && options.length > 5 && (
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      )}

      {showSelectAll && filteredOptions.length > 0 && (
        <div style={selectAllStyle}>
          <span>
            {selected.length}개 선택됨 / {options.length}개
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={linkButtonStyle}
              disabled={allSelected}
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              style={linkButtonStyle}
              disabled={selected.length === 0}
            >
              전체 해제
            </button>
          </div>
        </div>
      )}

      <div style={listStyle}>
        {filteredOptions.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            {searchTerm ? "검색 결과가 없습니다" : "항목이 없습니다"}
          </div>
        ) : (
          filteredOptions.map((option) => {
            const isChecked = selected.includes(option);
            return (
              <div
                key={option}
                style={{
                  ...itemStyle,
                  backgroundColor: isChecked ? "#f0f9ff" : "transparent",
                }}
                onClick={() => handleToggle(option)}
                onMouseEnter={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isChecked
                    ? "#f0f9ff"
                    : "transparent";
                }}
              >
                <div style={isChecked ? checkboxCheckedStyle : checkboxStyle}>
                  {isChecked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 5L4 7L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: isChecked ? "#1e40af" : "#475569",
                    fontWeight: isChecked ? 500 : 400,
                  }}
                >
                  {option}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
