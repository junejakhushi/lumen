interface SpecRow {
  label: string;
  value: string;
}

interface SpecTableProps {
  caption?: string;
  rows: SpecRow[];
  className?: string;
}

export function SpecTable({ caption, rows, className = "" }: SpecTableProps) {
  return (
    <table className={`qh-spec ${className}`}>
      {caption && <caption>{caption}</caption>}
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
