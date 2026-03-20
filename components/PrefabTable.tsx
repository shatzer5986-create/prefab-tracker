"use client";

import { PrefabItem } from "@/types";
import { TableWrapper, Th, Td, ActionButtons, tableStyle } from "./TableBits";

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getReadinessColor(status: string) {
  switch (status) {
    case "READY":
      return "#166534";
    case "COMPLETE":
      return "#1d4ed8";
    case "STAGED":
      return "#047857";
    case "BLOCKED":
      return "#991b1b";
    default:
      return "#475569";
  }
}

export default function PrefabTable({
  prefab,
  onEdit,
  onDelete,
  onStage,
}: {
  prefab: PrefabItem[];
  onEdit: (item: PrefabItem) => void;
  onDelete: (id: number) => void;
  onStage: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job</Th>
            <Th>Type</Th>
            <Th>Assembly</Th>
            <Th>Area</Th>
            <Th>Planned</Th>
            <Th>Built</Th>
            <Th>Progress</Th>
            <Th>Assigned</Th>
            <Th>Material Ready</Th>
            <Th>Status</Th>
            <Th>Readiness</Th>
            <Th>Missing</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {prefab.length > 0 ? (
            prefab.map((item: any) => {
              const qtyPlanned = Number(item.qtyPlanned) || 0;
              const qtyBuilt = Number(item.qtyBuilt) || 0;
              const progress =
                qtyPlanned > 0
                  ? `${Math.round((qtyBuilt / qtyPlanned) * 100)}%`
                  : "0%";

              const statusText = safeText(item.status);
              const isComplete = statusText === "Complete" || qtyBuilt >= qtyPlanned;
              const isStaged = statusText === "Staged";
              const isBlocked = item.blocked === true || item.materialReady === false;

              let readinessStatus = "READY";
              let missingText = "-";

              if (isComplete) {
                readinessStatus = "COMPLETE";
                missingText = "-";
              } else if (isStaged) {
                readinessStatus = "STAGED";
                missingText = "-";
              } else if (isBlocked) {
                readinessStatus = "BLOCKED";
                missingText = "Material not ready";
              }

              return (
                <tr key={Number(item.id)}>
                  <Td>{safeText(item.job) || "-"}</Td>
                  <Td>{safeText(item.type) || "-"}</Td>
                  <Td>{safeText(item.assembly) || "-"}</Td>
                  <Td>{safeText(item.area) || "-"}</Td>
                  <Td>{qtyPlanned}</Td>
                  <Td>{qtyBuilt}</Td>
                  <Td>{progress}</Td>
                  <Td>{safeText(item.assignedTo) || "-"}</Td>
                  <Td>
                    {isComplete || isStaged || !isBlocked ? "Yes" : "No"}
                  </Td>
                  <Td>{statusText || "-"}</Td>
                  <Td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: getReadinessColor(readinessStatus),
                      }}
                    >
                      {readinessStatus}
                    </span>
                  </Td>
                  <Td>{missingText}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <ActionButtons
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(Number(item.id))}
                      />

                      <button
                        type="button"
                        onClick={() => onStage(Number(item.id))}
                        disabled={isBlocked && !isStaged && !isComplete}
                        style={{
                          background:
                            isBlocked && !isStaged && !isComplete
                              ? "#94a3b8"
                              : "#047857",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          cursor:
                            isBlocked && !isStaged && !isComplete
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        Stage
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })
          ) : (
            <tr>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>No prefab rows found</Td>
            </tr>
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}