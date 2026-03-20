"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { PrefabType } from "@/types";

export default function AssemblyForm({
  assemblyForm,
  setAssemblyForm,
  jobOptions,
  editingAssemblyId,
  onSave,
  onCancel,
}: {
  assemblyForm: {
    job: string;
    name: string;
    type: PrefabType;
    description: string;
  };
  setAssemblyForm: React.Dispatch<
    React.SetStateAction<{
      job: string;
      name: string;
      type: PrefabType;
      description: string;
    }>
  >;
  jobOptions: string[];
  editingAssemblyId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
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
            value={assemblyForm.job}
            onChange={(e) =>
              setAssemblyForm((prev) => ({
                ...prev,
                job: e.target.value,
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

        <InputBlock label="Assembly Name">
          <input
            type="text"
            value={assemblyForm.name}
            onChange={(e) =>
              setAssemblyForm((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="4-Square Box Rough-In"
          />
        </InputBlock>

        <InputBlock label="Type">
          <select
            value={assemblyForm.type}
            onChange={(e) =>
              setAssemblyForm((prev) => ({
                ...prev,
                type: e.target.value as PrefabType,
              }))
            }
            style={inputStyle}
          >
            <option value="Assembly">Assembly</option>
            <option value="Spool">Spool</option>
            <option value="Rack">Rack</option>
            <option value="Other">Other</option>
          </select>
        </InputBlock>

        <InputBlock label="Description">
          <input
            type="text"
            value={assemblyForm.description}
            onChange={(e) =>
              setAssemblyForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="Short description"
          />
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingAssemblyId !== null ? "Update Assembly" : "Save Assembly"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}