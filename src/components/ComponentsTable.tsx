import { ReactionComponent } from '../services/reactions';

interface ComponentsTableProps {
  components?: ReactionComponent[];
}

const headers = [
  { key: 'name', label: 'Component' },
  { key: 'role', label: 'Role' },
  { key: 'amount', label: 'Amount' },
  { key: 'phase', label: 'Phase' },
  { key: 'details', label: 'Notes' }
] as const;

const ComponentsTable = ({ components }: ComponentsTableProps) => {
  if (!components?.length) {
    return <p data-muted>No components were provided for this reaction.</p>;
  }

  return (
    <table data-table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header.key}>{header.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {components.map((component, index) => (
          <tr key={component.id ?? `${component.name}-${index}`}>
            <td>{component.name}</td>
            <td>{component.role ?? '—'}</td>
            <td>{component.amount ?? '—'}</td>
            <td>{component.phase ?? '—'}</td>
            <td>{component.details ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ComponentsTable;
