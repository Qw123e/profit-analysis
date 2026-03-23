export interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  message?: string;
}

export function LoadingSpinner({ size = 40, color = "#3b82f6", message = "로딩 중..." }: LoadingSpinnerProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 40,
      minHeight: 300
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        style={{
          animation: "rotate 1s linear infinite"
        }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="31.415, 31.415"
          strokeLinecap="round"
        />
      </svg>
      {message && (
        <div style={{ fontSize: 14, color: "#94a3b8" }}>
          {message}
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}
