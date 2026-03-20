export default function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2f2f2f",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#d1d5db",
          marginBottom: "8px",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#f97316",
        }}
      >
        {value}
      </div>
    </div>
  );
}