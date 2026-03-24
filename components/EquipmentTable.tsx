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
  const [assetTypeFilter, setAssetTypeFilter] = useState("All Asset Types");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [assignedToFilter, setAssignedToFilter] = useState("All Assignments");
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState("All Types");

  const assetTypeOptions = useMemo(() => {
    const values = rows
      .map((row) => String(row.assetType || "").trim())
      .filter(Boolean);

    return [
      "All Asset Types",
      ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const values = rows
      .map((row) => String(row.category || "").trim())
      .filter(Boolean);

    return [
      "All Categories",
      ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [rows]);

  const assignedToOptions = useMemo(() => {
    const values = rows
      .map((row) => buildAssignedToDisplay(row))
      .filter((value) => value && value !== "-");

    return [
      "All Assignments",
      ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [rows]);

  const assignmentTypeOptions = useMemo(() => {
    const values = rows
      .map((row) => String(row.assignmentType || "").trim())
      .filter(Boolean);

    return [
      "All Types",
      ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const assignedToDisplay = buildAssignedToDisplay(row);
      const relatedJobLabel = buildRelatedJobLabel(row);
      const locationLabel = buildLocationLabel(row);

      const matchesAssetType =
        assetTypeFilter === "All Asset Types" || row.assetType === assetTypeFilter;

      const matchesCategory =
        categoryFilter === "All Categories" || row.category === categoryFilter;

      const matchesAssignedTo =
        assignedToFilter === "All Assignments" ||
        assignedToDisplay === assignedToFilter;

      const matchesAssignmentType =
        assignmentTypeFilter === "All Types" ||
        row.assignmentType === assignmentTypeFilter;

      const matchesSearch =
        !term ||
        [
          row.assetType,
          row.assetNumber,
          row.category,
          row.description,
          row.manufacturer,
          row.model,
          row.modelNumber,
          row.itemNumber,
          row.barcode,
          row.serialNumber,
          row.licensePlate,
          row.vinSerial,
          row.jobNumber,
          row.assignedTo,
          row.assignmentType,
          row.toolRoomLocation,
          row.driverProject,
          row.notes,
          row.status,
          assignedToDisplay,
          relatedJobLabel,
          locationLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return (
        matchesAssetType &&
        matchesCategory &&
        matchesAssignedTo &&
        matchesAssignmentType &&
        matchesSearch
      );
    });
  }, [
    rows,
    search,
    assetTypeFilter,
    categoryFilter,
    assignedToFilter,
    assignmentTypeFilter,
  ]);

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
          value={assetTypeFilter}
          onChange={(e) => setAssetTypeFilter(e.target.value)}
          style={filterSelectStyle}
        >
          {assetTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={filterSelectStyle}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={assignmentTypeFilter}
          onChange={(e) => setAssignmentTypeFilter(e.target.value)}
          style={filterSelectStyle}
        >
          {assignmentTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={assignedToFilter}
          onChange={(e) => setAssignedToFilter(e.target.value)}
          style={filterSelectStyle}
        >
          {assignedToOptions.map((option) => (
            <option key={option} value={option}>
              {option}
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
                    {row.assetNumber || row.description || row.model || row.assetType || "Asset"}
                  </div>

                  <div style={{ fontSize: 13, color: "#d1d5db" }}>
                    {[
                      row.assetType,
                      row.manufacturer,
                      row.model,
                      row.modelNumber,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "-"}
                  </div>

                  <div style={{ fontSize: 13, color: "#a3a3a3" }}>
                    {buildSummaryLine(row)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={assignmentBadgeStyle(row.assignmentType)}>
                    {row.assignmentType || "-"}
                  </span>

                  <div
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
                  </div>
                </div>
              </div>

              <div style={detailsGridStyle}>
                <Detail label="Asset Type" value={row.assetType} />
                <Detail label="Category" value={row.category} />
                <Detail label="Asset Number" value={row.assetNumber} />
                <Detail label="Description" value={row.description} />
                <Detail label="Qty" value={String(row.quantityAvailable ?? 0)} />
                <Detail label="Assigned To" value={buildAssignedToDisplay(row)} />
                <Detail label="Related Job" value={buildRelatedJobLabel(row)} />
                <Detail label="Location" value={buildLocationLabel(row)} />
                <Detail label="License Plate" value={row.licensePlate} />
                <Detail label="VIN / Serial" value={row.vinSerial || row.serialNumber} />
                <Detail label="Driver / Project" value={row.driverProject} />
                <Detail label="Transfer Date In" value={row.transferDateIn} />
                <Detail label="Transfer Date Out" value={row.transferDateOut} />
                <Detail label="Notes" value={row.notes} />
              </div>

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

function buildRelatedJobLabel(row: EquipmentItem) {
  if (row.assignmentType === "Person") {
    return row.jobNumber || "-";
  }

  if (row.assignmentType === "Job") {
    return row.jobNumber || "-";
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

function buildSummaryLine(row: EquipmentItem) {
  if (row.assignmentType === "Person") {
    if (row.assignedTo && row.jobNumber) {
      return `${row.assignedTo} • Job ${row.jobNumber}`;
    }
    return row.assignedTo || "-";
  }

  if (row.assignmentType === "Job") {
    return row.jobNumber ? `Job ${row.jobNumber}` : "-";
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

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
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