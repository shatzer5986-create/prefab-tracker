"use client";

import { Material, PrefabItem } from "@/types";
import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, formGrid } from "./TableBits";

type AllocationFormState = {
  materialId: string;
  prefabId: string;
  qty: string;
};

export default function JobMaterialAllocationForm({
  materials,
  prefabItems,
  form,
  setForm,
  onAllocate,
}: {
  materials: Material[];
  prefabItems: PrefabItem[];
  form: AllocationFormState;
  setForm: React.Dispatch<React.SetStateAction<AllocationFormState>>;
  onAllocate: () => void;
}) {
  const selectedMaterial = materials.find(
    (m) => Number(m.id) === Number(form.materialId)
  );

  const availableQty = selectedMaterial
    ? Math.max(
        Number(selectedMaterial.receivedQty || 0) -
          Number(selectedMaterial.allocatedQty || 0),
        0
      )
    : 0;

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={formGrid}>
        <InputBlock label="Material">
          <select
            value={form.materialId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, materialId: e.target.value }))
            }
            style={inputStyle}
          >
            <option value="">Select material</option>
            {materials.map((material) => {
              const available = Math.max(
                Number(material.receivedQty || 0) -
                  Number(material.allocatedQty || 0),
                0
              );

              return (
                <option key={material.id} value={material.id}>
                  {material.item} ({available} {material.unit} available)
                </option>
              );
            })}
          </select>
        </InputBlock>

        <InputBlock label="Prefab Item">
          <select
            value={form.prefabId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, prefabId: e.target.value }))
            }
            style={inputStyle}
          >
            <option value="">Select prefab item</option>
            {prefabItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.assembly} — {item.area}
              </option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="Qty to Allocate">
          <input
            type="number"
            min={0}
            max={availableQty}
            value={form.qty}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, qty: e.target.value }))
            }
            style={inputStyle}
          />
        </InputBlock>
      </div>

      {selectedMaterial && (
        <div
          style={{
            padding: "12px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#f8fafc",
            color: "#334155",
          }}
        >
          Available to allocate: <strong>{availableQty}</strong>{" "}
          {selectedMaterial.unit}
        </div>
      )}

      <div>
        <button onClick={onAllocate} style={buttonStyle}>
          Allocate Material
        </button>
      </div>
    </div>
  );
}