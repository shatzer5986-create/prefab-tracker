"use client";

import { useMemo } from "react";
import { RegularInventoryItem, MaterialMovementItem } from "@/types";

type HistoryRow = {
  id: string;
  job: string;
  materialName: string;
  qty: number;
  unit: string;
  date: string;
  vendor?: string;
  poNumber?: string;
  reference?: string;
  handledBy?: string;
  notes?: string;
  source?: string;
  eventType: "Receipt" | "Delivered to Site" | "Picked Up" | "Transferred";
};

export default function MaterialReceiptHistory({
  receipts = [],
  movements = [],
  jobFilter,
}: {
  receipts?: RegularInventoryItem[];
  movements?: MaterialMovementItem[];
  jobFilter?: string;
}) {
  const rows = useMemo(() => {
    const safeReceipts = Array.isArray(receipts) ? receipts : [];
    const safeMovements = Array.isArray(movements) ? movements : [];

    const filteredReceipts = jobFilter
      ? safeReceipts.filter((item) => item.job === jobFilter)
      : safeReceipts;

    const filteredMovements = jobFilter
      ? safeMovements.filter((item) => item.job === jobFilter)
      : safeMovements;

    const receiptRows: HistoryRow[] = filteredReceipts.map((item) => ({
      id: `receipt-${item.id}`,
      job: item.job,
      materialName: item.materialName,
      qty: Number(item.qty || 0),
      unit: item.unit || "",
      date: item.dateReceived || "",
      vendor: item.vendor || "",
      poNumber: item.poNumber || "",
      notes: item.notes || "",
      source: "Receipt",
      eventType: "Receipt",
    }));

    const movementRows: HistoryRow[] = filteredMovements.map((item) => ({
      id: `movement-${item.id}`,
      job: item.job,
      materialName: item.materialName,
      qty: Number(item.qty || 0),
      unit: item.unit || "",
      date: item.date || "",
      handledBy: item.handledBy || "",
      reference: item.reference || "",
      notes: item.notes || "",
      source: item.source || "Job Stock",
      eventType:
  item.movementType === "Transfer"
    ? "Transferred"
    : item.movementType === "Receive"
    ? "Receipt"
    : item.movementType === "Return"
    ? "Picked Up"
    : item.movementType === "Delivered to Site"
    ? "Delivered to Site"
    : "Transferred",
    }));

    return [...receiptRows, ...movementRows].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [receipts, movements, jobFilter]);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={th}>Date</th>
              <th style={th}>Type</th>
              <th style={th}>Source</th>
              <th style={th}>Job</th>
              <th style={th}>Material</th>
              <th style={th}>Qty</th>
              <th style={th}>Unit</th>
              <th style={th}>Vendor / Handled By</th>
              <th style={th}>PO / Ref</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={td} colSpan={10}>
                  No material history found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={td}>{row.date || "-"}</td>
                  <td style={td}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background:
                          row.eventType === "Receipt"
                            ? "#dcfce7"
                            : row.eventType === "Delivered to Site"
                            ? "#dbeafe"
                            : row.eventType === "Picked Up"
                            ? "#fef3c7"
                            : "#ede9fe",
                        color:
                          row.eventType === "Receipt"
                            ? "#166534"
                            : row.eventType === "Delivered to Site"
                            ? "#1d4ed8"
                            : row.eventType === "Picked Up"
                            ? "#92400e"
                            : "#6d28d9",
                      }}
                    >
                      {row.eventType}
                    </span>
                  </td>
                  <td style={td}>{row.source || "-"}</td>
                  <td style={td}>{row.job}</td>
                  <td style={td}>{row.materialName}</td>
                  <td style={td}>{row.qty}</td>
                  <td style={td}>{row.unit}</td>
                  <td style={td}>{row.vendor || row.handledBy || "-"}</td>
                  <td style={td}>{row.poNumber || row.reference || "-"}</td>
                  <td style={td}>{row.notes || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "13px",
  color: "#334155",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "14px",
  color: "#0f172a",
  verticalAlign: "top",
};