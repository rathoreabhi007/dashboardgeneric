import React, { useRef, useState, useEffect } from 'react';
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
    height,
    width = '100%',
    showExportButtons = true,
    exportFileName = 'data'
}) => {
    const gridRef = useRef<AgGridReact>(null);
    const [tableHeight, setTableHeight] = useState<number>(600);

    // Custom pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(100);
    const [customPageSize, setCustomPageSize] = useState<string>('100');
    const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

    // Column visibility state
    const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(columns.map(col => col.field))
    );
    const [columnSearch, setColumnSearch] = useState<string>('');

    // Column filter modal state
    const [showColumnFilter, setShowColumnFilter] = useState<boolean>(false);
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [columnFilterSearch, setColumnFilterSearch] = useState<string>('');
    const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());
    const [availableValues, setAvailableValues] = useState<string[]>([]);
    const [filteredValues, setFilteredValues] = useState<string[]>([]);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });

    // Applied column filters
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: Set<string> }>({});

    // Calculate pagination with applied filters
    const getFilteredData = () => {
        let filtered = rowData;

        // Apply column filters
        Object.entries(columnFilters).forEach(([field, values]) => {
            if (values.size > 0) {
                filtered = filtered.filter(row => {
                    const cellValue = row[field]?.toString() || '';
                    return values.has(cellValue) || (values.has('(Blanks)') && (!cellValue || cellValue.trim() === ''));
                });
            }
        });

        return filtered;
    };

    const filteredData = getFilteredData();
    const totalRows = filteredData.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const displayedRows = filteredData.slice(startIndex, endIndex);

    // Calculate height based on screen size
    useEffect(() => {
        const calculateHeight = () => {
            const viewportHeight = window.innerHeight;
            const minHeight = 400;
            const maxHeight = Math.floor(viewportHeight * 0.75);
            const calculatedHeight = Math.max(minHeight, Math.min(700, maxHeight));
            setTableHeight(calculatedHeight);
        };

        calculateHeight();
        window.addEventListener('resize', calculateHeight);
        return () => window.removeEventListener('resize', calculateHeight);
    }, []);

    // Reset to page 1 when page size changes or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, columnFilters]);

    // Update filtered values when search changes
    useEffect(() => {
        if (columnFilterSearch) {
            setFilteredValues(availableValues.filter(value =>
                value.toLowerCase().includes(columnFilterSearch.toLowerCase())
            ));
        } else {
            setFilteredValues(availableValues);
        }
    }, [columnFilterSearch, availableValues]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showColumnFilter) {
                const target = event.target as HTMLElement;
                if (!target.closest('.column-filter-dropdown')) {
                    setShowColumnFilter(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColumnFilter]);

    // Column visibility functions
    const toggleColumnVisibility = (columnField: string) => {
        const newVisible = new Set(visibleColumns);
        if (newVisible.has(columnField)) {
            newVisible.delete(columnField);
        } else {
            newVisible.add(columnField);
        }
        setVisibleColumns(newVisible);
    };

    const selectAllColumns = () => {
        setVisibleColumns(new Set(columns.map(col => col.field)));
    };

    const clearAllColumns = () => {
        setVisibleColumns(new Set());
    };

    const getFilteredColumns = () => {
        if (!columnSearch) return columns;
        return columns.filter(col =>
            (col.headerName || col.field).toLowerCase().includes(columnSearch.toLowerCase())
        );
    };

    // Open column filter dropdown
    const openColumnFilter = (columnField: string, event: React.MouseEvent) => {
        // Use currentTarget instead of target to get the button element
        const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        setDropdownPosition({
            top: buttonRect.bottom + scrollTop + 5,
            left: Math.max(10, Math.min(buttonRect.left + scrollLeft - 150, window.innerWidth - 330))
        });

        setSelectedColumn(columnField);
        setColumnFilterSearch('');

        // Get unique values for this column
        const uniqueValues = [...new Set(rowData.map(row => {
            const value = row[columnField]?.toString() || '';
            return value.trim() === '' ? '(Blanks)' : value;
        }))].sort();

        setAvailableValues(uniqueValues);
        setFilteredValues(uniqueValues);

        // Set currently selected values
        const currentFilter = columnFilters[columnField] || new Set();
        setSelectedValues(new Set(currentFilter));

        setShowColumnFilter(true);
    };

    // Apply column filter
    const applyColumnFilter = () => {
        const newFilters = { ...columnFilters };
        if (selectedValues.size === 0) {
            delete newFilters[selectedColumn];
        } else {
            newFilters[selectedColumn] = new Set(selectedValues);
        }
        setColumnFilters(newFilters);
        setShowColumnFilter(false);
    };

    // Clear all column filters
    const clearAllColumnFilters = () => {
        setColumnFilters({});
    };

    // Toggle value selection
    const toggleValue = (value: string) => {
        const newSelected = new Set(selectedValues);
        if (newSelected.has(value)) {
            newSelected.delete(value);
        } else {
            newSelected.add(value);
        }
        setSelectedValues(newSelected);
    };

    // Select/Deselect all
    const toggleSelectAll = () => {
        if (selectedValues.size === filteredValues.length) {
            setSelectedValues(new Set());
        } else {
            setSelectedValues(new Set(filteredValues));
        }
    };

    // Auto-detect column type and add appropriate filters - ONLY for visible columns
    const enhancedColumns = columns
        .filter(col => visibleColumns.has(col.field))
        .map(col => {
            const sampleValues = rowData.slice(0, 10).map(row => row[col.field]).filter(val => val != null);
            const isNumeric = sampleValues.length > 0 && sampleValues.every(val => !isNaN(Number(val)));
            const hasActiveFilter = columnFilters[col.field] && columnFilters[col.field].size > 0;

            return {
                ...col,
                headerComponent: (params: any) => {
                    return (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '4px'
                        }}>
                            <span style={{
                                flex: 1,
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#1e293b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {col.headerName || col.field}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openColumnFilter(col.field, e);
                                }}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'transparent',
                                    border: hasActiveFilter ? '1px solid #10b981' : '1px solid #64748b',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    flexShrink: 0
                                }}
                                title={`Filter ${col.headerName || col.field}`}
                            >
                                <img
                                    src="/filter-icon.svg"
                                    alt="Filter"
                                    style={{
                                        width: '14px',
                                        height: '14px',
                                        filter: 'brightness(0)'
                                    }}
                                />
                            </button>
                        </div>
                    );
                },
                filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
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

    // Pagination handlers
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCustomPageSize(newSize.toString());
        setShowCustomInput(false);
    };

    const handleCustomPageSizeSubmit = () => {
        const size = parseInt(customPageSize);
        if (size && size > 0 && size <= totalRows) {
            setPageSize(size);
            setShowCustomInput(false);
        }
    };

    // Export functions - FIXED to work with full dataset and visible columns only
    const exportToCsv = () => {
        // Export ALL original data but only visible columns
        const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.field));
        const allDataCsv = convertToCSV(rowData, visibleColumnsArray);
        downloadCSV(allDataCsv, `${exportFileName}_all.csv`);
    };

    const exportFilteredToCsv = () => {
        // Apply current filters to full dataset and export visible columns only
        const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.field));
        if (gridRef.current) {
            // Get current filter model
            const filterModel = gridRef.current.api.getFilterModel();

            if (Object.keys(filterModel).length === 0) {
                // No filters applied, export all with visible columns
                const allDataCsv = convertToCSV(rowData, visibleColumnsArray);
                downloadCSV(allDataCsv, `${exportFileName}_filtered.csv`);
            } else {
                // Apply filters to full dataset
                const filteredData = applyFiltersToData(rowData, filterModel, visibleColumnsArray);
                const filteredCsv = convertToCSV(filteredData, visibleColumnsArray);
                downloadCSV(filteredCsv, `${exportFileName}_filtered.csv`);
            }
        }
    };

    const exportSelectedToCsv = () => {
        if (gridRef.current) {
            const selectedNodes = gridRef.current.api.getSelectedNodes();
            const selectedData = selectedNodes.map(node => node.data);
            if (selectedData.length > 0) {
                const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.field));
                const selectedCsv = convertToCSV(selectedData, visibleColumnsArray);
                downloadCSV(selectedCsv, `${exportFileName}_selected.csv`);
            } else {
                alert('No rows selected. Please select rows to export.');
            }
        }
    };

    const clearAllFilters = () => {
        if (gridRef.current) {
            gridRef.current.api.setFilterModel(null);
        }
        clearAllColumnFilters();
    };

    // Helper function to convert data to CSV
    const convertToCSV = (data: any[], columns: any[]) => {
        const headers = columns.map(col => col.headerName || col.field).join(',');
        const rows = data.map(row =>
            columns.map(col => {
                const value = row[col.field];
                // Handle values that contain commas or quotes
                const cleanValue = value?.toString().replace(/"/g, '""') || '';
                return cleanValue.includes(',') ? `"${cleanValue}"` : cleanValue;
            }).join(',')
        );
        return [headers, ...rows].join('\n');
    };

    // Helper function to download CSV
    const downloadCSV = (csvContent: string, fileName: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper function to apply filters to data
    const applyFiltersToData = (data: any[], filterModel: any, columns: any[]) => {
        return data.filter(row => {
            return Object.entries(filterModel).every(([field, filter]: [string, any]) => {
                const cellValue = row[field];
                const column = columns.find(col => col.field === field);

                if (!filter || cellValue == null) return true;

                // Handle different filter types
                if (filter.filterType === 'text' || typeof filter === 'object') {
                    const filterValue = filter.filter || filter.filterType;
                    const type = filter.type || 'contains';
                    const value = cellValue.toString().toLowerCase();
                    const search = filterValue?.toString().toLowerCase() || '';

                    switch (type) {
                        case 'contains': return value.includes(search);
                        case 'equals': return value === search;
                        case 'startsWith': return value.startsWith(search);
                        case 'endsWith': return value.endsWith(search);
                        default: return true;
                    }
                } else if (filter.filterType === 'number') {
                    const numValue = Number(cellValue);
                    const filterNum = Number(filter.filter);
                    const type = filter.type || 'equals';

                    switch (type) {
                        case 'equals': return numValue === filterNum;
                        case 'greaterThan': return numValue > filterNum;
                        case 'lessThan': return numValue < filterNum;
                        case 'greaterThanOrEqual': return numValue >= filterNum;
                        case 'lessThanOrEqual': return numValue <= filterNum;
                        default: return true;
                    }
                }

                return true;
            });
        });
    };

    const finalHeight = height ? (typeof height === 'number' ? height : parseInt(height.toString())) : tableHeight;

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div style={{
            width,
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
        }}>
            {/* Top Section with Export Buttons, Column Selector, and Value Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                {/* Export Buttons - Ultra Compact */}
                {showExportButtons && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        padding: '0 4px',
                        marginBottom: '8px'
                    }}>
                        <button onClick={clearAllFilters} style={{
                            padding: '6px 10px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                        }}>
                            Clear All Filters
                        </button>
                        <button onClick={exportToCsv} style={{
                            padding: '6px 10px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                        }}>
                            Export All to CSV
                        </button>
                        <button onClick={exportFilteredToCsv} style={{
                            padding: '6px 10px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                        }}>
                            Export Filtered to CSV
                        </button>
                        <button onClick={exportSelectedToCsv} style={{
                            padding: '6px 10px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                        }}>
                            Export Selected to CSV
                        </button>
                    </div>
                )}

                {/* Right side controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Column Visibility Selector */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px',
                        backgroundColor: '#1e293b',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                backgroundColor: '#334155',
                                color: '#e2e8f0',
                                border: '1px solid #64748b',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            📋 Select ({visibleColumns.size}/{columns.length})
                        </button>

                        {/* Column Selector Dropdown */}
                        {showColumnSelector && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                backgroundColor: '#1e293b',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                zIndex: 1000,
                                minWidth: '250px',
                                maxHeight: '400px',
                                marginTop: '4px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #475569',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>
                                        Select Columns
                                    </span>
                                    <button
                                        onClick={() => setShowColumnSelector(false)}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#94a3b8',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Search */}
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid #475569' }}>
                                    <input
                                        type="text"
                                        placeholder="Search columns..."
                                        value={columnSearch}
                                        onChange={(e) => setColumnSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '4px 6px',
                                            backgroundColor: '#334155',
                                            color: '#e2e8f0',
                                            border: '1px solid #64748b',
                                            borderRadius: '3px',
                                            fontSize: '10px'
                                        }}
                                    />
                                </div>

                                {/* Select All / Clear All */}
                                <div style={{ padding: '6px 12px', borderBottom: '1px solid #475569', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={selectAllColumns}
                                        style={{
                                            padding: '3px 8px',
                                            fontSize: '10px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={clearAllColumns}
                                        style={{
                                            padding: '3px 8px',
                                            fontSize: '10px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>

                                {/* Column List */}
                                <div style={{
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    padding: '6px 0'
                                }}>
                                    {getFilteredColumns().map(col => (
                                        <label
                                            key={col.field}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '3px 12px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                color: '#e2e8f0'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.has(col.field)}
                                                onChange={() => toggleColumnVisibility(col.field)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {col.headerName || col.field}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear All Filters Button */}
                    {Object.keys(columnFilters).length > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px',
                            backgroundColor: '#1e293b',
                            borderRadius: '6px',
                            border: '1px solid #475569'
                        }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                Active Filters:
                            </span>
                            <button
                                onClick={clearAllColumnFilters}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '10px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear All ({Object.keys(columnFilters).length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid Container */}
            <div
                className="ag-theme-alpine"
                style={{
                    height: `${finalHeight - 110}px`,
                    width: '100%',
                    border: '1px solid #475569',
                    borderRadius: '6px 6px 0 0'
                }}
            >
                <AgGridReact
                    ref={gridRef}
                    columnDefs={enhancedColumns}
                    rowData={displayedRows}

                    // Disable built-in pagination
                    pagination={false}

                    // Grid layout settings
                    domLayout="normal"

                    // Selection settings
                    suppressRowClickSelection={false}
                    rowSelection="multiple"

                    // Theme
                    theme="legacy"

                    // Column settings
                    defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                        minWidth: 100,
                        flex: 1
                    }}

                    // Text selection
                    enableCellTextSelection={true}

                    // Grid behavior
                    suppressHorizontalScroll={false}
                    suppressMenuHide={false}

                    // Event handlers
                    onGridReady={(params) => {
                        params.api.sizeColumnsToFit();
                    }}

                    onGridSizeChanged={(params) => {
                        params.api.sizeColumnsToFit();
                    }}
                />
            </div>

            {/* CUSTOM PAGINATION CONTROLS - ULTRA COMPACT */}
            <div style={{
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                minHeight: '42px',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: '500',
                boxSizing: 'border-box',
                marginBottom: '6px'
            }}>
                {/* Left side - Row info and page size controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ whiteSpace: 'nowrap', fontSize: '11px' }}>
                        Showing {startIndex + 1} to {endIndex} of {totalRows} entries
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ whiteSpace: 'nowrap', fontSize: '11px' }}>Show:</span>

                        {/* Quick page size buttons - Ultra Compact */}
                        {[50, 100, 250, 500, 1000].map(size => (
                            <button
                                key={size}
                                onClick={() => handlePageSizeChange(size)}
                                style={{
                                    backgroundColor: pageSize === size ? '#10b981' : '#475569',
                                    color: '#e2e8f0',
                                    border: '1px solid #64748b',
                                    padding: '4px 8px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    minWidth: '32px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {size}
                            </button>
                        ))}

                        {/* Custom number input - Ultra Compact */}
                        {!showCustomInput ? (
                            <button
                                onClick={() => setShowCustomInput(true)}
                                style={{
                                    backgroundColor: '#475569',
                                    color: '#e2e8f0',
                                    border: '1px solid #64748b',
                                    padding: '4px 8px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Custom
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                    type="number"
                                    value={customPageSize}
                                    onChange={(e) => setCustomPageSize(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCustomPageSizeSubmit()}
                                    style={{
                                        width: '60px',
                                        padding: '4px 6px',
                                        backgroundColor: '#475569',
                                        color: '#e2e8f0',
                                        border: '1px solid #64748b',
                                        borderRadius: '3px',
                                        fontSize: '10px'
                                    }}
                                    min="1"
                                    max={totalRows}
                                    placeholder="Any #"
                                />
                                <button
                                    onClick={handleCustomPageSizeSubmit}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        padding: '4px 7px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '9px'
                                    }}
                                >
                                    Set
                                </button>
                                <button
                                    onClick={() => setShowCustomInput(false)}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '4px 7px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '9px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <span style={{ whiteSpace: 'nowrap', fontSize: '11px' }}>rows</span>
                    </div>
                </div>

                {/* Right side - Page navigation - Ultra Compact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            backgroundColor: currentPage === 1 ? '#1e293b' : '#475569',
                            color: currentPage === 1 ? '#64748b' : '#e2e8f0',
                            border: '1px solid #64748b',
                            padding: '5px 9px',
                            borderRadius: '3px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '10px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Previous
                    </button>

                    {getPageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span style={{ padding: '5px 4px', color: '#94a3b8', fontSize: '10px' }}>...</span>
                            ) : (
                                <button
                                    onClick={() => goToPage(page as number)}
                                    style={{
                                        backgroundColor: currentPage === page ? '#10b981' : '#475569',
                                        color: '#e2e8f0',
                                        border: '1px solid #64748b',
                                        padding: '5px 9px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: currentPage === page ? '600' : '500',
                                        minWidth: '28px'
                                    }}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            backgroundColor: currentPage === totalPages ? '#1e293b' : '#475569',
                            color: currentPage === totalPages ? '#64748b' : '#e2e8f0',
                            border: '1px solid #64748b',
                            padding: '5px 9px',
                            borderRadius: '3px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '10px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Status Info - Ultra Compact */}
            <div style={{
                fontSize: '10px',
                color: '#64748b',
                padding: '5px 8px',
                backgroundColor: '#1e293b',
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                <span>Page {currentPage} of {totalPages}</span>
                <span>Showing {pageSize} rows per page</span>
                <span>Total: {totalRows} rows | Columns: {visibleColumns.size}/{columns.length} visible</span>
            </div>

            {/* Column Filter Dropdown */}
            {showColumnFilter && (
                <div
                    className="column-filter-dropdown"
                    style={{
                        position: 'fixed',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        width: '320px',
                        maxHeight: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 9999,
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #475569',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>
                            Filter: {columns.find(c => c.field === selectedColumn)?.headerName || selectedColumn}
                        </h3>
                        <button
                            onClick={() => setShowColumnFilter(false)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #475569' }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={columnFilterSearch}
                            onChange={(e) => setColumnFilterSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                backgroundColor: '#334155',
                                color: '#e2e8f0',
                                border: '1px solid #64748b',
                                borderRadius: '4px',
                                fontSize: '11px'
                            }}
                        />
                    </div>

                    {/* Select All */}
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #475569' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#e2e8f0' }}>
                            <input
                                type="checkbox"
                                checked={selectedValues.size === filteredValues.length && filteredValues.length > 0}
                                onChange={toggleSelectAll}
                            />
                            Select All
                        </label>
                    </div>

                    {/* Values List */}
                    <div style={{
                        maxHeight: '250px',
                        overflowY: 'auto',
                        padding: '8px 0'
                    }}>
                        {filteredValues.map(value => (
                            <label
                                key={value}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '4px 16px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    color: '#e2e8f0'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.has(value)}
                                    onChange={() => toggleValue(value)}
                                />
                                {value}
                            </label>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid #475569',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            onClick={() => setShowColumnFilter(false)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#475569',
                                color: '#e2e8f0',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={applyColumnFilter}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgGridTable; 