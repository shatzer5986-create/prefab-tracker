"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { POStatus } from "@/types";

export default function POForm({
  poForm,
  setPoForm,
  jobOptions,
  editingPOId,
  onSave,
  onCancel,
}: {
  poForm: {
    job: string;
    poNumber: string;
    vendor: string;
    orderDate: string;
    expectedDate: string;
    receivedDate: string;
    status: POStatus;
    amount: string;
    notes: string;
  };
  setPoForm: React.Dispatch<
    React.SetStateAction<{
      job: string;
      poNumber: string;
      vendor: string;
      orderDate: string;
      expectedDate: string;
      receivedDate: string;
      status: POStatus;
      amount: string;
      notes: string;
    }>
  >;
  jobOptions: string[];
  editingPOId: number | null;
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
            value={poForm.job}
            onChange={(e) =>
              setPoForm((prev) => ({
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

        <InputBlock label="PO #">
          <input
            type="text"
            value={poForm.poNumber}
            onChange={(e) =>
              setPoForm((prev) => ({
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
            value={poForm.vendor}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                vendor: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Order Date">
          <input
            type="date"
            value={poForm.orderDate}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                orderDate: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Expected Date">
          <input
            type="date"
            value={poForm.expectedDate}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                expectedDate: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Received Date">
          <input
            type="date"
            value={poForm.receivedDate}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                receivedDate: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Status">
          <select
            value={poForm.status}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                status: e.target.value as POStatus,
              }))
            }
            style={inputStyle}
          >
            <option value="Ordered">Ordered</option>
            <option value="Partial">Partial</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </InputBlock>

        <InputBlock label="Amount">
          <input
            type="number"
            min="0"
            step="any"
            value={poForm.amount}
            onChange={(e) =>
              setPoForm((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Notes">
          <input
            type="text"
            value={poForm.notes}
            onChange={(e) =>
              setPoForm((prev) => ({
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
          {editingPOId !== null ? "Update PO" : "Save PO"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}