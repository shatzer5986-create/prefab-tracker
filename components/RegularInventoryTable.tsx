"use client";

import React from "react";
import { RegularInventoryItem } from "@/types";
import { buttonStyle } from "./TableBits";

type Props = {
  rows: RegularInventoryItem[];
  onDelete: (id: number) => void;
};

export default function RegularInventoryTable({ rows, onDelete }: Props) {
  if (!rows?.length) {
    return <div style={{ color: "#64748b" }}>No regular inventory yet.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Job</th>
            <th style={thStyle}>Material</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>PO</th>
            <th style={thStyle}>Vendor</th>
            <th style={thStyle}>Date Received</th>
            <th style={thStyle}>Notes</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={tdStyle}>{row.job}</td>
              <td style={tdStyle}>{row.materialName}</td>
              <td style={tdStyle}>{row.qty}</td>
              <td style={tdStyle}>{row.unit}</td>
              <td style={tdStyle}>{row.poNumber || ""}</td>
              <td style={tdStyle}>{row.vendor || ""}</td>
              <td style={tdStyle}>{row.dateReceived || ""}</td>
              <td style={tdStyle}>{row.notes || ""}</td>
              <td style={tdStyle}>
                <button
                  onClick={() => onDelete(row.id)}
                  style={{ ...buttonStyle, background: "#7f1d1d" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontWeight: 700,
  fontSize: "14px",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "14px",
};