"use client";

import { AppNotification } from "@/types";
import {
  TableWrapper,
  Th,
  Td,
  tableStyle,
  smallButtonStyle,
} from "@/components/TableBits";

export default function NotificationsTable({
  rows,
  onMarkRead,
  onMarkUnread,
}: {
  rows: AppNotification[];
  onMarkRead: (id: number) => void;
  onMarkUnread?: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Job #</Th>
            <Th>Type</Th>
            <Th>Title</Th>
            <Th>Message</Th>
            <Th>Created</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} style={emptyCellStyle}>
                No notifications found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  background: row.isRead ? "#141414" : "#1b1b1b",
                }}
              >
                <Td>{row.jobNumber || "-"}</Td>
                <Td>{row.type}</Td>
                <Td>
                  <span style={row.isRead ? readTitleStyle : unreadTitleStyle}>
                    {row.title}
                  </span>
                </Td>
                <Td>{row.message}</Td>
                <Td>
                  {row.createdAt
                    ? row.createdAt.replace("T", " ").slice(0, 16)
                    : "-"}
                </Td>
                <Td>
                  <span
                    style={{
                      ...statusPillStyle,
                      background: row.isRead ? "#2a2a2a" : "#7c2d12",
                      color: row.isRead ? "#d1d5db" : "#fed7aa",
                      border: row.isRead
                        ? "1px solid #3a3a3a"
                        : "1px solid #c2410c",
                    }}
                  >
                    {row.isRead ? "Read" : "Unread"}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!row.isRead ? (
                      <button
                        type="button"
                        onClick={() => onMarkRead(row.id)}
                        style={smallButtonStyle}
                      >
                        Mark Read
                      </button>
                    ) : onMarkUnread ? (
                      <button
                        type="button"
                        onClick={() => onMarkUnread(row.id)}
                        style={markUnreadButtonStyle}
                      >
                        Mark Unread
                      </button>
                    ) : (
                      <span style={{ color: "#a3a3a3", fontSize: 12 }}>—</span>
                    )}
                  </div>
                </Td>
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

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const unreadTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#f97316",
};

const readTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#f5f5f5",
};

const markUnreadButtonStyle: React.CSSProperties = {
  background: "#2a2a2a",
  color: "white",
  border: "1px solid #3a3a3a",
  borderRadius: "6px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};