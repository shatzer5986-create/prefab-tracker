import { tableStyle, Th, Td } from "./TableBits";

export default function DemandTable({
  rows = [],
}: {
  rows: {
    item: string;
    unit: string;
    neededQty: number;
    receivedQty: number;
    shortageQty: number;
  }[];
}) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <Th>Material</Th>
          <Th>Needed</Th>
          <Th>Received</Th>
          <Th>Short</Th>
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <Td colSpan={4}>No demand calculated</Td>
          </tr>
        ) : (
          rows.map((row, i) => {
            const isShort = row.shortageQty > 0;

            return (
              <tr key={i}>
                <Td>{row.item}</Td>
                <Td>{row.neededQty}</Td>
                <Td>{row.receivedQty}</Td>
                <Td style={{ color: isShort ? "#b91c1c" : "#15803d" }}>
                  {row.shortageQty}
                </Td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}