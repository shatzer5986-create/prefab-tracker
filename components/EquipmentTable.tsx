"use client";

import { useMemo, useState } from "react";
import type { EquipmentItem } from "@/types";

export default function EquipmentTable({
  rows,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  rows: EquipmentItem[];
  onEdit?: (row: EquipmentItem) => void;
  onDelete?: (id: number) => void;
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("All Assignments");

  const assignedToOptions = useMemo(() => {
    const assignments = rows
      .map((row) => buildAssignedToDisplay(row))
      .filter((value) => value && value !== "-");

    return [
      "All Assignments",
      ...Array.from(new Set(assignments)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const assignedToDisplay = buildAssignedToDisplay(row);
      const locationLabel = buildLocationLabel(row);

      const matchesAssignedTo =
        assignedToFilter === "All Assignments" ||
        assignedToDisplay === assignedToFilter;

      const matchesSearch =
        !term ||
        [
          row.assetType,
          row.assetNumber,
          row.jobNumber,
          row.assignedTo,
          row.assignmentType,
          row.toolRoomLocation,
          assignedToDisplay,
          locationLabel,
          row.driverProject,
          row.year,
          row.manufacturer,
          row.model,
          row.modelNumber,
          row.description,
          row.category,
          row.itemNumber,
          row.barcode,
          row.serialNumber,
          row.licensePlate,
          row.vinSerial,
          row.engineSerialNumber,
          row.ein,
          row.gvwr,
          row.indexNumber,
          row.status,
          row.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return matchesAssignedTo && matchesSearch;
    });
  }, [rows, search, assignedToFilter]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
        />

        <select
          value={assignedToFilter}
          onChange={(e) => setAssignedToFilter(e.target.value)}
          style={filterSelectStyle}
        >
          {assignedToOptions.map((assignment) => (
            <option key={assignment} value={assignment}>
              {assignment}
            </option>
          ))}
        </select>

        <div style={{ fontSize: 13, color: "#a3a3a3" }}>
          Showing {filteredRows.length} of {rows.length}
        </div>
      </div>

      <div style={cardListStyle}>
        {filteredRows.length === 0 ? (
          <div style={emptyStateStyle}>No assets found.</div>
        ) : (
          filteredRows.map((row) => (
            <div key={row.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>
                    {row.assetNumber || row.description || "Asset"}
                  </div>
                  <div style={{ fontSize: 13, color: "#d1d5db" }}>
                    {row.assetType} • {row.manufacturer || "-"}
                    {row.model ? ` • ${row.model}` : ""}
                    {row.serialNumber ? ` • SN: ${row.serialNumber}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={assetTypeBadgeStyle}>{row.assetType}</span>
                  <span style={assignmentBadgeStyle(row.assignmentType)}>
                    {row.assignmentType || "-"}
                  </span>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      background: row.status === "Damaged" ? "#7f1d1d" : "#14532d",
                      color: row.status === "Damaged" ? "#fecaca" : "#dcfce7",
                      border:
                        row.status === "Damaged"
                          ? "1px solid #991b1b"
                          : "1px solid #166534",
                    }}
                  >
                    {row.status || "-"}
                  </span>
                </div>
              </div>

              <div style={detailsGridStyle}>
                <Detail label="Assigned To" value={buildAssignedToDisplay(row)} />
                <Detail label="Job#" value={row.assignmentType === "Job" ? row.jobNumber : "-"} />
                <Detail label="Location" value={buildLocationLabel(row)} />
                <Detail label="Driver / Project" value={row.driverProject} />
                <Detail label="Year" value={row.year} />
                <Detail label="Manufacturer" value={row.manufacturer} />
                <Detail label="Model" value={row.model} />
                <Detail label="Model #" value={row.modelNumber} />
                <Detail label="Item Number" value={row.itemNumber} />
                <Detail label="Barcode" value={row.barcode} />
                <Detail label="License Plate" value={row.licensePlate} />
                <Detail label="VIN / Serial" value={row.vinSerial} />
                <Detail label="Engine Serial #" value={row.engineSerialNumber} />
                <Detail label="EIN" value={row.ein} />
                <Detail label="GVWR" value={row.gvwr} />
                <Detail label="Samsara" value={row.samsara} />
                <Detail label="Powered" value={row.powered} />
                <Detail label="Transfer Date In" value={row.transferDateIn} />
                <Detail label="Transfer Date Out" value={row.transferDateOut} />
              </div>

              {!!row.notes && (
                <div
                  style={{
                    background: "#141414",
                    border: "1px solid #2f2f2f",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 14,
                    color: "#d1d5db",
                  }}
                >
                  <strong>Notes:</strong> {row.notes}
                </div>
              )}

              {!readOnly && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => onEdit?.(row)} style={editButtonStyle}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(row.id)}
                    style={deleteButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildAssignedToDisplay(row: EquipmentItem) {
  if (row.assignmentType === "Person") {
    return row.assignedTo || "-";
  }

  if (row.assignmentType === "Job") {
    return row.jobNumber || "-";
  }

  if (
    row.assignmentType === "Tool Room" ||
    row.assignmentType === "Shop" ||
    row.assignmentType === "Yard" ||
    row.assignmentType === "WH1" ||
    row.assignmentType === "WH2"
  ) {
    return row.toolRoomLocation || row.assignmentType;
  }

  return "-";
}

function buildLocationLabel(row: EquipmentItem) {
  if (
    row.assignmentType === "Tool Room" ||
    row.assignmentType === "Shop" ||
    row.assignmentType === "Yard" ||
    row.assignmentType === "WH1" ||
    row.assignmentType === "WH2"
  ) {
    return row.toolRoomLocation || row.assignmentType;
  }

  return "-";
}

function assignmentBadgeStyle(
  assignmentType: EquipmentItem["assignmentType"]
): React.CSSProperties {
  switch (assignmentType) {
    case "Person":
      return badgeStyle("#7c2d12", "#fed7aa", "#c2410c");
    case "Job":
      return badgeStyle("#2a2a2a", "#f5f5f5", "#3a3a3a");
    case "Tool Room":
      return badgeStyle("#9a3412", "#ffedd5", "#ea580c");
    case "Shop":
      return badgeStyle("#14532d", "#dcfce7", "#166534");
    case "Yard":
      return badgeStyle("#4a044e", "#f5d0fe", "#86198f");
    case "WH1":
    case "WH2":
      return badgeStyle("#312e81", "#e0e7ff", "#4338ca");
    default:
      return badgeStyle("#2a2a2a", "#d1d5db", "#3a3a3a");
  }
}

const assetTypeBadgeStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#9a3412",
  color: "#ffedd5",
  border: "1px solid #ea580c",
};

function badgeStyle(
  background: string,
  color: string,
  border: string
): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background,
    color,
    border: `1px solid ${border}`,
  };
}

function Detail({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #2f2f2f",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f5" }}>{value || "-"}</div>
    </div>
  );
}

const searchInputStyle: React.CSSProperties = {
  minWidth: 260,
  flex: 1,
  maxWidth: 420,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#121212",
  color: "#f5f5f5",
  fontSize: 14,
};

const filterSelectStyle: React.CSSProperties = {
  minWidth: 190,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#121212",
  color: "#f5f5f5",
  fontSize: 14,
};

const cardListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const emptyStateStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2f2f2f",
  borderRadius: 14,
  padding: 18,
  color: "#a3a3a3",
};

const editButtonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const deleteButtonStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "white",
  border: "1px solid #991b1b",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};