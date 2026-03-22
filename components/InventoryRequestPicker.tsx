"use client";

import { useMemo } from "react";

type PickerItem = {
  id: number;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  status?: string;
  qtyAvailable?: number;
  searchText?: string;
};

export default function InventoryRequestPicker({
  label,
  searchValue,
  onSearchChange,
  items,
  onSelect,
  emptyMessage = "No matching items found.",
}: {
  label: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  emptyMessage?: string;
}) {
  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      (
        item.searchText ||
        `${item.title} ${item.subtitle || ""} ${item.meta || ""} ${item.badge || ""}`
      )
        .toLowerCase()
        .includes(query)
    );
  }, [items, searchValue]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 700,
          color: "#d1d5db",
        }}
      >
        {label}
      </label>

      <input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search inventory..."
        style={inputStyle}
      />

      <div style={pickerListStyle}>
        {filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>{emptyMessage}</div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              style={pickerButtonStyle}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {item.badge ? <span style={badgeStyle(item.badge)}>{item.badge}</span> : null}

                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5" }}>
                      {item.title}
                    </div>
                  </div>

                  <div style={statusPillStyle(item.status || "")}>{item.status || "-"}</div>
                </div>

                {item.subtitle ? (
                  <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.4 }}>
                    {item.subtitle}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 13,
                    color: "#a3a3a3",
                  }}
                >
                  <div>{item.meta || "-"}</div>
                  <div>Qty Available: {Number(item.qtyAvailable || 0)}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#121212",
  color: "#f5f5f5",
  fontSize: 14,
};

const pickerListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 420,
  overflowY: "auto",
  paddingRight: 4,
};

const pickerButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "1px solid #2f2f2f",
  borderRadius: 12,
  background: "#141414",
  padding: 14,
  cursor: "pointer",
};

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed #3a3a3a",
  borderRadius: 12,
  background: "#141414",
  padding: 16,
  color: "#a3a3a3",
  fontSize: 14,
};

function badgeStyle(badge: string): React.CSSProperties {
  const value = badge.toLowerCase();

  if (value === "vehicle") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#1e3a8a",
      color: "#dbeafe",
      border: "1px solid #2563eb",
    };
  }

  if (value === "trailer") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#14532d",
      color: "#dcfce7",
      border: "1px solid #166534",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#581c87",
    color: "#f3e8ff",
    border: "1px solid #7e22ce",
  };
}

function statusPillStyle(status: string): React.CSSProperties {
  const value = status.toLowerCase();

  if (value === "available" || value === "working") {
    return {
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#14532d",
      color: "#dcfce7",
      border: "1px solid #166534",
    };
  }

  if (value === "needs repair" || value === "damaged") {
    return {
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#7f1d1d",
      color: "#fecaca",
      border: "1px solid #991b1b",
    };
  }

  return {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#2a2a2a",
    color: "#d1d5db",
    border: "1px solid #3a3a3a",
  };
}