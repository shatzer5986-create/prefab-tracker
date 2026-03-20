import { Assembly } from "@/types";
import { TableWrapper, Th, Td, ActionButtons, tableStyle } from "./TableBits";

export default function AssembliesTable({
  assemblies,
  onEdit,
  onDelete,
}: {
  assemblies: Assembly[];
  onEdit: (assembly: Assembly) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <TableWrapper>
      <table style={tableStyle}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Description</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {assemblies.map((assembly) => (
            <tr key={assembly.id}>
              <Td>{assembly.name}</Td>
              <Td>{assembly.type}</Td>
              <Td>{assembly.description}</Td>
              <Td>
                <ActionButtons
                  onEdit={() => onEdit(assembly)}
                  onDelete={() => onDelete(assembly.id)}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}