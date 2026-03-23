import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface FilterPanelProps {
  children: React.ReactNode;
  onReset?: () => void;
  showResetButton?: boolean;
}

export function FilterPanel({ children, onReset, showResetButton = true }: FilterPanelProps) {
  return (
    <div style={{ ...cardStyle, marginBottom: 16 }}>
      <h3 style={titleStyle}>필터</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {children}
        {showResetButton && onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              alignSelf: 'flex-end',
              padding: '8px 16px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              cursor: 'pointer',
              height: 40
            }}
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
