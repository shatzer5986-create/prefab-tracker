"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";

type MaterialOption = {
  id: number | null;
  name: string;
  unit: string;
  vendor: string;
  poNumber: string;
};

export default function RegularInventoryForm({
  form,
  setForm,
  jobOptions,
  materialOptions,
  onSave,
}: {
  form: {
    job: string;
    materialId: number | null;
    materialName: string;
    newMaterialName: string;
    qty: string;
    unit: string;
    poNumber: string;
    vendor: string;
    dateReceived: string;
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      job: string;
      materialId: number | null;
      materialName: string;
      newMaterialName: string;
      qty: string;
      unit: string;
      poNumber: string;
      vendor: string;
      dateReceived: string;
      notes: string;
    }>
  >;
  jobOptions: string[];
  materialOptions: MaterialOption[];
  onSave: () => void;
}) {
  const selectedValue =
    form.materialName && form.unit
      ? `${form.materialName}__${form.unit}__${form.poNumber}__${form.vendor}`
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
                newMaterialName: "",
                unit: "",
                poNumber: "",
                vendor: "",
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

        <InputBlock label="Select Existing Material">
          <select
            value={selectedValue}
            onChange={(e) => {
              const selected = materialOptions.find(
                (option) =>
                  `${option.name}__${option.unit}__${option.poNumber}__${option.vendor}` ===
                  e.target.value
              );

              setForm((prev) => ({
                ...prev,
                materialId: selected?.id ?? null,
                materialName: selected?.name || "",
                newMaterialName: "",
                unit: selected?.unit || "",
                poNumber: selected?.poNumber || "",
                vendor: selected?.vendor || "",
              }));
            }}
            style={inputStyle}
          >
            <option value="">Select material</option>
            {materialOptions.map((material) => {
              const value = `${material.name}__${material.unit}__${material.poNumber}__${material.vendor}`;
              return (
                <option key={value} value={value}>
                  {material.name}
                  {material.poNumber ? ` — ${material.poNumber}` : ""}
                </option>
              );
            })}
          </select>
        </InputBlock>

        <InputBlock label="Or New Material Name">
          <input
            type="text"
            value={form.newMaterialName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                newMaterialName: e.target.value,
                materialId: null,
                materialName: "",
              }))
            }
            style={inputStyle}
            placeholder='e.g. 3/4" EMT'
          />
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

        <InputBlock label="PO #">
          <input
            type="text"
            value={form.poNumber}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                poNumber: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Vendor">
          <input
            type="text"
            value={form.vendor}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                vendor: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Date Received">
          <input
            type="date"
            value={form.dateReceived}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                dateReceived: e.target.value,
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
          Save Job Stock
        </button>

        <button
          type="button"
          onClick={() =>
            setForm({
              job: form.job,
              materialId: null,
              materialName: "",
              newMaterialName: "",
              qty: "",
              unit: "",
              poNumber: "",
              vendor: "",
              dateReceived: "",
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