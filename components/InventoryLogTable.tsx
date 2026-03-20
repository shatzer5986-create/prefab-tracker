"use client";

import { InventoryLog } from "@/types";
import { TableWrapper, Th, Td, tableStyle } from "@/components/TableBits";

export default function InventoryLogTable({
  rows,
}: {
  rows: InventoryLog[];
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Type</Th>
            <Th>Item</Th>
            <Th>Action</Th>
            <Th>Qty</Th>
            <Th>Job</Th>
            <Th>Assigned To</Th>
            <Th>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={emptyCellStyle}>
                No inventory history yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{new Date(row.date).toLocaleString()}</Td>
                <Td>{row.itemType}</Td>
                <Td>{row.itemName}</Td>
                <Td>{row.action}</Td>
                <Td>{row.qty}</Td>
                <Td>{row.job || "-"}</Td>
                <Td>{row.assignedTo || "-"}</Td>
                <Td>{row.notes || "-"}</Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}

const emptyCellStyle: React.CSSProperties = {
  padding: "14px 10px",
  color: "#d1d5db",
  fontSize: "14px",
  borderBottom: "1px solid #262626",
  background: "#141414",
};