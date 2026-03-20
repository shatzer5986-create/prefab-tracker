"use client";

import { buttonStyle, tableStyle, TableWrapper, Th, Td } from "./TableBits";

export type AllocationHistoryRow = {
  id: number;
  job: string;
  materialId: number;
  materialName: string;
  prefabId: number;
  prefabName: string;
  prefabArea: string;
  qty: number;
  unit: string;
  createdAt: string;
};

export default function JobAllocationHistoryTable({
  rows,
  onDelete,
}: {
  rows: AllocationHistoryRow[];
  onDelete: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Material</Th>
            <Th>Prefab</Th>
            <Th>Area</Th>
            <Th>Qty</Th>
            <Th>Unit</Th>
            <Th>Allocated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={7 as any} style={{ textAlign: "center", color: "#64748b" }}>
                No allocations yet.
              </Td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.materialName}</Td>
                <Td>{row.prefabName}</Td>
                <Td>{row.prefabArea || "-"}</Td>
                <Td>{row.qty}</Td>
                <Td>{row.unit}</Td>
                <Td>{row.createdAt}</Td>
                <Td>
                  <button
                    onClick={() => onDelete(row.id)}
                    style={{ ...buttonStyle, background: "#7f1d1d" }}
                  >
                    Unallocate
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}