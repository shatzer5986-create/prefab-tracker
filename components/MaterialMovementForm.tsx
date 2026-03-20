"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { MaterialMovementType } from "@/types";

type MaterialOption = {
  id: number | null;
  name: string;
  unit: string;
  vendor: string;
  poNumber: string;
  job: string;
  qtyAvailable: number;
  label: string;
};

type MaterialMovementFormState = {
  job: string;
  source: "Job Stock" | "Prefab Material";
  materialId: number | null;
  materialName: string;
  qty: string;
  unit: string;
  movementType: MaterialMovementType;
  date: string;
  handledBy: string;
  reference: string;
  notes: string;
};

export default function MaterialMovementForm({
  form,
  setForm,
  jobOptions,
  materialOptions,
  onSave,
}: {
  form: MaterialMovementFormState;
  setForm: React.Dispatch<React.SetStateAction<MaterialMovementFormState>>;
  jobOptions: string[];
  materialOptions: MaterialOption[];
  onSave: () => void;
}) {
  const filteredOptions = materialOptions.filter((option) => {
    const searchText = form.materialName.trim().toLowerCase();
    if (!searchText) return true;

    return (
      option.name.toLowerCase().includes(searchText) ||
      option.label.toLowerCase().includes(searchText) ||
      option.vendor.toLowerCase().includes(searchText) ||
      option.poNumber.toLowerCase().includes(searchText)
    );
  });

  const selectedOptionValue =
    form.materialName && form.unit
      ? `${form.job}__${form.materialName}__${form.unit}`
      : "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      style={{ display: "grid", gap: 16 }}
    >
      <div style={formGrid}>
        <InputBlock label="Job">
          <select
            value={form.job}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                job: e.target.value,
                materialId: null,
                materialName: "",
                unit: "",
              }))
            }
            style={inputStyle}
          >
            <option value="">Select job</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="Source">
          <select
            value={form.source}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                source: e.target.value as "Job Stock" | "Prefab Material",
                materialId: null,
                materialName: "",
                unit: "",
              }))
            }
            style={inputStyle}
          >
            <option value="Job Stock">Job Stock</option>
            <option value="Prefab Material">Prefab Material</option>
          </select>
        </InputBlock>

        <InputBlock label="Search Material">
          <input
            type="text"
            placeholder="Search available stock..."
            value={form.materialName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                materialName: e.target.value,
                materialId: null,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Select Available Material">
          <select
            value={selectedOptionValue}
            onChange={(e) => {
              const selectedValue = e.target.value;

              const selected = materialOptions.find(
                (option) =>
                  `${option.job}__${option.name}__${option.unit}` === selectedValue
              );

              if (!selected) {
                setForm((prev) => ({
                  ...prev,
                  materialId: null,
                  materialName: "",
                  unit: "",
                }));
                return;
              }

              setForm((prev) => ({
                ...prev,
                job: selected.job || prev.job,
                materialId: selected.id,
                materialName: selected.name,
                unit: selected.unit || "",
              }));
            }}
            style={inputStyle}
          >
            <option value="">
              {filteredOptions.length > 0
                ? "Select available material"
                : "No matching stock"}
            </option>

            {filteredOptions.map((option) => {
              const optionValue = `${option.job}__${option.name}__${option.unit}`;

              return (
                <option
                  key={`${optionValue}__${option.poNumber}__${option.vendor}`}
                  value={optionValue}
                >
                  {option.label}
                </option>
              );
            })}
          </select>
        </InputBlock>

        <InputBlock label="Qty">
          <input
            type="number"
            min="0"
            step="any"
            value={form.qty}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                qty: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Unit">
          <input
            type="text"
            value={form.unit}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                unit: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Movement Type">
          <select
            value={form.movementType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                movementType: e.target.value as MaterialMovementType,
              }))
            }
            style={inputStyle}
          >
            <option value="Delivered to Site">Delivered to Site</option>
            <option value="Picked Up">Picked Up</option>
            <option value="Transferred">Transferred</option>
          </select>
        </InputBlock>

        <InputBlock label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Handled By">
          <input
            type="text"
            value={form.handledBy}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                handledBy: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Reference">
          <input
            type="text"
            value={form.reference}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                reference: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Notes">
          <input
            type="text"
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          Save Movement
        </button>

        <button
          type="button"
          onClick={() =>
            setForm({
              job: form.job,
              source: form.source,
              materialId: null,
              materialName: "",
              qty: "",
              unit: "",
              movementType: "Delivered to Site",
              date: "",
              handledBy: "",
              reference: "",
              notes: "",
            })
          }
          style={secondaryButtonStyle}
        >
          Clear
        </button>
      </div>
    </form>
  );
}