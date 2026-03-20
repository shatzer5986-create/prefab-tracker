"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { Material } from "@/types";

export default function AssemblyBomForm({
  materials,
  materialOptions,
  assemblyOptions,
  bomForm,
  setBomForm,
  editingAssemblyBomId,
  onSave,
  onCancel,
}: {
  materials: Material[];
  materialOptions: string[];
  assemblyOptions: { id: number; name: string }[];
  bomForm: {
    assemblyId: string;
    materialItem: string;
    qtyPerAssembly: string;
    unit: string;
  };
  setBomForm: React.Dispatch<
    React.SetStateAction<{
      assemblyId: string;
      materialItem: string;
      qtyPerAssembly: string;
      unit: string;
    }>
  >;
  editingAssemblyBomId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const dedupedMaterials = Array.from(new Set(materialOptions)).sort((a, b) =>
    a.localeCompare(b)
  );

  const selectedMaterial = materials.find((m) => m.item === bomForm.materialItem);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      style={{ display: "grid", gap: 16 }}
    >
      <div style={formGrid}>
        <InputBlock label="Assembly">
          <select
            value={bomForm.assemblyId}
            onChange={(e) =>
              setBomForm((prev) => ({
                ...prev,
                assemblyId: e.target.value,
              }))
            }
            style={inputStyle}
          >
            <option value="">Select assembly</option>
            {assemblyOptions.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
              </option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="Material">
          <>
            <input
              list="bom-material-options"
              value={bomForm.materialItem}
              onChange={(e) => {
                const selected = materials.find((m) => m.item === e.target.value);

                setBomForm((prev) => ({
                  ...prev,
                  materialItem: e.target.value,
                  unit: selected?.unit || prev.unit,
                }));
              }}
              style={inputStyle}
              placeholder="Select or type material"
            />
            <datalist id="bom-material-options">
              {dedupedMaterials.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </>
        </InputBlock>

        <InputBlock label="Qty Per Assembly">
          <input
            type="number"
            min="0"
            step="any"
            value={bomForm.qtyPerAssembly}
            onChange={(e) =>
              setBomForm((prev) => ({
                ...prev,
                qtyPerAssembly: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Unit">
          <input
            type="text"
            value={bomForm.unit}
            onChange={(e) =>
              setBomForm((prev) => ({
                ...prev,
                unit: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder={selectedMaterial?.unit || "ea"}
          />
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingAssemblyBomId !== null ? "Update BOM Item" : "Save BOM Item"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}