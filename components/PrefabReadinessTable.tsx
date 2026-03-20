"use client";

import { TableWrapper, Th, Td, tableStyle } from "./TableBits";
import { PrefabItem } from "@/types";

type ReadinessRow = {
  prefabId: number;
  job: string;
  area: string;
  assembly: string;
  qtyRemaining: number;
  status: string;
  missing: string;
};

export default function PrefabReadinessTable({
  prefab = [],
}: {
  prefab: PrefabItem[];
}) {
  const readinessRows: ReadinessRow[] = prefab.map((prefabRow: any) => {
    const qtyPlanned = Number(prefabRow.qtyPlanned) || 0;
    const qtyBuilt = Number(prefabRow.qtyBuilt) || 0;
    const qtyRemaining = Math.max(qtyPlanned - qtyBuilt, 0);

    const statusText = String(prefabRow.status || "").trim();
    const assemblyText = String(prefabRow.assembly || "").trim();
    const jobText = String(prefabRow.job || "").trim();
    const areaText = String(prefabRow.area || "").trim();

    if (qtyRemaining <= 0 || statusText === "Complete") {
      return {
        prefabId: Number(prefabRow.id),
        job: jobText,
        area: areaText,
        assembly: assemblyText || "No Assembly",
        qtyRemaining: 0,
        status: "COMPLETE",
        missing: "",
      };
    }

    if (statusText === "Staged") {
      return {
        prefabId: Number(prefabRow.id),
        job: jobText,
        area: areaText,
        assembly: assemblyText || "No Assembly",
        qtyRemaining,
        status: "READY",
        missing: "",
      };
    }

    const isBlocked =
      prefabRow.blocked === true || prefabRow.materialReady === false;

    return {
      prefabId: Number(prefabRow.id),
      job: jobText,
      area: areaText,
      assembly: assemblyText || "No Assembly",
      qtyRemaining,
      status: isBlocked ? "BLOCKED" : "READY",
      missing: isBlocked ? "Material not ready" : "",
    };
  });

  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job</Th>
            <Th>Area</Th>
            <Th>Assembly</Th>
            <Th>Remaining</Th>
            <Th>Status</Th>
            <Th>Missing</Th>
          </tr>
        </thead>

        <tbody>
          {readinessRows.length > 0 ? (
            readinessRows.map((row) => (
              <tr key={row.prefabId}>
                <Td>{row.job || "-"}</Td>
                <Td>{row.area || "-"}</Td>
                <Td>{row.assembly || "-"}</Td>
                <Td>{row.qtyRemaining}</Td>
                <Td>{row.status}</Td>
                <Td>{row.missing || "-"}</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>-</Td>
              <Td>No prefab rows found</Td>
            </tr>
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}