"use client";

import { TableWrapper, Th, Td, tableStyle, buttonStyle } from "./TableBits";

type PrefabRow = {
  id: number;
  job?: string;
  assemblyId: number | null;
  assembly?: string;
  area?: string;
  qtyPlanned?: number;
  qtyBuilt?: number;
  status?: string;
};

type AssemblyBomRow = {
  id: number;
  assemblyId: number;
  item: string;
  qtyPerAssembly: number;
  unit: string;
};

type MaterialRow = {
  id: number;
  job?: string;
  item: string;
  receivedQty?: number;
  allocatedQty?: number;
  unit?: string;
  vendor?: string;
  poNumber?: string;
};

type PrefabAllocationRow = {
  id?: number;
  prefab_id: number;
  material_id: number;
  quantity_allocated: number;
};

type RowResult = {
  prefabId: number;
  job: string;
  assembly: string;
  area: string;
  materialChecks: {
    item: string;
    unit: string;
    requiredQty: number;
    availableQty: number;
    alreadyAllocatedQty: number;
    shortageQty: number;
    matchedMaterialNames: string[];
  }[];
  canAllocate: boolean;
};

type Props = {
  prefabRows?: PrefabRow[];
  assemblyBom?: AssemblyBomRow[];
  materials?: MaterialRow[];
  prefabAllocations?: PrefabAllocationRow[];
  onAutoAllocateAll?: () => void;
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bboxes\b/g, "box")
    .replace(/\bconnectors\b/g, "connector")
    .replace(/\bsticks\b/g, "stick")
    .replace(/\bbrackets\b/g, "bracket")
    .replace(/\bpigtails\b/g, "pigtail");
}

function normalizeUnit(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\beach\b/g, "ea")
    .replace(/\bpieces\b/g, "ea")
    .replace(/\bpiece\b/g, "ea")
    .replace(/\bpcs\b/g, "ea")
    .replace(/\bfeet\b/g, "ft")
    .replace(/\bfoot\b/g, "ft")
    .replace(/\bsticks\b/g, "stick")
    .replace(/\s+/g, " ");
}

export default function AssemblyAutoAllocateTable({
  prefabRows = [],
  assemblyBom = [],
  materials = [],
  prefabAllocations = [],
  onAutoAllocateAll,
}: Props) {
  const rows: RowResult[] = prefabRows
    .filter((p) => p.assemblyId)
    .map((prefab) => {
      const bomRows = assemblyBom.filter(
        (bom) => Number(bom.assemblyId) === Number(prefab.assemblyId)
      );

      const qtyPlanned = Number(prefab.qtyPlanned || 0);
      const qtyBuilt = Number(prefab.qtyBuilt || 0);
      const remainingToBuild = Math.max(qtyPlanned - qtyBuilt, 0);

      const materialChecks = bomRows.map((bom) => {
        const requiredQty =
          remainingToBuild * Number(bom.qtyPerAssembly || 0);

        const matchedMaterials = materials.filter((m) => {
          const sameJob =
            !prefab.job ||
            !m.job ||
            String(m.job).trim().toLowerCase() ===
              String(prefab.job).trim().toLowerCase();

          const sameItem =
            normalizeText(m.item || "") === normalizeText(bom.item || "") ||
            normalizeText(m.item || "").includes(normalizeText(bom.item || "")) ||
            normalizeText(bom.item || "").includes(normalizeText(m.item || ""));

          const sameUnit =
            !bom.unit ||
            !m.unit ||
            normalizeUnit(m.unit || "") === normalizeUnit(bom.unit || "");

          return sameJob && sameItem && sameUnit;
        });

        const matchedMaterialIds = matchedMaterials.map((m) => Number(m.id));

        const alreadyAllocatedQty = prefabAllocations
          .filter(
            (alloc) =>
              Number(alloc.prefab_id) === Number(prefab.id) &&
              matchedMaterialIds.includes(Number(alloc.material_id))
          )
          .reduce(
            (sum, alloc) => sum + Number(alloc.quantity_allocated || 0),
            0
          );

        const availableQty = matchedMaterials.reduce((sum, material) => {
          const received = Number(material.receivedQty || 0);
          const allocated = Number(material.allocatedQty || 0);
          return sum + Math.max(received - allocated, 0);
        }, 0);

        const shortageQty = Math.max(requiredQty - availableQty, 0);

        return {
          item: bom.item || "",
          unit: bom.unit || "",
          requiredQty,
          availableQty,
          alreadyAllocatedQty,
          shortageQty,
          matchedMaterialNames: matchedMaterials.map((m) => m.item),
        };
      });

      return {
        prefabId: Number(prefab.id),
        job: prefab.job || "",
        assembly: prefab.assembly || "",
        area: prefab.area || "",
        materialChecks,
        canAllocate:
          materialChecks.length > 0 &&
          materialChecks.every((check) => check.shortageQty <= 0),
      };
    });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700, color: "#334155" }}>
          Auto allocation review
        </div>

        <button
          type="button"
          onClick={() => onAutoAllocateAll?.()}
          style={buttonStyle}
          disabled={!onAutoAllocateAll}
        >
          Auto Allocate All
        </button>
      </div>

      {!rows.length ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#f8fafc",
            color: "#475569",
            fontSize: "14px",
          }}
        >
          No prefab rows available for auto allocation.
        </div>
      ) : (
        <TableWrapper>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Assembly</Th>
                <Th>Area</Th>
                <Th>Materials Needed</Th>
                <Th>Ready</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.prefabId}>
                  <Td>{row.assembly || "-"}</Td>
                  <Td>{row.area || "-"}</Td>
                  <Td>
                    <div style={{ display: "grid", gap: 8 }}>
                      {row.materialChecks.length === 0 ? (
                        <div style={{ color: "#64748b" }}>No BOM rows found.</div>
                      ) : (
                        row.materialChecks.map((check, index) => (
                          <div
                            key={`${row.prefabId}-${check.item}-${index}`}
                            style={{
                              padding: "8px 10px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              background: "#f8fafc",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {check.item} {check.unit ? `(${check.unit})` : ""}
                            </div>
                            <div style={{ fontSize: "13px", color: "#475569" }}>
                              Required: {check.requiredQty} | Available: {check.availableQty} | Already Allocated: {check.alreadyAllocatedQty}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: check.shortageQty > 0 ? "#b91c1c" : "#166534",
                                fontWeight: 700,
                              }}
                            >
                              {check.shortageQty > 0
                                ? `Short by ${check.shortageQty}`
                                : "Enough material available"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: row.canAllocate ? "#dcfce7" : "#fee2e2",
                        color: row.canAllocate ? "#166534" : "#991b1b",
                      }}
                    >
                      {row.canAllocate ? "Ready" : "Not Ready"}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}