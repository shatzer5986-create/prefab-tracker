"use client";

import type {
  JobRequest,
  RequestStatus,
  JobRequestLine,
} from "@/types";

export default function RequestsTable({
  rows,
  onUpdateStatus,
  readOnly = false,
}: {
  rows: JobRequest[];
  onUpdateStatus?: (id: number, status: RequestStatus) => void;
  readOnly?: boolean;
}) {
  if (!rows.length) {
    return <div style={emptyStateStyle}>No requests found.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => {
        const lines = Array.isArray(row.lines) ? row.lines : [];
        const fallbackLine = buildLegacyLine(row);
        const displayLines = lines.length ? lines : [fallbackLine];

        return (
          <div key={row.id} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                  {displayLines.length === 1
                    ? displayLines[0].itemName || "Request"
                    : `${displayLines.length} line items`}
                </div>

                <div style={{ fontSize: 14, color: "#d1d5db" }}>
                  {buildFlowLabel(row)}
                </div>
              </div>

              <div style={statusBadgeStyle(row.status)}>{row.status}</div>
            </div>

            <div style={detailsGridStyle}>
              <Detail label="Request Date" value={row.requestDate} />
              <Detail label="Needed By" value={row.neededBy} />
              <Detail label="Requested By" value={row.requestedBy} />
              <Detail label="Destination Type" value={row.destinationType || "Job"} />
              <Detail label="Destination" value={buildDestinationLabel(row)} />
              <Detail label="Job#" value={row.jobNumber || "-"} />
              <Detail label="Requested For" value={row.requestedForPerson || "-"} />
              <Detail label="From" value={row.fromLocation || "-"} />
              <Detail label="To" value={row.toLocation || "-"} />
              <Detail label="Workflow" value={row.workflowStatus || "-"} />
              <Detail label="Pick Ticket" value={row.pickTicketNumber || "-"} />
              <Detail label="Transfer Ticket" value={row.transferTicketNumber || "-"} />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {displayLines.map((line) => (
                <RequestLineCard key={line.id} line={line} />
              ))}
            </div>

            {!!row.notes && (
              <div style={noteBoxStyle}>
                <strong>Notes:</strong> {row.notes}
              </div>
            )}

            {!readOnly && onUpdateStatus ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={smallActionButtonStyle}
                  onClick={() => onUpdateStatus(row.id, "Approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  style={smallActionButtonStyle}
                  onClick={() => onUpdateStatus(row.id, "In Progress")}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  style={{
                    ...smallActionButtonStyle,
                    background: "#166534",
                    border: "1px solid #15803d",
                  }}
                  onClick={() => onUpdateStatus(row.id, "Complete")}
                >
                  Complete
                </button>
                <button
                  type="button"
                  style={{
                    ...smallActionButtonStyle,
                    background: "#7f1d1d",
                    border: "1px solid #991b1b",
                  }}
                  onClick={() => onUpdateStatus(row.id, "Rejected")}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function buildLegacyLine(row: JobRequest): JobRequestLine {
  return {
    id: row.id,
    type: (row as any).type || "Material",
    category: "",
    itemName: (row as any).itemName || "Request",
    description: (row as any).description || "",
    quantity: Number((row as any).quantity || 0),
    unit: (row as any).unit || "",
    inventoryItemId:
      typeof (row as any).inventoryItemId === "number"
        ? (row as any).inventoryItemId
        : null,
    inventorySnapshot: (row as any).inventorySnapshot || "",
  };
}

function buildDestinationLabel(row: JobRequest) {
  if (row.destinationType === "Person") {
    return row.requestedForPerson || row.toLocation || "-";
  }

  if (row.destinationType === "General") {
    return row.toLocation || row.jobNumber || row.requestedForPerson || "-";
  }

  return row.jobNumber || row.toLocation || row.requestedForPerson || "-";
}

function buildFlowLabel(row: JobRequest) {
  const flow = row.requestFlow || "";
  const from = row.fromLocation || "";
  const to = buildDestinationLabel(row);

  if (flow && from && to) {
    return `${flow} • ${from} → ${to}`;
  }

  if (flow && to) {
    return `${flow} • To ${to}`;
  }

  if (flow && from) {
    return `${flow} • From ${from}`;
  }

  if (row.destinationType === "Person" && row.requestedForPerson) {
    return `Person Request • ${row.requestedForPerson}`;
  }

  if (row.jobNumber) {
    return `Job Request • ${row.jobNumber}`;
  }

  return "Request";
}

function RequestLineCard({ line }: { line: JobRequestLine }) {
  return (
    <div style={lineCardStyle}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 700, color: "#f5f5f5" }}>
          {line.itemName || "Item"}
        </div>

        <div style={{ fontSize: 14, color: "#d1d5db" }}>
          {[
            line.type,
            line.category,
            line.quantity || line.quantity === 0
              ? `Qty ${line.quantity}${line.unit ? ` ${line.unit}` : ""}`
              : "",
          ]
            .filter(Boolean)
            .join(" • ")}
        </div>

        {!!line.description && (
          <div style={{ fontSize: 13, color: "#a3a3a3" }}>{line.description}</div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailCardStyle}>
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f5" }}>{value || "-"}</div>
    </div>
  );
}

function statusBadgeStyle(status: RequestStatus): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background:
      status === "Complete"
        ? "#14532d"
        : status === "Rejected"
        ? "#7f1d1d"
        : status === "Approved"
        ? "#1e3a8a"
        : status === "Ordered"
        ? "#78350f"
        : status === "In Progress"
        ? "#312e81"
        : "#2a2a2a",
    color:
      status === "Complete"
        ? "#dcfce7"
        : status === "Rejected"
        ? "#fecaca"
        : status === "Approved"
        ? "#dbeafe"
        : status === "Ordered"
        ? "#fde68a"
        : status === "In Progress"
        ? "#e0e7ff"
        : "#d1d5db",
    border:
      status === "Complete"
        ? "1px solid #166534"
        : status === "Rejected"
        ? "1px solid #991b1b"
        : status === "Approved"
        ? "1px solid #2563eb"
        : status === "Ordered"
        ? "1px solid #92400e"
        : status === "In Progress"
        ? "1px solid #4338ca"
        : "1px solid #3a3a3a",
  };
}

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 14,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const detailCardStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: 10,
};

const lineCardStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: "10px 12px",
};

const noteBoxStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2f2f2f",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#d1d5db",
};

const emptyStateStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 18,
  color: "#a3a3a3",
};

const smallActionButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};