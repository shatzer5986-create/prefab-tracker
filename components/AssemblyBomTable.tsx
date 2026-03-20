import { Assembly, AssemblyBomItem } from "@/types";
import { TableWrapper, Th, Td, ActionButtons, tableStyle } from "./TableBits";

export default function AssemblyBomTable({
  bomItems = [],
  assemblies = [],
  onEdit,
  onDelete,
}: {
  bomItems: AssemblyBomItem[];
  assemblies: Assembly[];
  onEdit: (item: AssemblyBomItem) => void;
  onDelete: (id: number) => void;
}) {
  function getAssemblyName(assemblyId: number) {
    return assemblies.find((a) => a.id === assemblyId)?.name || "Unknown";
  }

  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Assembly</Th>
            <Th>Material Item</Th>
            <Th>Qty / Assembly</Th>
            <Th>Unit</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {bomItems.length === 0 ? (
            <tr>
              <Td colSpan={5}>No BOM items yet.</Td>
            </tr>
          ) : (
            bomItems.map((item) => (
              <tr key={item.id}>
                <Td>{getAssemblyName(item.assemblyId)}</Td>
                <Td>{item.item}</Td>
                <Td>{item.qtyPerAssembly}</Td>
                <Td>{item.unit}</Td>
                <Td>
                  <ActionButtons
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrapper>
  );
}