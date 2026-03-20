"use client";

import InputBlock, { inputStyle } from "./InputBlock";
import { buttonStyle, secondaryButtonStyle, formGrid } from "./TableBits";
import { Material, MaterialStatus } from "@/types";

export default function MaterialForm({
  materials = [],
  materialForm,
  setMaterialForm,
  jobOptions,
  editingMaterialId,
  onSave,
  onCancel,
}: {
  materials?: Material[];
  materialForm: {
    job: string;
    item: string;
    category: string;
    orderedQty: string;
    receivedQty: string;
    allocatedQty: string;
    unit: string;
    vendor: string;
    status: MaterialStatus;
    location: string;
    poNumber: string;
  };
  setMaterialForm: React.Dispatch<
    React.SetStateAction<{
      job: string;
      item: string;
      category: string;
      orderedQty: string;
      receivedQty: string;
      allocatedQty: string;
      unit: string;
      vendor: string;
      status: MaterialStatus;
      location: string;
      poNumber: string;
    }>
  >;
  jobOptions: string[];
  editingMaterialId: number | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const safeMaterials = Array.isArray(materials) ? materials : [];

  const itemSuggestions = Array.from(
    new Set(safeMaterials.map((m) => m.item).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const categorySuggestions = Array.from(
    new Set(safeMaterials.map((m) => m.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const vendorSuggestions = Array.from(
    new Set(safeMaterials.map((m) => m.vendor).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

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
            value={materialForm.job}
            onChange={(e) =>
              setMaterialForm((prev) => ({
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

        <InputBlock label="Item">
          <>
            <input
              list="material-item-suggestions"
              value={materialForm.item}
              onChange={(e) =>
                setMaterialForm((prev) => ({
                  ...prev,
                  item: e.target.value,
                }))
              }
              style={inputStyle}
              placeholder='e.g. 3/4" EMT'
            />
            <datalist id="material-item-suggestions">
              {itemSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </>
        </InputBlock>

        <InputBlock label="Category">
          <>
            <input
              list="material-category-suggestions"
              value={materialForm.category}
              onChange={(e) =>
                setMaterialForm((prev) => ({
                  ...prev,
                  category: e.target.value,
                }))
              }
              style={inputStyle}
              placeholder="Conduit, Fittings, Boxes..."
            />
            <datalist id="material-category-suggestions">
              {categorySuggestions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </>
        </InputBlock>

        <InputBlock label="Ordered Qty">
          <input
            type="number"
            min="0"
            step="any"
            value={materialForm.orderedQty}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                orderedQty: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Received Qty">
          <input
            type="number"
            min="0"
            step="any"
            value={materialForm.receivedQty}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                receivedQty: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Allocated Qty">
          <input
            type="number"
            min="0"
            step="any"
            value={materialForm.allocatedQty}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                allocatedQty: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>

        <InputBlock label="Unit">
          <input
            type="text"
            value={materialForm.unit}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                unit: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="ea, ft, sticks..."
          />
        </InputBlock>

        <InputBlock label="Vendor">
          <>
            <input
              list="material-vendor-suggestions"
              value={materialForm.vendor}
              onChange={(e) =>
                setMaterialForm((prev) => ({
                  ...prev,
                  vendor: e.target.value,
                }))
              }
              style={inputStyle}
              placeholder="AED, Graybar..."
            />
            <datalist id="material-vendor-suggestions">
              {vendorSuggestions.map((vendor) => (
                <option key={vendor} value={vendor} />
              ))}
            </datalist>
          </>
        </InputBlock>

        <InputBlock label="Status">
          <select
            value={materialForm.status}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                status: e.target.value as MaterialStatus,
              }))
            }
            style={inputStyle}
          >
            <option value="Ordered">Ordered</option>
            <option value="Partial">Partial</option>
            <option value="Received">Received</option>
          </select>
        </InputBlock>

        <InputBlock label="Location">
          <input
            type="text"
            value={materialForm.location}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                location: e.target.value,
              }))
            }
            style={inputStyle}
            placeholder="Shop, Yard, Rack A..."
          />
        </InputBlock>

        <InputBlock label="PO #">
          <input
            type="text"
            value={materialForm.poNumber}
            onChange={(e) =>
              setMaterialForm((prev) => ({
                ...prev,
                poNumber: e.target.value,
              }))
            }
            style={inputStyle}
          />
        </InputBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={buttonStyle}>
          {editingMaterialId !== null ? "Update Material" : "Save Material"}
        </button>

        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </form>
  );
}