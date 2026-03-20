"use client";

import { JobRequest, RequestStatus } from "@/types";
import {
  TableWrapper,
  Th,
  Td,
  ActionButtons,
  tableStyle,
} from "@/components/TableBits";

export default function RequestsBoardTable({
  rows,
  onUpdateStatus,
  onStartRequest,
}: {
  rows: JobRequest[];
  onUpdateStatus: (id: number, status: RequestStatus) => void;
  onStartRequest?: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job #</Th>
            <Th>Type</Th>
            <Th>Item</Th>
            <Th>Qty</Th>
            <Th>Unit</Th>
            <Th>Requested By</Th>
            <Th>Request Date</Th>
            <Th>Needed By</Th>
            <Th>Status</Th>
            <Th>Workflow</Th>
            <Th>Description</Th>
            <Th>Notes</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={13}>No requests found.</Td>
            </tr>
          ) : (
            rows.map((row) => {
              const firstLine = row.lines?.[0];

              const typeText =
                row.lines?.map((line) => line.type).filter(Boolean).join(", ") || "-";

              const itemText =
                row.lines?.map((line) => line.itemName).filter(Boolean).join(", ") || "-";

              const qtyText =
                row.lines && row.lines.length > 0
                  ? row.lines.map((line) => Number(line.quantity ?? 0)).join(", ")
                  : "0";

              const unitText =
                row.lines?.map((line) => line.unit || "-").filter(Boolean).join(", ") || "-";

              const descriptionText =
                row.lines
                  ?.map((line) => line.description)
                  .filter(Boolean)
                  .join(" | ") || "-";

              return (
                <tr key={row.id}>
                  <Td>{row.jobNumber || "-"}</Td>
                  <Td>{typeText}</Td>
                  <Td>{itemText}</Td>
                  <Td>{qtyText}</Td>
                  <Td>{unitText}</Td>
                  <Td>{row.requestedBy || "-"}</Td>
                  <Td>{row.requestDate || "-"}</Td>
                  <Td>{row.neededBy || "-"}</Td>
                  <Td>{row.status}</Td>
                  <Td>{row.workflowStatus || "-"}</Td>
                  <Td>{descriptionText}</Td>
                  <Td>{row.notes || "-"}</Td>
                  <Td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <ActionButtons
                        onEdit={() => onUpdateStatus(row.id, "Approved")}
                        onDelete={() => onUpdateStatus(row.id, "Rejected")}
                      />

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(row.id, "Ordered")}
                          style={smallButtonStyle}
                        >
                          Ordered
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onStartRequest
                              ? onStartRequest(row.id)
                              : onUpdateStatus(row.id, "In Progress")
                          }
                          style={smallButtonStyle}
                        >
                          In Progress
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateStatus(row.id, "Complete")}
                          style={{ ...smallButtonStyle, background: "#166534" }}
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

const smallButtonStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};