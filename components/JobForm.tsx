import { JobStatus } from "@/types";
import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";

export default function JobForm({
  jobForm,
  setJobForm,
  editingJobId,
  onSave,
  onCancel,
}: {
  jobForm: {
    jobNumber: string;
    name: string;
    customer: string;
    status: JobStatus;
  };
  setJobForm: React.Dispatch<
    React.SetStateAction<{
      jobNumber: string;
      name: string;
      customer: string;
      status: JobStatus;
    }>
  >;
  editingJobId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div style={formGrid}>
        <InputBlock label="Job Number">
          <input
            style={inputStyle}
            value={jobForm.jobNumber}
            onChange={(e) =>
              setJobForm((prev) => ({ ...prev, jobNumber: e.target.value }))
            }
          />
        </InputBlock>

        <InputBlock label="Job Name">
          <input
            style={inputStyle}
            value={jobForm.name}
            onChange={(e) =>
              setJobForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </InputBlock>

        <InputBlock label="Customer">
          <input
            style={inputStyle}
            value={jobForm.customer}
            onChange={(e) =>
              setJobForm((prev) => ({ ...prev, customer: e.target.value }))
            }
          />
        </InputBlock>

        <InputBlock label="Status">
          <select
            style={inputStyle}
            value={jobForm.status}
            onChange={(e) =>
              setJobForm((prev) => ({
                ...prev,
                status: e.target.value as JobStatus,
              }))
            }
          >
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Complete">Complete</option>
          </select>
        </InputBlock>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={onSave} style={buttonStyle}>
          {editingJobId !== null ? "Update Job" : "Add Job"}
        </button>

        {editingJobId !== null && (
          <button onClick={onCancel} style={secondaryButtonStyle}>
            Cancel Edit
          </button>
        )}
      </div>
    </>
  );
}