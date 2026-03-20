import React from "react";

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        overflowX: "auto",
        background: "#141414",
        border: "1px solid #2f2f2f",
        borderRadius: "12px",
      }}
    >
      {children}
    </div>
  );
}

export function Th({
  children,
  ...props
}: React.PropsWithChildren<React.ThHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <th
      {...props}
      style={{
        textAlign: "left",
        padding: "10px",
        borderBottom: "1px solid #e2e8f0",
        fontSize: "14px",
        color: "#475569",
        whiteSpace: "nowrap",
        ...(props.style || {}),
      }}
    >
      {children}
    </th>
  );
}
export function Td({
  children,
  ...props
}: React.PropsWithChildren<React.TdHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <td
      {...props}
      style={{
        padding: "10px",
        borderBottom: "1px solid #f1f5f9",
        fontSize: "14px",
        verticalAlign: "top",
        ...(props.style || {}),
      }}
    >
      {children}
    </td>
  );
}

export function ActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button type="button" onClick={onEdit} style={smallButtonStyle}>
        Edit
      </button>

      <button
        type="button"
        onClick={onDelete}
        style={{ ...smallButtonStyle, background: "#7f1d1d", border: "1px solid #991b1b" }}
      >
        Delete
      </button>
    </div>
  );
}

export const buttonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: "8px",
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
};

export const secondaryButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: "8px",
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
};

export const smallButtonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: "6px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

export const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#141414",
};

export const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};