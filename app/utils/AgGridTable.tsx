import React, { useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register all community modules (required for AG Grid v34+)
ModuleRegistry.registerModules([AllCommunityModule]);

export interface AgGridTableProps {
    columns: any[];
    rowData: any[];
    height?: number | string;
    width?: number | string;
    showExportButtons?: boolean;
    exportFileName?: string;
}

const AgGridTable: React.FC<AgGridTableProps> = ({
    columns,
    rowData,
    height = 400,
    width = '100%',
    showExportButtons = true,
    exportFileName = 'data'
}) => {
    const gridRef = useRef<AgGridReact>(null);

    // Auto-detect column type and add appropriate filters
    const enhancedColumns = columns.map(col => {
        // Sample first few values to determine type
        const sampleValues = rowData.slice(0, 10).map(row => row[col.field]).filter(val => val != null);
        const isNumeric = sampleValues.length > 0 && sampleValues.every(val => !isNaN(Number(val)));

        return {
            ...col,
            filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
            floatingFilter: true,
            sortable: true,
            resizable: true,
            filterParams: isNumeric ? {
                buttons: ['reset', 'apply'],
                closeOnApply: true
            } : {
                buttons: ['reset', 'apply'],
                closeOnApply: true,
                filterOptions: ['contains', 'equals', 'startsWith', 'endsWith']
            }
        };
    });

    // Export functions
    const exportToCsv = () => {
        if (gridRef.current) {
            gridRef.current.api.exportDataAsCsv({
                fileName: `${exportFileName}.csv`,
                columnSeparator: ',',
            });
        }
    };

    const exportFilteredToCsv = () => {
        if (gridRef.current) {
            // Export current view (respects filters and sorting)
            gridRef.current.api.exportDataAsCsv({
                fileName: `${exportFileName}_filtered.csv`,
                columnSeparator: ',',
            });
        }
    };

    const exportSelectedToCsv = () => {
        if (gridRef.current) {
            gridRef.current.api.exportDataAsCsv({
                fileName: `${exportFileName}_selected.csv`,
                columnSeparator: ',',
                onlySelected: true
            });
        }
    };

    // Clear all filters function
    const clearAllFilters = () => {
        if (gridRef.current) {
            gridRef.current.api.setFilterModel(null);
        }
    };

    return (
        <div style={{ width }}>
            {showExportButtons && (
                <div style={{
                    marginBottom: '10px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={clearAllFilters}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Clear All Filters
                    </button>
                    <button
                        onClick={exportToCsv}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Export All to CSV
                    </button>
                    <button
                        onClick={exportFilteredToCsv}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Export Filtered to CSV
                    </button>
                    <button
                        onClick={exportSelectedToCsv}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Export Selected to CSV
                    </button>
                </div>
            )}
            <div className="ag-theme-alpine" style={{ height, width: '100%', overflow: 'auto' }}>
                <AgGridReact
                    ref={gridRef}
                    columnDefs={enhancedColumns}
                    rowData={rowData}
                    domLayout="normal"
                    suppressRowClickSelection={false}
                    rowSelection="multiple"
                    pagination={true}
                    paginationPageSize={50}
                    enableCellTextSelection={true}
                    theme="legacy"
                    defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                        floatingFilter: true
                    }}
                />
            </div>
        </div>
    );
};

export default AgGridTable; 