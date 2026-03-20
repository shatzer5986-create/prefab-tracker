"use client";

import { useState } from "react";
import { buttonStyle, secondaryButtonStyle } from "./TableBits";

const STORAGE_KEY = "prefab-tracker-v7";

type Receipt = {
  id: number;
  materialId: number;
  qty: number;
  date: string;
};

export default function MaterialReceiveForm({
  materialId,
  onClose,
}: {
  materialId: number;
  onClose: () => void;
}) {
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  function handleReceive() {
    const qtyNum = Number(qty);

    if (!qtyNum || qtyNum <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert("No tracker data found.");
      return;
    }

    let data: any;

    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse tracker data:", err);
      alert("Tracker data is invalid.");
      return;
    }

    const receipts: Receipt[] = Array.isArray(data.materialReceipts)
      ? data.materialReceipts
      : [];

    receipts.push({
      id: Date.now(),
      materialId,
      qty: qtyNum,
      date,
    });

    data.materialReceipts = receipts;

    if (Array.isArray(data.materials)) {
      const matIndex = data.materials.findIndex(
        (m: any) => Number(m.id) === Number(materialId)
      );

      if (matIndex !== -1) {
        const currentReceived = Number(data.materials[matIndex].receivedQty) || 0;
        const ordered = Number(data.materials[matIndex].orderedQty) || 0;

        const newReceived = currentReceived + qtyNum;
        data.materials[matIndex].receivedQty = newReceived;

        if (newReceived <= 0) {
          data.materials[matIndex].status = "Not Ordered";
        } else if (newReceived < ordered) {
          data.materials[matIndex].status = "Partial";
        } else {
          data.materials[matIndex].status = "Received";
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.location.reload();
  }

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        padding: 16,
        borderRadius: 8,
        background: "#f8fafc",
        display: "grid",
        gap: 12,
        marginTop: 16,
      }}
    >
      <h3 style={{ margin: 0 }}>Receive Material</h3>

      <input
        type="number"
        placeholder="Qty received now"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        style={{ padding: 8 }}
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ padding: 8 }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={handleReceive} style={buttonStyle}>
          Receive
        </button>

        <button type="button" onClick={onClose} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}