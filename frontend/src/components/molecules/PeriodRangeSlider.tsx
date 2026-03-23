interface PeriodRangeSliderProps {
  minPeriod: number;
  maxPeriod: number;
  startValue: number;
  endValue: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
}

export function PeriodRangeSlider({
  minPeriod,
  maxPeriod,
  startValue,
  endValue,
  onStartChange,
  onEndChange
}: PeriodRangeSliderProps) {
  const rangeSpan = maxPeriod - minPeriod || 1;

  const formatPeriod = (period: number) => {
    const str = String(period);
    if (str.length === 6) {
      return `${str.substring(0, 4)}-${str.substring(4, 6)}`;
    }
    return str;
  };

  return (
    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>기간 범위 (월별)</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        <span style={{ color: "#1e293b" }}>{formatPeriod(startValue)}</span>
        <span style={{ color: "#1e293b" }}>{formatPeriod(endValue)}</span>
      </div>
      <div style={{ position: "relative", height: 40, marginBottom: 8 }}>
        {/* Background track */}
        <div style={{ position: "absolute", top: 17, left: 0, right: 0, height: 6, background: "#e2e8f0", borderRadius: 999 }} />

        {/* Active range */}
        <div
          style={{
            position: "absolute",
            top: 17,
            left: `${((startValue - minPeriod) / rangeSpan) * 100}%`,
            right: `${100 - ((endValue - minPeriod) / rangeSpan) * 100}%`,
            height: 6,
            background: "#3b82f6",
            borderRadius: 999
          }}
        />

        {/* Start slider */}
        <input
          type="range"
          min={minPeriod}
          max={maxPeriod}
          value={startValue}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val <= endValue) {
              onStartChange(val);
            }
          }}
          style={{
            position: "absolute",
            width: "100%",
            top: 0,
            pointerEvents: "none",
            appearance: "none",
            background: "transparent",
            WebkitAppearance: "none",
            height: 40
          }}
          className="range-slider-thumb"
        />

        {/* End slider */}
        <input
          type="range"
          min={minPeriod}
          max={maxPeriod}
          value={endValue}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= startValue) {
              onEndChange(val);
            }
          }}
          style={{
            position: "absolute",
            width: "100%",
            top: 0,
            pointerEvents: "none",
            appearance: "none",
            background: "transparent",
            WebkitAppearance: "none",
            height: 40
          }}
          className="range-slider-thumb"
        />

        <style jsx>{`
          .range-slider-thumb::-webkit-slider-thumb {
            appearance: none;
            pointer-events: all;
            width: 18px;
            height: 18px;
            background: #3b82f6;
            border: 2px solid #ffffff;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .range-slider-thumb::-moz-range-thumb {
            pointer-events: all;
            width: 18px;
            height: 18px;
            background: #3b82f6;
            border: 2px solid #ffffff;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
        `}</style>
      </div>
    </div>
  );
}
