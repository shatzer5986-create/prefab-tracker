"use client";

import InputBlock, { inputStyle } from "@/components/InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "@/components/TableBits";
import type { RequestType } from "@/types";

export type RequestFormState = {
  jobNumber: string;
  type: RequestType;
  requestedBy: string;
  neededBy: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
  inventoryItemId: number | null;
  inventorySnapshot: string;
  lines: never[];
};

export default function RequestForm({
  title,
  requestType,
  form,
  setForm,
  onSave,
  onCancel,
  hideType = false,
  itemSuggestions = [],
}: {
  title: string;
  requestType: RequestType;
  form: RequestFormState;
  setForm: React.Dispatch<React.SetStateAction<RequestFormState>>;
  onSave: () => void;
  onCancel: () => void;
  hideType?: boolean;
  itemSuggestions?: string[];
}) {
  const datalistId = `${requestType.toLowerCase()}-request-items`;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        background: "#1a1a1a",
        border: "1px solid #2f2f2f",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5" }}>{title}</div>

      <div style={formGrid}>
        {!hideType && (
          <InputBlock label="Type">
            <input value={requestType} readOnly style={darkInputStyle} />
          </InputBlock>
        )}

        <InputBlock label="Requested By">
          <input
            value={form.requestedBy}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, requestedBy: e.target.value }))
            }
            style={darkInputStyle}
          />
        </InputBlock>

        <InputBlock label="Needed By">
          <input
            type="date"
            value={form.neededBy}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, neededBy: e.target.value }))
            }
            style={darkInputStyle}
          />
        </InputBlock>

        <InputBlock label="Item Name">
          <>
            <input
              list={itemSuggestions.length ? datalistId : undefined}
              value={form.itemName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, itemName: e.target.value }))
              }
              placeholder={
                itemSuggestions.length
                  ? `Start typing a ${requestType.toLowerCase()}...`
                  : "Enter item name"
              }
              style={darkInputStyle}
            />
            {itemSuggestions.length > 0 && (
              <datalist id={datalistId}>
                {itemSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
          </>
        </InputBlock>

        <InputBlock label="Quantity">
          <input
            type="number"
            min="0"
            step="1"
            value={String(form.quantity ?? "")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                quantity: Number(e.target.value) || 0,
              }))
            }
            style={darkInputStyle}
          />
        </InputBlock>

        <InputBlock label="Unit">
          <input
            value={form.unit}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, unit: e.target.value }))
            }
            style={darkInputStyle}
          />
        </InputBlock>

        <InputBlock label="Description">
          <input
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            style={darkInputStyle}
          />
        </InputBlock>

        <InputBlock label="Notes">
          <input
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            style={darkInputStyle}
          />
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          Submit Request
        </button>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const darkInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#121212",
  color: "#f5f5f5",
  border: "1px solid #3a3a3a",
};