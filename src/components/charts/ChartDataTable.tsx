import type { ReactNode } from 'react'

interface ChartDataTableProps {
  caption: string
  columns: [string, string]
  rows: { key: string; label: ReactNode; value: ReactNode }[]
}

/** The chart's numbers as a table, so nothing is hover-only */
export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  return (
    <details className="group text-sm">
      <summary className="w-fit cursor-pointer rounded-md text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring">
        Show data
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-muted text-[13px] text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-medium">
                {columns[0]}
              </th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="px-3 py-1.5">{row.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
