interface KpiGridProps {
  children: React.ReactNode;
  columns?: number;
}

export function KpiGrid({ children, columns = 4 }: KpiGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 12,
      marginBottom: 16
    }}>
      {children}
    </div>
  );
}
