"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { Assembly, PrefabStatus, PrefabType } from "@/types";

export default function PrefabForm({
  prefabForm,
  setPrefabForm,
  jobOptions,
  assemblyOptions = [],
  assemblies = [],
  editingPrefabId,
  onSave,
  onCancel,
}: {
  prefabForm: {
    job: string;
    assemblyId: string;
    assembly: string;
    type: PrefabType;
    area: string;
    qtyPlanned: string;
    qtyBuilt: string;
    status: PrefabStatus;
    assignedTo: string;
    materialReady: boolean;
  };
  setPrefabForm: React.Dispatch<
    React.SetStateAction<{
      job: string;
      assemblyId: string;
      assembly: string;
      type: PrefabType;
      area: string;
      qtyPlanned: string;
      qtyBuilt: string;
      status: PrefabStatus;
      assignedTo: string;
      materialReady: boolean;
    }>
  >;
  jobOptions: string[];
  assemblyOptions?: { id: number; name: string }[];
  assemblies?: Assembly[];
  editingPrefabId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const safeAssemblyOptions = Array.isArray(assemblyOptions) ? assemblyOptions : [];
  const safeAssemblies = Array.isArray(assemblies) ? assemblies : [];

  const selectedAssemblyId = prefabForm.assemblyId;

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
            value={prefabForm.job}
            onChange={(e) =>
              setPrefabForm((prev) => ({
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

        <InputBlock label="Linked Assembly">
          <select
            value={selectedAssemblyId}
            onChange={(e) => {
              const selected = safeAssemblyOptions.find(
                (a) => String(a.id) === e.target.value
              );

              setPrefabForm((prev) => ({
                ...prev,
                assemblyId: e.target.value,
                assembly: selected?.name || prev.assembly,
              }));
            }}
            style={inputStyle}
          >
            <option value="">No linked assembly</option>
            {safeAssemblyOptions.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
              </option>
            ))}
          </select>
        </InputBlock>

        <InputBlock label="Prefab / Assembly Name">
          <input
            type="text"
            value={prefabForm.assembly}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                assembly: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="4-Square Box Rough-In"
          />
        </InputBlock>

        <InputBlock label="Type">
          <select
            value={prefabForm.type}
            onChange={(e) =>
              setPrefabForm((prev) => ({
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

        <InputBlock label="Area">
          <input
            type="text"
            value={prefabForm.area}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                area: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="Level 1, Room 101..."
          />
        </InputBlock>

        <InputBlock label="Qty Planned">
          <input
            type="number"
            min="0"
            step="1"
            value={prefabForm.qtyPlanned}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                qtyPlanned: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Qty Built">
          <input
            type="number"
            min="0"
            step="1"
            value={prefabForm.qtyBuilt}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                qtyBuilt: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Status">
          <select
            value={prefabForm.status}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                status: e.target.value as PrefabStatus,
              }))
            }
            style={inputStyle}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Staged">Staged</option>
            <option value="Complete">Complete</option>
          </select>
        </InputBlock>

        <InputBlock label="Assigned To">
          <input
            type="text"
            value={prefabForm.assignedTo}
            onChange={(e) =>
              setPrefabForm((prev) => ({
                ...prev,
                assignedTo: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="Shop Crew"
          />
        </InputBlock>

        <InputBlock label="Material Ready">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 42,
              padding: "0 4px",
            }}
          >
            <input
              type="checkbox"
              checked={prefabForm.materialReady}
              onChange={(e) =>
                setPrefabForm((prev) => ({
                  ...prev,
                  materialReady: e.target.checked,
                }))
              }
            />
            <span>Ready</span>
          </label>
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingPrefabId !== null ? "Update Prefab" : "Save Prefab"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}