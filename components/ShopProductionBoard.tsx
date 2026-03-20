"use client";

import { TableWrapper, Th, Td, tableStyle } from "./TableBits";
import { PrefabItem } from "@/types";

type BoardRow = {
  id: number;
  job: string;
  assembly: string;
  area: string;
  remaining: number;
  status: string;
  missing: string;
};

function getStatusColor(status: string) {
  switch (status) {
    case "READY":
      return "#166534";
    case "STAGED":
      return "#a16207";
    case "COMPLETE":
      return "#1d4ed8";
    case "BLOCKED":
      return "#991b1b";
    default:
      return "#475569";
  }
}

export default function ShopProductionBoard({
  prefab = [],
}: {
  prefab: PrefabItem[];
}) {
  const rows: BoardRow[] = prefab.map((item: any) => {
    const id = Number(item.id);
    const job = String(item.job || "").trim();
    const assembly = String(item.assembly || "").trim() || "No Assembly";
    const area = String(item.area || "").trim() || "-";

    const qtyPlanned = Number(item.qtyPlanned) || 0;
    const qtyBuilt = Number(item.qtyBuilt) || 0;
    const remaining = Math.max(qtyPlanned - qtyBuilt, 0);

    const statusText = String(item.status || "").trim();

    if (remaining <= 0 || statusText === "Complete") {
      return {
        id,
        job,
        assembly,
        area,
        remaining: 0,
        status: "COMPLETE",
        missing: "",
      };
    }

    if (statusText === "Staged") {
      return {
        id,
        job,
        assembly,
        area,
        remaining,
        status: "STAGED",
        missing: "",
      };
    }

    const isBlocked = item.blocked === true || item.materialReady === false;

    return {
      id,
      job,
      assembly,
      area,
      remaining,
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
            <Th>Assembly</Th>
            <Th>Area</Th>
            <Th>Remaining</Th>
            <Th>Status</Th>
            <Th>Missing</Th>
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.job || "-"}</Td>
                <Td>{row.assembly || "-"}</Td>
                <Td>{row.area || "-"}</Td>
                <Td>{row.remaining}</Td>
                <Td>
                  <span
                    style={{
                      fontWeight: 700,
                      color: getStatusColor(row.status),
                    }}
                  >
                    {row.status}
                  </span>
                </Td>
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