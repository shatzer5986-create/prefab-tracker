"use client";

import { PurchaseOrder } from "@/types";
import { TableWrapper, Th, Td, tableStyle, buttonStyle } from "./TableBits";

export default function POTable({
  pos,
  onEdit,
  onDelete,
}: {
  pos: PurchaseOrder[];
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job</Th>
            <Th>PO #</Th>
            <Th>Vendor</Th>
            <Th>Order Date</Th>
            <Th>Expected</Th>
            <Th>Received</Th>
            <Th>Status</Th>
            <Th>Amount</Th>
            <Th>Notes</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {pos.map((po) => (
            <tr key={po.id}>
              <Td>{po.job}</Td>
              <Td>{po.poNumber}</Td>
              <Td>{po.vendor}</Td>
              <Td>{po.orderDate}</Td>
              <Td>{po.expectedDate}</Td>
              <Td>{po.receivedDate || "-"}</Td>
              <Td>{po.status}</Td>
              <Td>{po.amount}</Td>
              <Td>{po.notes}</Td>
              <Td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onEdit(po)} style={buttonStyle}>
                    Edit
                  </button>
                  <button onClick={() => onDelete(po.id)} style={buttonStyle}>
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}