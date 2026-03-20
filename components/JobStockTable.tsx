"use client";

import { TableWrapper, Th, Td, ActionButtons, tableStyle } from "./TableBits";

type JobStock = {
  id: number;
  materialName: string;
  description?: string;
  unit: string;
  quantity: number;
  vendor?: string;
  poNumber?: string;
  location?: string;
  status?: string;
};

export default function JobStockTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: JobStock[];
  onEdit: (row: JobStock) => void;
  onDelete: (id: number) => void;
}) {
  if (!rows.length) {
    return (
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
        No job stock yet.
      </div>
    );
  }

  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Material</Th>
            <Th>Description</Th>
            <Th>Unit</Th>
            <Th>Qty</Th>
            <Th>Vendor</Th>
            <Th>PO</Th>
            <Th>Location</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>{row.materialName}</Td>
              <Td>{row.description || ""}</Td>
              <Td>{row.unit}</Td>
              <Td>{row.quantity}</Td>
              <Td>{row.vendor || ""}</Td>
              <Td>{row.poNumber || ""}</Td>
              <Td>{row.location || ""}</Td>
              <Td>{row.status || ""}</Td>
              <Td>
                <ActionButtons
                  onEdit={() => onEdit(row)}
                  onDelete={() => onDelete(row.id)}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}