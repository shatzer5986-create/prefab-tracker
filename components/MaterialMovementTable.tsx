"use client";

import { MaterialMovementItem } from "@/types";

export default function MaterialMovementTable({
  rows = [],
}: {
  rows?: MaterialMovementItem[];
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Job</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Material</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Movement Type</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Handled By</th>
            <th style={thStyle}>Reference</th>
            <th style={thStyle}>Notes</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={emptyTdStyle}>
                No material movements found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{row.job || "-"}</td>
                <td style={tdStyle}>{row.source || "Job Stock"}</td>
                <td style={tdStyle}>{row.materialName || "-"}</td>
                <td style={tdStyle}>{row.qty ?? 0}</td>
                <td style={tdStyle}>{row.unit || "-"}</td>
                <td style={tdStyle}>{row.movementType || "-"}</td>
                <td style={tdStyle}>{row.date || "-"}</td>
                <td style={tdStyle}>{row.handledBy || "-"}</td>
                <td style={tdStyle}>{row.reference || "-"}</td>
                <td style={tdStyle}>{row.notes || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 700,
  color: "#475569",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#0f172a",
  verticalAlign: "top",
};

const emptyTdStyle: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#64748b",
};