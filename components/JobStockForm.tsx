"use client";

import React from "react";
import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";

type JobStockFormState = {
  materialName: string;
  description: string;
  unit: string;
  quantity: string;
  vendor: string;
  poNumber: string;
  location: string;
  status: string;
};

export default function JobStockForm({
  form,
  setForm,
  editingId,
  onSave,
  onCancel,
  materialOptions,
}: {
  form: JobStockFormState;
  setForm: React.Dispatch<React.SetStateAction<JobStockFormState>>;
  editingId: number | null;
  onSave: () => void;
  onCancel: () => void;
  materialOptions: {
    id: number;
    name: string;
    category?: string;
    defaultUnit?: string;
    defaultVendor?: string;
    description?: string;
  }[];
}) {

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={formGrid}>
        <InputBlock label="Material Name">
  <select
    value={form.materialName}
    onChange={(e) => {
      const selectedName = e.target.value;
      const selectedMaterial = materialOptions.find(
        (item) => item.name === selectedName
      );

      setForm((prev) => ({
        ...prev,
        materialName: selectedName,
        description: selectedMaterial?.description || prev.description,
        unit: selectedMaterial?.defaultUnit || prev.unit,
        vendor: selectedMaterial?.defaultVendor || prev.vendor,
      }));
    }}
    style={inputStyle}
  >
    <option value="">Select material...</option>
    {materialOptions.map((item) => (
      <option key={item.id} value={item.name}>
        {item.name}
      </option>
    ))}
  </select>
</InputBlock>

        <InputBlock label="Description">
          <input
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Unit">
          <input
            value={form.unit}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, unit: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Quantity">
          <input
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, quantity: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Vendor">
          <input
            value={form.vendor}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vendor: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="PO Number">
          <input
            value={form.poNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, poNumber: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Location">
          <input
            value={form.location}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, location: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Status">
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value }))
            }
            style={inputStyle}
          >
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="received">Received</option>
            <option value="prefab">Prefab</option>
            <option value="delivered">Delivered</option>
            <option value="installed">Installed</option>
          </select>
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingId ? "Update Job Stock" : "Add Job Stock"}
        </button>

        {editingId ? (
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}