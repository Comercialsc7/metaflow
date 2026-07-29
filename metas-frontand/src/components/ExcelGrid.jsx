import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

export default function ExcelGrid({
  rowData,
  columnDefs,
  height = 380,
  rowHeight = 42,
  context,
  onCellValueChanged,
  onModelUpdated,
  suppressRowClickSelection = true,
  ...gridProps
}) {
  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filter: true,
      editable: false,
      cellDataType: false,
    }),
    [],
  )

  return (
    <div className="excel-grid-shell" style={{ height }}>
      <div className="ag-theme-quartz excel-grid-theme" style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          context={context}
          rowHeight={rowHeight}
          rowSelection="multiple"
          suppressRowClickSelection={suppressRowClickSelection}
          copyHeadersToClipboard
          enableCellTextSelection
          suppressMovableColumns={false}
          cellSelection
          onCellValueChanged={onCellValueChanged}
          onModelUpdated={onModelUpdated}
          {...gridProps}
        />
      </div>
    </div>
  )
}