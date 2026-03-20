"use client";

import { Material } from "@/types";
import { TableWrapper, Th, Td, tableStyle, buttonStyle } from "./TableBits";

type MaterialsTableProps = {
  materials: Material[];
  onEdit: (material: Material) => void;
  onDelete: (id: number) => void;
  onUpdateReceivedQty: (id: number, qty: number) => void;
};

export default function MaterialsTable({
  materials,
  onEdit,
  onDelete,
  onUpdateReceivedQty,
}: MaterialsTableProps) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job</Th>
            <Th>Item</Th>
            <Th>Category</Th>
            <Th>Ordered</Th>
            <Th>Received</Th>
            <Th>Allocated</Th>
            <Th>Remaining</Th>
            <Th>Unit</Th>
            <Th>Vendor</Th>
            <Th>Status</Th>
            <Th>Location</Th>
            <Th>PO #</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => {
            const remaining = Math.max(
              Number(material.orderedQty || 0) - Number(material.receivedQty || 0),
              0
            );

            return (
              <tr key={material.id}>
                <Td>{material.job}</Td>
                <Td>{material.item}</Td>
                <Td>{material.category}</Td>
                <Td>{material.orderedQty}</Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    max={material.orderedQty}
                    value={material.receivedQty}
                    onChange={(e) =>
                      onUpdateReceivedQty(material.id, Number(e.target.value))
                    }
                    style={{
                      width: 70,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                    }}
                  />
                </Td>
                <Td>{material.allocatedQty}</Td>
                <Td>{remaining}</Td>
                <Td>{material.unit}</Td>
                <Td>{material.vendor}</Td>
                <Td>{material.status}</Td>
                <Td>{material.location}</Td>
                <Td>{material.poNumber}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEdit(material)} style={buttonStyle}>
                      Edit
                    </button>
                    <button onClick={() => onDelete(material.id)} style={buttonStyle}>
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrapper>
  );
}