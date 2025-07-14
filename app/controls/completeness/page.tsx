'use client';

import { useState, useCallback, useRef, useEffect, useMemo, createContext, useContext, memo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    MiniMap,
    Connection,
    addEdge,
    ConnectionMode,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaCircle, FaPlay, FaStop, FaUndo, FaChevronLeft, FaChevronUp, FaFolder, FaGripLines, FaChartBar, FaTable, FaFileAlt, FaExclamationTriangle } from 'react-icons/fa';
import { ApiService } from '@/app/services/api';
import { buildDependencyMap, buildDownstreamMap, runNodeWithDependencies, getAllDownstreamNodes } from '@/app/utils/graph-utils';
import { HandlerContext, HandlerContextType } from '@/app/controls/completeness/HandlerContext';
import AgGridTable from '@/app/utils/AgGridTable';
import UserAttributesIcon from '@/app/components/UserAttributesIcon';
import DocumentSearchIcon from '@/app/components/DocumentSearchIcon';
import LibraryBooksIcon from '@/app/components/LibraryBooksIcon';
import TableEditIcon from '@/app/components/TableEditIcon';
import DatasetLinkedIcon from '@/app/components/DatasetLinkedIcon';
import TableConvertIcon from '@/app/components/TableConvertIcon';
import StacksIcon from '@/app/components/StacksIcon';
import DataInfoAlertIcon from '@/app/components/DataInfoAlertIcon';
import OutputIcon from '@/app/components/OutputIcon';
import ChangeCircleIcon from '@/app/components/ChangeCircleIcon';

// Node status types
type NodeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'standby' | 'stopped';

// Add these styles at the top of the file after imports
const styles = {
    selectedNode: {
        border: '2px solid #334155',
        boxShadow: '0 0 0 2px rgba(51, 65, 85, 0.2)',
        transform: 'scale(1.02)',
        transition: 'all 0.2s ease'
    },
    hoveredNode: {
        border: '2px solid #334155',
        boxShadow: '0 0 0 2px rgba(51, 65, 85, 0.1)',
        transform: 'scale(1.01)',
        transition: 'all 0.2s ease'
    }
};

const initialNodes: Node[] = [
    // Initial nodes
    {
        id: 'reading_config_comp',
        type: 'custom',
        data: { fullName: 'Reading_Config_Comp', status: 'idle' },
        position: { x: 100, y: 250 },
        draggable: false
    },
    {
        id: 'read_src_comp',
        type: 'custom',
        data: { fullName: 'Read_SRC_Comp', status: 'idle' },
        position: { x: 300, y: 100 },
        draggable: false
    },
    {
        id: 'read_tgt_comp',
        type: 'custom',
        data: { fullName: 'Read_TGT_Comp', status: 'idle' },
        position: { x: 300, y: 400 },
        draggable: false
    },
    // Top flow nodes (SRC)
    {
        id: 'pre_harmonisation_src_comp',
        type: 'custom',
        data: { fullName: 'Reading & Pre-Harmonisation_SRC', status: 'idle' },
        position: { x: 500, y: 100 },
        draggable: false
    },
    {
        id: 'harmonisation_src_comp',
        type: 'custom',
        data: { fullName: 'Harmonisation_SRC', status: 'idle' },
        position: { x: 700, y: 100 },
        draggable: false
    },
    {
        id: 'enrichment_file_search_src_comp',
        type: 'custom',
        data: { fullName: 'Enrichment File Search_SRC', status: 'idle' },
        position: { x: 900, y: 100 },
        draggable: false
    },
    {
        id: 'enrichment_src_comp',
        type: 'custom',
        data: { fullName: 'Enrichment_SRC', status: 'idle' },
        position: { x: 1100, y: 100 },
        draggable: false
    },
    {
        id: 'data_transform_src_comp',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment_SRC', status: 'idle' },
        position: { x: 1300, y: 100 },
        draggable: false
    },
    {
        id: 'combine_data_comp',
        type: 'custom',
        data: { fullName: 'Combine SRC and TGT Data', status: 'idle' },
        position: { x: 1500, y: 250 },
        draggable: false
    },
    {
        id: 'apply_rules_comp',
        type: 'custom',
        data: { fullName: 'Apply Rec Rules & Break Explain', status: 'idle' },
        position: { x: 1700, y: 250 },
        draggable: false
    },
    {
        id: 'output_rules_comp',
        type: 'custom',
        data: { fullName: 'Output Rules', status: 'idle' },
        position: { x: 1900, y: 250 },
        draggable: false
    },
    {
        id: 'break_rolling_comp',
        type: 'custom',
        data: { fullName: 'BreakRolling Details', status: 'idle' },
        position: { x: 2100, y: 250 },
        draggable: false
    },
    // Bottom flow nodes (TGT)
    {
        id: 'pre_harmonisation_tgt_comp',
        type: 'custom',
        data: { fullName: 'Reading & Pre-Harmonisation_TGT', status: 'idle' },
        position: { x: 500, y: 400 },
        draggable: false
    },
    {
        id: 'harmonisation_tgt_comp',
        type: 'custom',
        data: { fullName: 'Harmonisation_TGT', status: 'idle' },
        position: { x: 700, y: 400 },
        draggable: false
    },
    {
        id: 'enrichment_file_search_tgt_comp',
        type: 'custom',
        data: { fullName: 'Enrichment File Search_TGT', status: 'idle' },
        position: { x: 900, y: 400 },
        draggable: false
    },
    {
        id: 'enrichment_tgt_comp',
        type: 'custom',
        data: { fullName: 'Enrichment_TGT', status: 'idle' },
        position: { x: 1100, y: 400 },
        draggable: false
    },
    {
        id: 'data_transform_tgt_comp',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment_TGT', status: 'idle' },
        position: { x: 1300, y: 400 },
        draggable: false
    }
];

const initialEdges: Edge[] = [
    // Initial flow to SRC
    {
        id: 'config-to-read-src',
        source: 'reading_config_comp',
        target: 'read_src_comp',
        sourceHandle: 'reading_config_comp-source',
        targetHandle: 'read_src_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Initial flow to TGT
    {
        id: 'config-to-file-search-tgt',
        source: 'reading_config_comp',
        target: 'read_tgt_comp',
        sourceHandle: 'reading_config_comp-source',
        targetHandle: 'read_tgt_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Top flow edges (SRC)
    {
        id: 'read-src-to-pre-harmonisation-src',
        source: 'read_src_comp',
        target: 'pre_harmonisation_src_comp',
        sourceHandle: 'read_src_comp-source',
        targetHandle: 'pre_harmonisation_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'pre-harmonisation-to-harmonisation-src',
        source: 'pre_harmonisation_src_comp',
        target: 'harmonisation_src_comp',
        sourceHandle: 'pre_harmonisation_src_comp-source',
        targetHandle: 'harmonisation_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment-search-src',
        source: 'harmonisation_src_comp',
        target: 'enrichment_file_search_src_comp',
        sourceHandle: 'harmonisation_src_comp-source',
        targetHandle: 'enrichment_file_search_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-search-to-enrichment-src',
        source: 'enrichment_file_search_src_comp',
        target: 'enrichment_src_comp',
        sourceHandle: 'enrichment_file_search_src_comp-source',
        targetHandle: 'enrichment_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform',
        source: 'enrichment_src_comp',
        target: 'data_transform_src_comp',
        sourceHandle: 'enrichment_src_comp-source',
        targetHandle: 'data_transform_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine',
        source: 'data_transform_src_comp',
        target: 'combine_data_comp',
        sourceHandle: 'data_transform_src_comp-source',
        targetHandle: 'combine_data_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Bottom flow edges (TGT)
    {
        id: 'read-tgt-to-pre-harmonisation-tgt',
        source: 'read_tgt_comp',
        target: 'pre_harmonisation_tgt_comp',
        sourceHandle: 'read_tgt_comp-source',
        targetHandle: 'pre_harmonisation_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'pre-harmonisation-to-harmonisation-tgt',
        source: 'pre_harmonisation_tgt_comp',
        target: 'harmonisation_tgt_comp',
        sourceHandle: 'pre_harmonisation_tgt_comp-source',
        targetHandle: 'harmonisation_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment-search-tgt',
        source: 'harmonisation_tgt_comp',
        target: 'enrichment_file_search_tgt_comp',
        sourceHandle: 'harmonisation_tgt_comp-source',
        targetHandle: 'enrichment_file_search_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-search-to-enrichment-tgt',
        source: 'enrichment_file_search_tgt_comp',
        target: 'enrichment_tgt_comp',
        sourceHandle: 'enrichment_file_search_tgt_comp-source',
        targetHandle: 'enrichment_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform-tgt',
        source: 'enrichment_tgt_comp',
        target: 'data_transform_tgt_comp',
        sourceHandle: 'enrichment_tgt_comp-source',
        targetHandle: 'data_transform_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine-tgt',
        source: 'data_transform_tgt_comp',
        target: 'combine_data_comp',
        sourceHandle: 'data_transform_tgt_comp-source',
        targetHandle: 'combine_data_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Final flow edges
    {
        id: 'combine-to-rules',
        source: 'combine_data_comp',
        target: 'apply_rules_comp',
        sourceHandle: 'combine_data_comp-source',
        targetHandle: 'apply_rules_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'rules-to-output',
        source: 'apply_rules_comp',
        target: 'output_rules_comp',
        sourceHandle: 'apply_rules_comp-source',
        targetHandle: 'output_rules_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'output-to-break',
        source: 'output_rules_comp',
        target: 'break_rolling_comp',
        sourceHandle: 'output_rules_comp-source',
        targetHandle: 'break_rolling_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    }
];

// Add this type for run parameter validation
type RunParameterValidation = {
    isValid: boolean;
    message: string;
};

// Add this type for run parameters
type LocalRunParameters = {
    expectedRunDate: string;
    inputConfigFilePath: string;
    inputConfigFilePattern: string;
    rootFileDir: string;
    runEnv: string;
    tempFilePath: string;
};

// Define the CustomNode component outside the main component
const CustomNode = memo(({ data, id, nodeOutputs, setSelectedNode, setSelectedTab }: {
    data: any;
    id: string;
    nodeOutputs: { [key: string]: any };
    setSelectedNode: (node: any) => void;
    setSelectedTab: (tab: string) => void;
}) => {
    const { runNode, resetNodeAndDownstream } = useContext(HandlerContext) as HandlerContextType;
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showSourceTooltip, setShowSourceTooltip] = useState(false);
    const [isOutputHovered, setIsOutputHovered] = useState(false); // <-- add this line
    const isRunning = data.status === 'running';
    const canReset = data.status === 'failed' || data.status === 'completed' || data.status === 'stopped';
    const isSelected = data.selected || false;
    const canRun = data.areParamsApplied && !isRunning;

    // Base node style
    const baseStyle = {
        transition: 'all 0.2s ease',
        border: '2px solid transparent',
        boxShadow: 'none',
        transform: 'scale(1)'
    };

    // Compute node style based on state
    const nodeStyle = {
        ...baseStyle,
        ...(isSelected && styles.selectedNode),
        ...(isHovered && !isSelected && styles.hoveredNode),
        ...(data.style || {}) // Allow for custom styles from parent
    };

    // Icon container style with state-based colors
    const getIconContainerStyle = () => {
        return [
            "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 relative",
            "before:absolute before:inset-0 before:rounded-full before:border before:border-black",
            "after:absolute after:inset-[3px] after:rounded-full"
        ].join(" ");
    };

    return (
        <div
            className="relative flex flex-col items-center"
            style={nodeStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowTooltip(false);
            }}
        >
            <div
                className="relative"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #2a2a2a',      // Enhanced border
                    borderRadius: '50%',
                    width: 68,
                    height: 68,
                    background: 'linear-gradient(145deg, #f0f0f0 0%, #d1d1d1 50%, #b8b8b8 100%)',
                    // boxShadow: `
                    //     0 8px 16px rgba(0,0,0,0.3),
                    //     0 4px 8px rgba(0,0,0,0.2),
                    //     0 2px 4px rgba(0,0,0,0.1),
                    //     inset 0 1px 0 rgba(255,255,255,0.8),
                    //     inset 0 -1px 0 rgba(0,0,0,0.2)
                    // `,
                    transform: 'perspective(500px) rotateX(5deg)',
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: '#10b981',
                        border: '2px solid #ffffff',
                        width: '12px',
                        height: '12px',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        top: '50%',
                        left: '-18px',
                        transform: 'translateY(-50%)',
                        position: 'absolute'
                    }}
                    id={`${id}-target`}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        background: '#10b981',
                        border: '2px solid #ffffff',
                        width: '12px',
                        height: '12px',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        top: '50%',
                        right: '-18px',
                        transform: 'translateY(-50%)',
                        position: 'absolute'
                    }}
                    id={`${id}-source`}
                />
                {/* Output handle for viewing data */}
                <div
                    className={"absolute"}
                    style={{
                        background: '#22c55e',
                        border: `2px solid ${isOutputHovered ? '#000000' : '#d1d5db'}`,
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        top: '50%',
                        right: '-24px',
                        transform: `translateY(-50%) scale(${isOutputHovered ? 1.2 : 1})`,
                        position: 'absolute',
                        transition: 'all 0.2s ease',
                        boxShadow: isOutputHovered
                            ? '0 4px 8px rgba(0,0,0,0.3)'
                            : '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 10
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Set the selected node with its output data
                        const output = (nodeOutputs && nodeOutputs[id]) ? nodeOutputs[id] : {};
                        setSelectedNode({
                            id,
                            data: {
                                ...data,
                                output
                            }
                        });
                        // Set the default tab to 'data' for data output
                        setSelectedTab('data');
                    }}
                    onMouseEnter={() => {
                        setShowSourceTooltip(true);
                        setIsOutputHovered(true);
                    }}
                    onMouseLeave={() => {
                        setShowSourceTooltip(false);
                        setIsOutputHovered(false);
                    }}
                />
                {showSourceTooltip && (
                    <div className="absolute top-1/2 right-[-90px] transform -translate-y-1/2 px-2 py-1 text-[10px] 
                        bg-slate-900 text-white rounded whitespace-nowrap z-50">
                        Click to view data
                    </div>
                )}
                <div
                    style={{
                        border: '4px solid white',    // Middle thick white border
                        borderRadius: '50%',
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #e8e8e8 100%)',
                        // boxShadow: `
                        //     inset 0 2px 4px rgba(255,255,255,0.9),
                        //     inset 0 -2px 4px rgba(0,0,0,0.1)
                        // `,
                    }}
                >
                    <div
                        style={{
                            background: `
                                radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
                                linear-gradient(145deg, rgb(240, 20, 40) 0%, rgb(219, 0, 17) 50%, rgb(180, 0, 14) 100%)
                            `,
                            borderRadius: '50%',
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            // boxShadow: `
                            //     0 4px 8px rgba(219, 0, 17, 0.4),
                            //     0 2px 4px rgba(0,0,0,0.3),
                            //     inset 0 1px 0 rgba(255,255,255,0.3),
                            //     inset 0 -1px 0 rgba(0,0,0,0.2)
                            // `,
                            border: '1px solid rgba(150, 0, 12, 0.8)',
                        }}
                    >
                        {(() => {
                            // Function to get the appropriate icon based on node ID
                            const getNodeIcon = (nodeId: string) => {
                                // Reading config node
                                if (nodeId === 'reading_config_comp') {
                                    return <UserAttributesIcon size={44} color="white" />;
                                }
                                // File searching/reading nodes
                                else if (nodeId === 'read_src_comp' || nodeId === 'read_tgt_comp') {
                                    return <DocumentSearchIcon size={44} color="white" />;
                                }
                                // Pre-harmonisation nodes (reading & pre-harmonisation)
                                else if (nodeId.includes('pre_harmonisation')) {
                                    return <LibraryBooksIcon size={44} color="white" />;
                                }
                                // Harmonisation nodes (but not pre-harmonisation)
                                else if (nodeId.includes('harmonisation') && !nodeId.includes('pre_harmonisation')) {
                                    return <TableEditIcon size={44} color="white" />;
                                }
                                // Enrichment file search nodes
                                else if (nodeId.includes('enrichment_file_search')) {
                                    return <DocumentSearchIcon size={44} color="white" />;
                                }
                                // Enrichment nodes (but not file search)
                                else if (nodeId.includes('enrichment') && !nodeId.includes('file_search')) {
                                    return <DatasetLinkedIcon size={44} color="white" />;
                                }
                                // Data transform nodes
                                else if (nodeId.includes('data_transform')) {
                                    return <TableConvertIcon size={44} color="white" />;
                                }
                                // Combine data node
                                else if (nodeId === 'combine_data_comp') {
                                    return <StacksIcon size={44} color="white" />;
                                }
                                // Apply rules node
                                else if (nodeId === 'apply_rules_comp') {
                                    return <DataInfoAlertIcon size={44} color="white" />;
                                }
                                // Output rules node
                                else if (nodeId === 'output_rules_comp') {
                                    return <OutputIcon size={44} color="white" />;
                                }
                                // Break rolling node
                                else if (nodeId === 'break_rolling_comp') {
                                    return <ChangeCircleIcon size={44} color="white" />;
                                }
                                // Default fallback
                                else {
                                    return (
                                        <img
                                            src="/nodecubic.png"
                                            alt="Node"
                                            style={{
                                                width: '96%',
                                                height: '96%',
                                                objectFit: 'contain',
                                                background: 'none',
                                            }}
                                        />
                                    );
                                }
                            };

                            const icon = getNodeIcon(id);

                            // If it's an icon component (not the default image), wrap it in the styled container
                            if (typeof icon.type === 'function') {
                                return (
                                    <div style={{
                                        width: '96%',
                                        height: '96%',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(78, 94, 103, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        aspectRatio: '1'
                                    }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {icon}
                                        </div>
                                    </div>
                                );
                            } else {
                                // For the default image, return it as-is
                                return icon;
                            }
                        })()}
                    </div>
                </div>
            </div>
            {/* Status badge below the node */}
            <div className="flex justify-center w-full">
                <div className={`relative -mt-3 z-20 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md
                    ${data.status === 'completed' ? 'bg-green-500' :
                        data.status === 'failed' ? 'bg-red-500' :
                            data.status === 'running' ? 'bg-yellow-400' :
                                data.status === 'stopped' ? 'bg-red-500' :
                                    'bg-slate-400'}
                `}>
                    {data.status === 'running' && <FaSpinner className="animate-spin text-white w-3.5 h-3.5" />}
                    {data.status === 'completed' && <FaCheckCircle className="text-white w-3.5 h-3.5" />}
                    {data.status === 'failed' && <FaTimesCircle className="text-white w-3.5 h-3.5" />}
                    {data.status === 'stopped' && <FaStop className="text-white w-3.5 h-3.5" />}
                    {data.status === 'standby' && <FaCircle className="text-white/80 w-3.5 h-3.5" />}
                </div>
            </div>


            <div className="text-[10px] text-black mt-1 max-w-[80px] text-center font-medium">{data.fullName}</div>
            <div className="flex gap-1 mt-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        canRun && runNode(id);
                    }}
                    disabled={!canRun}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] relative
                        ${!canRun
                            ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                >
                    <FaPlay className="w-1.5 h-1.5" />
                    Run
                    {showTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[8px] 
                            bg-slate-900 text-white rounded whitespace-nowrap z-50">
                            {canRun ? "Click to run node" : "Node is running"}
                        </div>
                    )}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onStop?.(id);
                    }}
                    disabled={!isRunning}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] ${!isRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-red-400'
                        }`}
                >
                    <FaStop className="w-1.5 h-1.5" />
                    Stop
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        resetNodeAndDownstream(id);
                    }}
                    disabled={!canReset && !isRunning}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] ${!canReset && !isRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                >
                    <FaUndo className="w-1.5 h-1.5" />
                    Reset
                </button>
            </div>
        </div>
    );
});

// Utility function to safely manage localStorage quota
const safeLocalStorageSet = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, attempting to free space...');
            // Clear old node outputs to free space
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('nodeOutputs_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn('Failed to remove key:', key);
                }
            });

            // Try again after cleanup
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (retryError) {
                console.warn('Still failed to save to localStorage after cleanup');
                return false;
            }
        }
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
};

export default function CompletenessControl({ instanceId }: { instanceId?: string }) {
    // Define instance-specific localStorage keys
    const paramKey = `validatedParams_${instanceId || 'default'}`;
    const nodeOutputsKey = `nodeOutputs_${instanceId || 'default'}`;
    const nodesKey = `nodes_${instanceId || 'default'}`;

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [isBottomBarOpen, setIsBottomBarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<'sidebar' | 'bottombar' | null>(null);
    const [bottomBarHeight, setBottomBarHeight] = useState(() => {
        // Responsive initial height based on screen size
        if (typeof window !== 'undefined') {
            const vh = window.innerHeight;
            return Math.min(Math.max(vh * 0.3, 200), vh * 0.6); // 30-60% of viewport height
        }
        return 300; // fallback
    });
    const [isResizingBottom, setIsResizingBottom] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [areParamsApplied, setAreParamsApplied] = useState(() => {
        const saved = localStorage.getItem(paramKey);
        if (!saved) return false;
        try {
            const params = JSON.parse(saved);
            return Object.values(params).every(v => v && String(v).trim() !== '');
        } catch {
            return false;
        }
    });
    const resizeRef = useRef<HTMLDivElement>(null);
    const minWidth = 48;
    const maxWidth = 800;
    const minHeight = 200;  // Increase minimum height for better usability
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600;  // Max 80% of viewport
    const nodeTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [runParams, setRunParams] = useState<LocalRunParameters>(() => {
        const saved = localStorage.getItem(paramKey);
        return saved
            ? JSON.parse(saved)
            : {
                expectedRunDate: '',
                inputConfigFilePath: '',
                inputConfigFilePattern: '',
                rootFileDir: '',
                runEnv: '',
                tempFilePath: ''
            };
    });
    const [processIds, setProcessIds] = useState<{ [key: string]: string }>({});
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
    const [validatedParams, setValidatedParams] = useState<LocalRunParameters | null>(null);
    const [nodeOutputs, setNodeOutputs] = useState<{ [nodeId: string]: any }>(() => {
        const savedOutputs = localStorage.getItem(nodeOutputsKey);
        if (savedOutputs) {
            try {
                const parsed = JSON.parse(savedOutputs);
                console.log('🔄 Restored node outputs from localStorage:', Object.keys(parsed));
                // Log table sizes for verification
                Object.entries(parsed).forEach(([nodeId, output]: [string, any]) => {
                    if (output?.calculation_results?.table_size) {
                        console.log(`   - ${nodeId}: ${output.calculation_results.table_size}`);
                    }
                });
                return parsed;
            } catch (error) {
                console.warn('Failed to parse saved node outputs:', error);
                return {};
            }
        }
        return {};
    });
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
    const cancelledNodesRef = useRef<Set<string>>(new Set());
    const forceUpdate = useState({})[1];

    // Add validation state
    const [paramValidation, setParamValidation] = useState<RunParameterValidation>({
        isValid: false,
        message: 'Please fill all required parameters'
    });

    // Add this at the top level of CompletenessControl, with other useState hooks
    const [histogramSearch, setHistogramSearch] = useState('');
    const [histogramFilterType, setHistogramFilterType] = useState('contains');
    const [histogramFilterValue, setHistogramFilterValue] = useState('');

    // Column selector for Data Output tab


    // Restore nodes from localStorage if available, otherwise use initialNodes
    const restoredNodes = (() => {
        const saved = localStorage.getItem(nodesKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // fallback to initialNodes
            }
        }
        return initialNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                areParamsApplied,
                nodeOutputs,
                setSelectedNode
            }
        }));
    })();
    const [nodes, setNodes, onNodesChange] = useNodesState(
        restoredNodes.map((node: Node) => ({
            ...node,
            data: {
                ...node.data,
                areParamsApplied,
                nodeOutputs,
                setSelectedNode
            }
        }))
    );

    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Build dependency and downstream maps from edges
    const dependencyMap = useMemo(() => buildDependencyMap(edges), [edges]);
    const downstreamMap = useMemo(() => buildDownstreamMap(edges), [edges]);

    // Helper: get node status map
    const nodeStatusMap = useMemo(() => {
        const map: Record<string, string> = {};
        nodes.forEach(n => { map[n.id] = n.data.status; });
        return map;
    }, [nodes]);

    const updateNodeStatus = useCallback((nodeId: string, status: NodeStatus) => {
        console.log(`Node ${nodeId} status updated to: ${status}`);

        // Update node status
        setNodes(nds => nds.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, status } }
                : node
        ));

        // Update edge colors and labels based on source node status
        setEdges(eds => eds.map(edge => {
            if (edge.source === nodeId) {
                const sourceOutput = nodeOutputs && nodeOutputs[nodeId];
                const rowCount = sourceOutput?.calculation_results?.table?.length;

                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: status === 'completed' ? '#22c55e' : '#1e293b'
                    },
                    label: status === 'completed' && rowCount && rowCount > 0 ?
                        rowCount.toLocaleString() : undefined,
                    labelStyle: {
                        fill: '#1f2937',
                        fontWeight: 'bold',
                        fontSize: '10px'
                    },
                    labelBgStyle: {
                        fill: '#ffffff',
                        fillOpacity: 0.9,
                        stroke: '#d1d5db',
                        strokeWidth: 1
                    },
                    labelBgPadding: [4, 8],
                    labelBgBorderRadius: 4
                };
            }
            return edge;
        }));
    }, [setNodes, setEdges]);

    // Function to handle connections
    const onConnect = useCallback((params: Connection) => {
        // Add source and target handles to the connection
        const connection = {
            ...params,
            sourceHandle: `${params.source}-source`,
            targetHandle: `${params.target}-target`
        };
        setEdges((eds) => addEdge(connection, eds));
    }, [setEdges]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(nodeTimeouts.current).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    const handleParamChange = (param: string, value: string) => {
        // Clean the input value by trimming whitespace
        const cleanValue = value.trim();

        setRunParams(prev => ({
            ...prev,
            [param]: cleanValue
        }));

        // Clear the error state for this field when user types
        if (invalidFields.has(param)) {
            const newInvalidFields = new Set(invalidFields);
            newInvalidFields.delete(param);
            setInvalidFields(newInvalidFields);
        }
    };

    const validateParameters = useCallback(() => {
        const newInvalidFields = new Set<string>();
        let hasErrors = false;

        // Check each parameter for empty or whitespace-only values
        Object.entries(runParams).forEach(([key, value]) => {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                newInvalidFields.add(key);
                hasErrors = true;
                console.log(`❌ Validation Error: ${key} is empty or contains only whitespace`);
            }
        });

        setInvalidFields(newInvalidFields);

        setParamValidation({
            isValid: !hasErrors,
            message: hasErrors ? 'Please fill in all required fields' : 'Parameters are valid'
        });

        if (!hasErrors) {
            console.log('✅ All parameters are valid:', runParams);
            const success = safeLocalStorageSet(paramKey, JSON.stringify(runParams));
            if (!success) {
                console.warn('Failed to save parameters to localStorage');
            }
            setValidatedParams(runParams);
            setAreParamsApplied(true);
        } else {
            try {
                localStorage.removeItem(paramKey);
            } catch (error) {
                console.warn('Failed to remove parameters from localStorage:', error);
            }
            setAreParamsApplied(false);
        }

        return !hasErrors;
    }, [runParams, paramKey]);

    const handleApplyParams = useCallback(() => {
        const isValid = validateParameters();
        if (!isValid) {
            console.log('⚠️ Parameter validation failed. Please check highlighted fields.');
            setAreParamsApplied(false);
            return false;
        }
        setAreParamsApplied(true);
        return true;
    }, [validateParameters]);

    // Update the getInputStyle function to use emerald text color
    const getInputStyle = (fieldName: string) => {
        const baseStyle = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-sm text-black placeholder-white focus:ring-black bg-white";
        return invalidFields.has(fieldName)
            ? `${baseStyle} border-red-500 bg-red-50 focus:ring-red-200`
            : `${baseStyle} border-gray-300`;
    };

    // Parameter input fields JSX
    const renderParameterInputs = () => (
        <div className="space-y-4">
            {Object.entries(runParams).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                    <label className="text-sm font-bold text-black mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                        {invalidFields.has(key) && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                    {key === 'runEnv' ? (
                        <select
                            value={value || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            className={`${getInputStyle(key)} text-black`}
                        >
                            <option value="" className="text-black text-xs">Select Environment</option>
                            <option value="development" className="text-black">Development</option>
                            <option value="staging" className="text-black">Staging</option>
                            <option value="production" className="text-black">Production</option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            className={getInputStyle(key)}
                            onFocus={() => {
                                if (invalidFields.has(key)) {
                                    const newInvalidFields = new Set(invalidFields);
                                    newInvalidFields.delete(key);
                                    setInvalidFields(newInvalidFields);
                                }
                            }}
                            placeholder={`Enter ${(key.charAt(0).toUpperCase() + key.slice(1)).replace(/([A-Z])/g, ' $1')}`}
                        />
                    )}
                    {invalidFields.has(key) && (
                        <p className="mt-1 text-xs text-red-500">
                            This field is required
                        </p>
                    )}
                </div>
            ))}
        </div>
    );

    // Function to reset all nodes
    const resetAllNodes = useCallback(() => {
        // Clear all node outputs from localStorage
        localStorage.removeItem(nodeOutputsKey);
        setNodeOutputs({});

        // Reset all process IDs
        setProcessIds({});

        // Reset all node statuses to idle and clear all visual states
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                status: 'idle',
                output: undefined,
                selected: false,
                style: undefined // Clear any custom styles
            },
            style: undefined, // Clear node-level styles
            selected: false // Clear ReactFlow's internal selection state
        })));

        // Clear any running timeouts
        Object.values(nodeTimeouts.current).forEach(timeout => {
            clearInterval(timeout as NodeJS.Timeout);
        });
        nodeTimeouts.current = {};

        // Clear selected nodes
        setSelectedNodes(new Set());

        // Clear selected node in output panel
        setSelectedNode(null);

        // Cancel all running/cancelled nodes
        cancelledNodesRef.current = new Set();
        forceUpdate({});

        console.log('🧹 Reset all nodes and cleared all data');
    }, [setNodes, nodeOutputsKey]);

    // Function to run nodes in sequence
    const runAllNodes = async () => {
        if (!areParamsApplied) {
            console.log('❌ Cannot run all nodes: Parameters have not been applied');
            return;
        }

        // Get parameters from localStorage
        const storedParams = localStorage.getItem(paramKey);
        if (!storedParams) {
            console.log('❌ Cannot run all nodes: No validated parameters found');
            setAreParamsApplied(false);
            return;
        }

        setIsRunningAll(true);
        const nodeSequence = [
            // Top flow
            'reading_config_comp',
            'read_src_comp',
            'pre_harmonisation_src_comp',
            'harmonisation_src_comp',
            'enrichment_file_search_src_comp',
            'enrichment_src_comp',
            'data_transform_src_comp',
            // Bottom flow
            'read_tgt_comp',
            'pre_harmonisation_tgt_comp',
            'harmonisation_tgt_comp',
            'enrichment_file_search_tgt_comp',
            'enrichment_tgt_comp',
            'data_transform_tgt_comp',
            // Final flow
            'combine_data_comp',
            'apply_rules_comp',
            'output_rules_comp',
            'break_rolling_comp'
        ];

        try {
            for (const nodeId of nodeSequence) {
                const node = nodes.find(n => n.id === nodeId);
                if (node?.data.onRun) {
                    await new Promise<void>((resolve, reject) => {
                        let checkInterval: NodeJS.Timeout;

                        const checkStatus = () => {
                            const currentNode = nodes.find(n => n.id === nodeId);
                            if (currentNode?.data.status === 'completed') {
                                clearInterval(checkInterval);
                                resolve();
                            } else if (currentNode?.data.status === 'failed') {
                                clearInterval(checkInterval);
                                reject(new Error(`Node ${nodeId} failed`));
                            }
                        };

                        node.data.onRun(nodeId);
                        checkInterval = setInterval(checkStatus, 1000);
                    });
                }
            }
        } catch (error) {
            console.error('Error in sequential execution:', error);
        } finally {
            setIsRunningAll(false);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing && !isResizingBottom) return;

            if (isResizingBottom) {
                const height = document.documentElement.clientHeight - e.clientY;
                const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
                setBottomBarHeight(clampedHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setIsResizingBottom(false);
        };

        if (isResizing || isResizingBottom) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isResizingBottom, minHeight, maxHeight]);

    // Handle window resize to adjust bottom bar responsively
    useEffect(() => {
        const handleWindowResize = () => {
            const vh = window.innerHeight;
            const newMaxHeight = vh * 0.8;
            const newMinHeight = 200;

            // Adjust bottom bar height if it's outside the new bounds
            setBottomBarHeight(prev => {
                if (prev > newMaxHeight) return newMaxHeight;
                if (prev < newMinHeight) return newMinHeight;
                return prev;
            });
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, []);

    // Update localStorage whenever nodeOutputs changes
    useEffect(() => {
        try {
            // Store complete data including 100x1000 tables (smaller than 200x1000)
            const compressedOutputs: { [nodeId: string]: any } = {};

            Object.keys(nodeOutputs).forEach(nodeId => {
                const output = nodeOutputs[nodeId];
                if (output) {
                    compressedOutputs[nodeId] = {
                        ...output,
                        calculation_results: output.calculation_results ? {
                            headers: output.calculation_results.headers,
                            // Store complete table data (100x1000 is manageable in localStorage)
                            table: output.calculation_results.table || [],
                            // Add metadata to track data completeness
                            table_size: output.calculation_results.table ?
                                `${output.calculation_results.headers?.length || 0}x${output.calculation_results.table.length || 0}` : '0x0'
                        } : output.calculation_results
                    };
                }
            });

            const success = safeLocalStorageSet(nodeOutputsKey, JSON.stringify(compressedOutputs));
            if (success) {
                console.log('💾 Saved complete node outputs to localStorage (100x1000 tables included)');
            }
        } catch (error) {
            console.warn('Failed to save complete node outputs, trying lightweight version:', error);
            // Fallback: try saving without table data
            try {
                const lightweightOutputs: { [nodeId: string]: any } = {};
                Object.keys(nodeOutputs).forEach(nodeId => {
                    const output = nodeOutputs[nodeId];
                    if (output) {
                        lightweightOutputs[nodeId] = {
                            ...output,
                            calculation_results: output.calculation_results ? {
                                headers: output.calculation_results.headers,
                                table: [], // Fallback: empty table
                                table_size: output.calculation_results.table ?
                                    `${output.calculation_results.headers?.length || 0}x${output.calculation_results.table.length || 0}` : '0x0'
                            } : output.calculation_results
                        };
                    }
                });

                const fallbackSuccess = safeLocalStorageSet(nodeOutputsKey, JSON.stringify(lightweightOutputs));
                if (fallbackSuccess) {
                    console.log('💾 Saved lightweight node outputs to localStorage (fallback mode)');
                }
            } catch (fallbackError) {
                console.warn('Failed to save even lightweight data:', fallbackError);
            }
        }
    }, [nodeOutputs, nodeOutputsKey]);

    const resetAllNodeOutputs = useCallback(() => {
        setNodeOutputs({});
        localStorage.removeItem(nodeOutputsKey);
        console.log('🧹 Cleared all node outputs');
    }, [nodeOutputsKey]);

    // Update the onSelectionChange handler
    const onSelectionChange = useCallback(({ nodes: selectedNodesArr }: { nodes: Node[] }) => {
        const selectedIds = new Set(selectedNodesArr.map(n => n.id));
        setSelectedNodes(selectedIds);

        // Update nodes with selection state
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                selected: selectedIds.has(node.id)
            }
        })));

        // Do not set selectedNode/output here
        setSelectedNode(null);
    }, [setNodes]);

    // Refactored runNodeWithDependencies to pass previousOutputs down the chain
    async function runNodeWithDependencies(
        nodeId: string,
        runNodeFn: (id: string, previousOutputs: any) => Promise<any>,
        dependencyMap: Record<string, string[]>,
        nodeStatusMap: Record<string, string>,
        nodeOutputs: Record<string, any>,
        alreadyRun: Set<string> = new Set(),
        path: string[] = []
    ): Promise<any> {
        // Cancel if node is in cancelledNodes
        if (cancelledNodesRef.current.has(nodeId)) {
            console.log(`Node ${nodeId} dependency run cancelled.`);
            return;
        }
        if (alreadyRun.has(nodeId) || nodeStatusMap[nodeId] === 'completed') return nodeOutputs[nodeId];
        if (path.includes(nodeId)) throw new Error(`Cycle detected: ${[...path, nodeId].join(' -> ')}`);
        const deps = dependencyMap[nodeId] || [];
        let prevOutputs = { ...nodeOutputs };
        for (let dep of deps) {
            const depOutput = await runNodeWithDependencies(dep, runNodeFn, dependencyMap, nodeStatusMap, prevOutputs, alreadyRun, [...path, nodeId]);
            prevOutputs[dep] = depOutput;
        }
        // Now run the node, passing prevOutputs
        if (cancelledNodesRef.current.has(nodeId)) {
            console.log(`Node ${nodeId} run cancelled (post-deps).`);
            return;
        }
        const output = await runNodeFn(nodeId, prevOutputs);
        alreadyRun.add(nodeId);
        return output;
    }

    // Helper: run a single node and wait for completion, now accepts previousOutputs
    const runNodeAndWait = async (nodeId: string, previousOutputs: any) => {
        // Cancel if node is in cancelledNodes
        if (cancelledNodesRef.current.has(nodeId)) {
            console.log(`Node ${nodeId} run cancelled.`);
            return;
        }
        if (!areParamsApplied) {
            console.log('❌ Cannot run node: Parameters have not been applied');
            return;
        }
        const storedParams = localStorage.getItem(paramKey);
        if (!storedParams) {
            console.log('❌ Cannot run node: No validated parameters found');
            setAreParamsApplied(false);
            return;
        }
        try {
            const params = JSON.parse(storedParams) as LocalRunParameters;
            const hasEmptyFields = Object.values(params).some(value =>
                !value || (typeof value === 'string' && value.trim() === '')
            );
            if (hasEmptyFields) {
                console.log('❌ Cannot run node: Invalid parameters detected');
                setAreParamsApplied(false);
                localStorage.removeItem(paramKey);
                return;
            }
            // Proceed with node execution
            console.log(`🎯 Starting node ${nodeId}`);
            const currentNode = nodes.find(n => n.id === nodeId);
            if (currentNode?.data.status === 'running') {
                console.log('⚠️ Node is already running');
                return;
            }
            updateNodeStatus(nodeId, 'running');
            const request = {
                nodeId,
                parameters: params,
                previousOutputs,
                timestamp: new Date().toISOString()
            };
            const response = await ApiService.startCalculation(request);
            let nodeOutput = null;
            if (response.process_id) {
                setProcessIds(prev => ({ ...prev, [nodeId]: response.process_id }));
                // Poll for completion
                let finished = false;
                while (!finished) {
                    try {
                        const status = await ApiService.getProcessStatus(response.process_id);
                        if (status.status === 'completed' || status.status === 'failed') {
                            updateNodeStatus(nodeId, status.status);
                            if (status.status === 'completed' && status.output) {
                                setNodeOutputs(prev => {
                                    const updated = { ...prev, [nodeId]: status.output };
                                    // localStorage is now handled by useEffect with lightweight data
                                    return updated;
                                });
                                nodeOutput = status.output;
                            }
                            finished = true;
                        } else {
                            await new Promise(res => setTimeout(res, 1000));
                        }
                    } catch (error) {
                        // Only set to failed if the node is not idle
                        setNodes(nds => nds.map(node =>
                            node.id === nodeId && node.data.status !== 'idle'
                                ? { ...node, data: { ...node.data, status: 'failed' } }
                                : node
                        ));
                        finished = true;
                    }
                }
            }
            return nodeOutput;
        } catch (error) {
            // Only set to failed if the node is not idle
            setNodes(nds => nds.map(node =>
                node.id === nodeId && node.data.status !== 'idle'
                    ? { ...node, data: { ...node.data, status: 'failed' } }
                    : node
            ));
        }
    };

    // Chain-dependency aware node runner (now uses refactored runNodeWithDependencies)
    const runNode = useCallback(async (nodeId: string) => {
        cancelledNodesRef.current = new Set();
        forceUpdate({});
        try {
            await runNodeWithDependencies(
                nodeId,
                runNodeAndWait,
                dependencyMap,
                nodeStatusMap,
                nodeOutputs
            );
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    }, [dependencyMap, nodeStatusMap, runNodeAndWait, nodeOutputs]);

    // Downstream reset logic
    const resetNodeAndDownstream = useCallback(async (nodeId: string) => {
        const toReset = Array.from(getAllDownstreamNodes(nodeId, downstreamMap));
        toReset.push(nodeId); // include the node itself
        // Add all to cancelledNodesRef
        toReset.forEach(id => cancelledNodesRef.current.add(id));
        forceUpdate({});

        // Reset nodes
        for (const id of toReset) {
            if (processIds[id]) {
                try { await ApiService.resetProcess(processIds[id]); } catch { }
            }
            if (nodeTimeouts.current[id]) {
                clearInterval(nodeTimeouts.current[id] as any);
                delete nodeTimeouts.current[id];
            }
            updateNodeStatus(id, 'idle');
            setNodeOutputs(prev => {
                const updated = { ...prev };
                delete updated[id];
                // localStorage is now handled by useEffect with lightweight data
                return updated;
            });
        }

        // Reset edge colors and labels for all affected edges
        setEdges(eds => eds.map(edge => {
            if (toReset.includes(edge.source)) {
                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: '#1e293b'
                    },
                    label: undefined, // Clear the data count label
                    labelStyle: undefined,
                    labelBgStyle: undefined
                };
            }
            return edge;
        }));
    }, [downstreamMap, processIds, updateNodeStatus, setNodeOutputs, setEdges, nodeOutputsKey]);

    // Update nodes when areParamsApplied changes
    useEffect(() => {
        setNodes(nodes => nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                areParamsApplied
            }
        })));
    }, [areParamsApplied, setNodes]);

    // Update edge labels when nodeOutputs change
    useEffect(() => {
        setEdges(eds => eds.map(edge => {
            const sourceOutput = nodeOutputs && nodeOutputs[edge.source];
            const rowCount = sourceOutput?.calculation_results?.table?.length;
            const sourceNode = nodes.find(n => n.id === edge.source);
            const sourceStatus = sourceNode?.data?.status;

            return {
                ...edge,
                label: sourceStatus === 'completed' && rowCount && rowCount > 0 ?
                    rowCount.toLocaleString() : undefined,
                labelStyle: {
                    fill: '#1f2937',
                    fontWeight: 'bold',
                    fontSize: '10px'
                },
                labelBgStyle: {
                    fill: '#ffffff',
                    fillOpacity: 0.9,
                    stroke: '#d1d5db',
                    strokeWidth: 1
                },
                labelBgPadding: [4, 8],
                labelBgBorderRadius: 4
            };
        }));
    }, [nodeOutputs, nodes, setEdges]);

    // Define nodeTypes with the required props
    const [selectedTab, setSelectedTab] = useState<string>('data');
    const nodeTypes = useMemo(() => ({
        custom: (props: any) => (
            <CustomNode
                {...props}
                nodeOutputs={nodeOutputs}
                setSelectedNode={setSelectedNode}
                setSelectedTab={setSelectedTab}
            />
        )
    }), [nodeOutputs, setSelectedNode, setSelectedTab]);

    // Persist nodes to localStorage whenever they change
    useEffect(() => {
        const success = safeLocalStorageSet(nodesKey, JSON.stringify(nodes));
        if (!success) {
            console.warn('Failed to save nodes to localStorage');
        }
    }, [nodes, nodesKey, nodeOutputsKey]);

    // Add the onStop handler
    const onStop = useCallback(async (nodeId: string) => {
        cancelledNodesRef.current.add(nodeId);
        forceUpdate({});
        const processId = processIds[nodeId];
        if (!processId) {
            console.warn(`No processId found for node ${nodeId}`);
            return;
        }
        try {
            await ApiService.stopProcess(processId);
            updateNodeStatus(nodeId, 'stopped');
        } catch (error) {
            console.error(`Failed to stop process for node ${nodeId}:`, error);
        }
    }, [processIds, updateNodeStatus]);

    // Inject onStop into node data after both are defined
    useEffect(() => {
        setNodes(nds =>
            nds.map(node => ({
                ...node,
                data: {
                    ...node.data,
                    onStop
                }
            }))
        );
    }, [onStop, setNodes]);

    return (
        <HandlerContext.Provider value={{ runNode, resetNodeAndDownstream }}>
            <div className="min-h-screen" style={{ backgroundColor: 'white' }}>
                {/* Main Content */}
                <div
                    className="flex flex-col h-screen transition-all duration-300 ease-in-out"
                    style={{
                        marginRight: isSidebarOpen ? `${sidebarWidth}px` : '48px'
                    }}
                >
                    {/* Flow Container */}
                    <div
                        className="flex-1 overflow-hidden flex flex-col"
                        style={{
                            height: isBottomBarOpen
                                ? `calc(100vh - ${bottomBarHeight}px)`
                                : 'calc(100vh - 48px)'
                        }}
                    >
                        <div
                            className="border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4"
                            style={{
                                backgroundColor: 'white',
                                minHeight: '4vh', // Responsive header height (4% of viewport height)
                                maxHeight: '8vh', // Maximum height to prevent it from getting too large
                                height: 'auto',
                                boxShadow: `
                                    0 4px 8px rgba(0,0,0,0.15),
                                    0 8px 16px rgba(0,0,0,0.1),
                                    0 2px 4px rgba(0,0,0,0.1),
                                    inset 0 2px 0 rgba(255,255,255,0.8),
                                    inset 0 -2px 0 rgba(0,0,0,0.1)
                                `
                            }}
                        >
                            <div className="flex items-center justify-between h-full">
                                {/* HSBC Logo and Name - Left */}
                                <div className="flex items-center flex-shrink-0">
                                    <img
                                        src="/hsbc.png"
                                        alt="HSBC Logo"
                                        className="h-8 sm:h-12 lg:h-16 w-auto mr-2 sm:mr-3 lg:mr-4"
                                        style={{ maxHeight: '6vh' }}
                                    />
                                    <span className="text-black font-bold text-lg sm:text-xl lg:text-2xl">HSBC</span>
                                </div>

                                {/* Professional Title - Center */}
                                <div className="flex-1 flex justify-center">
                                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black text-center">
                                        GENERIC COMPLETENESS CONTROL
                                    </h1>
                                </div>

                                {/* Right spacer for balance */}
                                <div className="flex-shrink-0 w-16 sm:w-20 lg:w-24"></div>
                            </div>
                        </div>
                        <div
                            className="relative h-full"
                            style={{
                                background: 'white',
                                boxShadow: `
                                    inset 0 4px 8px rgba(0,0,0,0.08),
                                    inset 0 2px 4px rgba(0,0,0,0.05),
                                    inset 0 8px 16px rgba(0,0,0,0.02),
                                    inset 0 -2px 4px rgba(255,255,255,0.9),
                                    0 1px 0 rgba(255,255,255,0.95)
                                `,
                                border: '24px solid #f5f5f5',
                                borderRadius: '8px'
                            }}
                            onClick={() => setActivePanel(null)}
                        >
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                nodeTypes={nodeTypes}
                                connectionMode={ConnectionMode.Loose}
                                fitView
                                minZoom={0.5}
                                maxZoom={2}
                                nodesDraggable={false}
                                panOnDrag={true}
                                zoomOnScroll={false}
                                preventScrolling={true}
                                className="bg-transparent"
                                selectNodesOnDrag={false}
                                onSelectionChange={onSelectionChange}
                                multiSelectionKeyCode="Control"
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background
                                    color="#f3f4f6"
                                    gap={20}
                                    className="bg-white"
                                />
                                <Controls className="bg-slate-800 border border-slate-700/50 rounded-lg" />
                            </ReactFlow>
                        </div>
                    </div>

                    {/* Bottom Data View Bar with Resize Handle */}
                    <div
                        className={`
                            relative bg-white border-t border-slate-200
                            transition-all duration-300 ease-in-out
                            ${!isBottomBarOpen ? 'h-12' : ''}
                        `}
                        style={{
                            height: isBottomBarOpen ? `${bottomBarHeight}px` : '48px',
                            minHeight: isBottomBarOpen ? `${minHeight}px` : '48px',
                            maxHeight: isBottomBarOpen ? `${maxHeight}px` : '48px',
                            transition: isResizingBottom ? 'none' : undefined,
                            zIndex: activePanel === 'bottombar' ? 50 : 10,

                        }}
                        onClick={() => setActivePanel('bottombar')}
                    >
                        {/* Resize Handle - only show when open */}
                        {isBottomBarOpen && (
                            <div
                                className={`
                                    absolute -top-1 left-0 w-full h-2 cursor-row-resize z-10
                                    ${isResizingBottom ? 'bg-slate-700' : 'bg-transparent hover:bg-slate-700/30'}
                                    transition-colors
                                `}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizingBottom(true);
                                }}
                            >
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <FaGripLines className="text-slate-700/70" />
                                </div>
                            </div>
                        )}

                        {/* Header Bar */}
                        <div className="flex items-center justify-between h-12 px-4 border-b border-slate-700/50">
                            {/* DataView Button - Left */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBottomBarOpen(!isBottomBarOpen);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                            >
                                <FaTable className="w-3 h-3" />
                                DataView
                            </button>

                            {/* Chevron Icon - Right */}
                            <FaChevronUp
                                className={`
                                    text-slate-700/70 cursor-pointer transition-transform duration-300 hover:text-slate-600
                                    ${isBottomBarOpen ? '' : 'rotate-180'}
                                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBottomBarOpen(!isBottomBarOpen);
                                }}
                            />
                        </div>

                        {/* Content - only show when open */}
                        {isBottomBarOpen && (
                            <div className="h-[calc(100%-48px)] px-4 overflow-y-auto">
                                {selectedNode ? (
                                    <div className="flex-1 text-sm text-slate-300 h-full overflow-hidden">
                                        {/* Tab Buttons */}
                                        <div className="flex gap-2 border-b border-slate-700/50 mb-2">
                                            <button onClick={() => setSelectedTab('histogram')} className={`px-2 py-1 rounded-t ${selectedTab === 'histogram' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Histogram</button>
                                            <button onClick={() => setSelectedTab('data')} className={`px-2 py-1 rounded-t ${selectedTab === 'data' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Data Output</button>
                                            <button onClick={() => setSelectedTab('log')} className={`px-2 py-1 rounded-t ${selectedTab === 'log' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Log</button>
                                            <button onClick={() => setSelectedTab('fail')} className={`px-2 py-1 rounded-t ${selectedTab === 'fail' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Fail Message</button>
                                        </div>
                                        {/* Tab Content */}
                                        <div className="mt-2">
                                            {selectedTab === 'histogram' && (
                                                <div>
                                                    {/* Show all column names (headers) in a vertical scrollable list with search */}
                                                    {selectedNode.data.output?.calculation_results?.headers ? (
                                                        <div className="flex flex-col h-full">
                                                            <div className="mb-2">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="font-semibold text-black text-sm">Data Columns ({selectedNode.data.output.calculation_results.headers.length} total)</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <select
                                                                        value={histogramFilterType}
                                                                        onChange={e => setHistogramFilterType(e.target.value)}
                                                                        className="px-3 py-1 rounded bg-white text-black text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    >
                                                                        <option value="contains">Contains</option>
                                                                        <option value="equals">Equals</option>
                                                                        <option value="startsWith">Starts With</option>
                                                                        <option value="endsWith">Ends With</option>
                                                                    </select>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Filter value..."
                                                                        value={histogramFilterValue}
                                                                        onChange={e => setHistogramFilterValue(e.target.value)}
                                                                        className="px-3 py-1 rounded bg-white text-black text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
                                                                        style={{ minWidth: 120 }}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            setHistogramFilterValue('');
                                                                            setHistogramFilterType('contains');
                                                                        }}
                                                                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black text-sm border border-gray-300 transition-colors"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div
                                                                className="ag-theme-alpine border border-gray-300 rounded bg-white"
                                                                style={{
                                                                    height: `${bottomBarHeight - 140}px`, // Dynamic height - space for header, tabs and padding
                                                                    overflow: 'auto'
                                                                }}
                                                            >
                                                                <div className="p-0">
                                                                    {(() => {
                                                                        const filteredHeaders = selectedNode.data.output.calculation_results.headers.filter((header: string) => {
                                                                            if (!histogramFilterValue) return true;

                                                                            const headerLower = header.toLowerCase();
                                                                            const filterValueLower = histogramFilterValue.toLowerCase();

                                                                            switch (histogramFilterType) {
                                                                                case 'equals':
                                                                                    return headerLower === filterValueLower;
                                                                                case 'startsWith':
                                                                                    return headerLower.startsWith(filterValueLower);
                                                                                case 'endsWith':
                                                                                    return headerLower.endsWith(filterValueLower);
                                                                                case 'contains':
                                                                                default:
                                                                                    return headerLower.includes(filterValueLower);
                                                                            }
                                                                        });

                                                                        return filteredHeaders.length > 0 ? (
                                                                            <ul className="space-y-1">
                                                                                {filteredHeaders.map((header: string, idx: number) => (
                                                                                    <li key={idx} className="inline-block bg-white border border-gray-200 text-black rounded px-3 py-2 text-sm hover:bg-gray-50 transition-colors shadow-sm" title={header}>
                                                                                        <span className="text-gray-600 mr-2 font-medium">#{idx + 1}</span>
                                                                                        <span className="font-normal">{header}</span>
                                                                                    </li>
                                                                                ))}
                                                                                <div className="mt-3 text-black text-sm border-t border-gray-200 pt-2">
                                                                                    Showing {filteredHeaders.length} of {selectedNode.data.output.calculation_results.headers.length} columns
                                                                                </div>
                                                                            </ul>
                                                                        ) : (
                                                                            <div className="text-black text-sm">No columns found matching the filter criteria.</div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>No columns found.</div>
                                                    )}
                                                </div>
                                            )}
                                            {selectedTab === 'data' && (
                                                <div>
                                                    {/* Column Selection and Data Output */}
                                                    {selectedNode.data.output?.calculation_results?.headers && selectedNode.data.output?.calculation_results?.table ? (
                                                        <div className="flex flex-col h-full">
                                                            {/* Column Filter Section - Compact */}


                                                            {/* AG Grid with filtered columns */}
                                                            <div className="flex-1">
                                                                <AgGridTable
                                                                    columns={selectedNode.data.output.calculation_results.headers.map((header: string) => ({
                                                                        headerName: header,
                                                                        field: header
                                                                    }))}
                                                                    rowData={selectedNode.data.output.calculation_results.table.map((row: any[]) => {
                                                                        const obj: any = {};
                                                                        selectedNode.data.output.calculation_results.headers.forEach((header: string, index: number) => {
                                                                            obj[header] = row[index];
                                                                        });
                                                                        return obj;
                                                                    })}
                                                                    height={bottomBarHeight - 120}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : selectedNode.data.output?.calculation_results ? (
                                                        <div>
                                                            <h3 className="text-emerald-400 font-medium mb-2">Calculation Results:</h3>
                                                            <div
                                                                className="bg-slate-900/50 rounded p-2 overflow-y-auto"
                                                                style={{ height: `${bottomBarHeight - 100}px` }}
                                                            >
                                                                <pre className="text-slate-300 whitespace-pre-wrap">
                                                                    {JSON.stringify(selectedNode.data.output.calculation_results, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    ) : 'No data output.'}
                                                </div>
                                            )}
                                            {selectedTab === 'log' && (
                                                <div>
                                                    {/* Execution Logs */}
                                                    {selectedNode.data.output?.execution_logs ? (
                                                        <div>
                                                            <h3 className="text-emerald-400 font-medium mb-2">Execution Logs:</h3>
                                                            <div
                                                                className="bg-slate-900/50 rounded p-2 space-y-1 overflow-y-auto"
                                                                style={{ height: `${bottomBarHeight - 100}px` }}
                                                            >
                                                                {selectedNode.data.output.execution_logs.map((log: string, index: number) => (
                                                                    <div key={index} className="text-slate-300">
                                                                        {log}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : 'No logs.'}
                                                </div>
                                            )}
                                            {selectedTab === 'fail' && (
                                                <div>
                                                    {/* Fail Message only if node failed */}
                                                    {selectedNode.data.status === 'failed' && selectedNode.data.output?.fail_message ? (
                                                        <div
                                                            className="bg-red-900/50 rounded p-2 text-red-300 overflow-y-auto"
                                                            style={{ height: `${bottomBarHeight - 100}px` }}
                                                        >
                                                            {selectedNode.data.output.fail_message}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-400">No fail message (node did not fail)</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        Select a node to view its output
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Collapsed state indicator - removed since we now have the button */}
                    </div>
                </div>



                {/* Right Sidebar */}
                <div
                    ref={resizeRef}
                    className={`
                        fixed right-0 top-0 h-full bg-white border-l border-slate-200
                    transition-all duration-300 ease-in-out
                    ${!isSidebarOpen ? 'w-12' : ''}
                `}
                    style={{
                        width: isSidebarOpen ? `${sidebarWidth}px` : '48px',
                        transition: isResizing ? 'none' : undefined,
                        zIndex: activePanel === 'sidebar' ? 50 : 20
                    }}
                    onDoubleClick={() => !isResizing && setIsSidebarOpen(!isSidebarOpen)}
                    onClick={() => setActivePanel('sidebar')}
                >
                    {/* Resize Handle */}
                    <div
                        className={`
                            absolute left-0 top-0 h-full w-1 cursor-col-resize
                            ${isResizing ? 'bg-slate-700' : 'hover:bg-slate-700/30'}
                            transition-colors
                        `}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);

                            const startX = e.pageX;
                            const startWidth = sidebarWidth;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = startX - moveEvent.pageX;
                                const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);
                                setSidebarWidth(newWidth);
                            };

                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                                setIsResizing(false);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                    />

                    <div className={`
                        flex items-center h-16 px-0 border-b border-slate-700/50
                        ${isSidebarOpen ? 'justify-between' : 'justify-center'}
                    `}>
                        {isSidebarOpen && (
                            <div className="flex-1 flex justify-center">
                                <span className="text-black font-medium">
                                    Run Parameters
                                </span>
                            </div>
                        )}
                        <FaChevronLeft
                            className={`
                                text-slate-700/70 cursor-pointer transition-transform duration-300 hover:text-slate-600
                                ${isSidebarOpen ? '' : 'rotate-180'}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsSidebarOpen(!isSidebarOpen);
                            }}
                        />
                    </div>

                    {/* Sidebar Content */}
                    {isSidebarOpen && (
                        <div className="px-2 py-2 text-slate-300 overflow-y-auto max-h-[calc(100vh-4rem)]">
                            <div className="space-y-4">
                                {/* Form fields with updated styling */}
                                <div className="space-y-4">
                                    {renderParameterInputs()}
                                </div>

                                {/* Buttons Container */}
                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={handleApplyParams}
                                        className={`flex-1 px-4 py-3 bg-green-800 hover:bg-green-700 text-white rounded-lg text-sm 
                                        font-medium transition-colors shadow-lg shadow-green-900/20 focus:ring-2 
                                        focus:ring-green-500/50 active:transform active:scale-[0.98]`}
                                    >
                                        Apply Parameters
                                    </button>
                                    {/* Validation Message */}
                                    {paramValidation.message && (
                                        <p className={`mt-2 text-sm ${paramValidation.isValid ? 'text-green-800' : 'text-red-400'
                                            }`}>
                                            {paramValidation.message}
                                        </p>
                                    )}
                                    <button
                                        onClick={runAllNodes}
                                        disabled={isRunningAll}
                                        className={`flex-1 px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors 
                                        shadow-lg shadow-blue-900/20 focus:ring-2 focus:ring-blue-500/50 
                                        active:transform active:scale-[0.98] ${isRunningAll
                                                ? 'bg-blue-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-500'}`}
                                    >
                                        {isRunningAll ? 'Running...' : 'Run All'}
                                    </button>
                                </div>

                                {/* Reset All Button */}
                                <div className="pt-2">
                                    <button
                                        onClick={resetAllNodes}
                                        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm 
                                        font-medium transition-colors shadow-lg shadow-slate-900/20 focus:ring-2 
                                        focus:ring-slate-500/50 active:transform active:scale-[0.98]"
                                    >
                                        Reset All Nodes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Collapsed state indicator */}
                    {!isSidebarOpen && (
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-black vertical-text"
                        >
                            <style jsx>{`
                            .vertical-text {
                                writing-mode: vertical-rl;
                                text-orientation: mixed;
                                transform: rotate(180deg);
                            }
                        `}</style>
                            Run Parameters
                        </div>
                    )}
                </div>
            </div>
        </HandlerContext.Provider>
    );
} 