"use client";

import { useMemo } from "react";
import type { ToolItem } from "@/types";

type ToolFormState = Omit<ToolItem, "id">;

const STORAGE_LOCATIONS = ["Tool Room", "Shop", "Yard", "WH1", "WH2"] as const;

type AssignMode = "Job" | "Person" | "Storage";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isStorageLocation(value: string) {
  return STORAGE_LOCATIONS.includes(value as (typeof STORAGE_LOCATIONS)[number]);
}

export default function ToolForm({
  form,
  setForm,
  editingId,
  onSave,
  onCancel,
  existingTools,
  jobOptions,
  employeeOptions,
}: {
  form: ToolFormState;
  setForm: React.Dispatch<React.SetStateAction<ToolFormState>>;
  editingId: number | null;
  onSave: () => void;
  onCancel: () => void;
  existingTools: ToolItem[];
  jobOptions: string[];
  employeeOptions: string[];
}) {
  const realJobOptions = useMemo(
    () => jobOptions.filter((job) => !isStorageLocation(job)).sort((a, b) => a.localeCompare(b)),
    [jobOptions]
  );

  const storageOptions = useMemo(() => [...STORAGE_LOCATIONS], []);

  const assignMode = useMemo<AssignMode>(() => {
    if (form.assignmentType === "Person" || safeString(form.assignedTo)) return "Person";
    if (
      form.assignmentType === "Tool Room" ||
      form.assignmentType === "Shop" ||
      form.assignmentType === "Yard" ||
      form.assignmentType === "WH1" ||
      form.assignmentType === "WH2" ||
      isStorageLocation(safeString(form.toolRoomLocation)) ||
      isStorageLocation(safeString(form.jobNumber))
    ) {
      return "Storage";
    }
    return "Job";
  }, [form.assignmentType, form.assignedTo, form.toolRoomLocation, form.jobNumber]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <Input
          label="Category"
          value={form.category}
          onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
        />

        <Input
          label="Barcode"
          value={form.barcode}
          onChange={(value) => setForm((prev) => ({ ...prev, barcode: value }))}
        />

        <Input
          label="Item Number"
          value={form.itemNumber}
          onChange={(value) => setForm((prev) => ({ ...prev, itemNumber: value }))}
        />

        <Input
          label="Manufacturer"
          value={form.manufacturer}
          onChange={(value) => setForm((prev) => ({ ...prev, manufacturer: value }))}
        />

        <Input
          label="Model"
          value={form.model}
          onChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
        />

        <Input
          label="Description"
          value={form.description}
          onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
        />

        <Input
          label="Serial Number"
          value={form.serialNumber}
          onChange={(value) => setForm((prev) => ({ ...prev, serialNumber: value }))}
        />

        <Input
          label="Quantity"
          type="number"
          value={String(form.quantityAvailable ?? 1)}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              quantityAvailable: Number(value) || 0,
            }))
          }
        />

        <div>
          <label style={labelStyle}>Assign To</label>
          <select
            value={assignMode}
            onChange={(e) => {
              const value = e.target.value as AssignMode;

              if (value === "Job") {
                setForm((prev) => ({
                  ...prev,
                  assignmentType: "Job",
                  assignedTo: "",
                  toolRoomLocation: "",
                  jobNumber: "",
                }));
                return;
              }

              if (value === "Person") {
                setForm((prev) => ({
                  ...prev,
                  assignmentType: "Person",
                  assignedTo: "",
                  jobNumber: "",
                  toolRoomLocation: "",
                }));
                return;
              }

              setForm((prev) => ({
                ...prev,
                assignmentType: "Tool Room",
                assignedTo: "",
                jobNumber: "",
                toolRoomLocation: "Tool Room",
              }));
            }}
            style={inputStyle}
          >
            <option value="Job">Job</option>
            <option value="Person">Person</option>
            <option value="Storage">Storage Location</option>
          </select>
        </div>

        {assignMode === "Job" ? (
          <div>
            <label style={labelStyle}>Job</label>
            <select
              value={form.jobNumber}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  jobNumber: e.target.value,
                  assignedTo: "",
                  toolRoomLocation: "",
                  assignmentType: "Job",
                }))
              }
              style={inputStyle}
            >
              <option value="">Select job</option>
              {realJobOptions.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {assignMode === "Person" ? (
          <>
            <div>
              <label style={labelStyle}>Person Name</label>
              <select
                value={form.assignedTo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedTo: e.target.value,
                    jobNumber: "",
                    toolRoomLocation: "",
                    assignmentType: "Person",
                  }))
                }
                style={inputStyle}
              >
                <option value="">Select employee</option>
                {employeeOptions.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Related Job (optional)</label>
              <select
                value={form.jobNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    jobNumber: e.target.value,
                    assignmentType: "Person",
                  }))
                }
                style={inputStyle}
              >
                <option value="">No related job</option>
                {realJobOptions.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {assignMode === "Storage" ? (
          <div>
            <label style={labelStyle}>Storage Location</label>
            <select
              value={form.toolRoomLocation || "Tool Room"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  toolRoomLocation: e.target.value,
                  jobNumber: "",
                  assignedTo: "",
                  assignmentType: e.target.value as ToolItem["assignmentType"],
                }))
              }
              style={inputStyle}
            >
              {storageOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Input
          label="Transfer Date In"
          type="date"
          value={form.transferDateIn}
          onChange={(value) => setForm((prev) => ({ ...prev, transferDateIn: value }))}
        />

        <Input
          label="Transfer Date Out"
          type="date"
          value={form.transferDateOut}
          onChange={(value) => setForm((prev) => ({ ...prev, transferDateOut: value }))}
        />

        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                status: e.target.value as ToolItem["status"],
              }))
            }
            style={inputStyle}
          >
            <option value="Working">Working</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Current Assignment Type</label>
          <input
            value={form.assignmentType}
            readOnly
            style={{ ...inputStyle, background: "#1f1f1f", color: "#d1d5db" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingId !== null ? "Update Tool" : "Save Tool"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Clear
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#a3a3a3" }}>
        Master tool list rows: {existingTools.length}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  color: "#d1d5db",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #3a3a3a",
  fontSize: 16,
  boxSizing: "border-box",
  background: "#121212",
  color: "#f5f5f5",
};

const buttonStyle: React.CSSProperties = {
  background: "#c2410c",
  color: "white",
  border: "1px solid #ea580c",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};