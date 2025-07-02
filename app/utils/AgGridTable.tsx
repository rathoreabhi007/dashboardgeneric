import React from 'react';
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
}

const AgGridTable: React.FC<AgGridTableProps> = ({ columns, rowData, height = 400, width = '100%' }) => {
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

    return (
        <div className="ag-theme-alpine" style={{ height, width, overflow: 'auto' }}>
            <AgGridReact
                columnDefs={enhancedColumns}
                rowData={rowData}
                domLayout="normal"
                suppressRowClickSelection={true}
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
    );
};

export default AgGridTable; 