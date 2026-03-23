export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message = "데이터 업데이트 중..." }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(11, 18, 32, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(2px)"
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        background: "#1e293b",
        padding: "32px 48px",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      }}>
        <svg
          width={48}
          height={48}
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
            stroke="#3b82f6"
            strokeWidth="4"
            strokeDasharray="31.415, 31.415"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ fontSize: 16, color: "#e8eefc", fontWeight: 500 }}>
          {message}
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes rotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    </div>
  );
}
