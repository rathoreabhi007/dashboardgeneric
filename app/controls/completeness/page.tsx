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
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaCircle, FaPlay, FaStop, FaUndo, FaChevronLeft, FaFolder, FaGripLines } from 'react-icons/fa';
import { ApiService } from '@/app/services/api';
import { buildDependencyMap, buildDownstreamMap, runNodeWithDependencies, getAllDownstreamNodes } from '@/app/utils/graph-utils';
import { HandlerContext, HandlerContextType } from '@/app/controls/completeness/HandlerContext';

// Node status types
type NodeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'standby';

// Add these styles at the top of the file after imports
const styles = {
    selectedNode: {
        border: '2px solid #10b981',
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
        transform: 'scale(1.02)',
        transition: 'all 0.2s ease'
    },
    hoveredNode: {
        border: '2px solid #10b981',
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)',
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
        position: { x: 50, y: 120 },
        draggable: false
    },
    {
        id: 'file_searching_comp',
        type: 'custom',
        data: { fullName: 'File_Searching_Comp', status: 'idle' },
        position: { x: 250, y: 120 },
        draggable: false
    },
    // Top flow nodes (SRC)
    {
        id: 'harmonisation_src',
        type: 'custom',
        data: { fullName: 'Harmonisation_SRC', status: 'idle' },
        position: { x: 450, y: 20 },
        draggable: false
    },
    {
        id: 'src_enrichment',
        type: 'custom',
        data: { fullName: 'SRC Enrichment', status: 'idle' },
        position: { x: 650, y: 20 },
        draggable: false
    },
    {
        id: 'data_transform',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment', status: 'idle' },
        position: { x: 850, y: 20 },
        draggable: false
    },
    {
        id: 'combine_data',
        type: 'custom',
        data: { fullName: 'Combine SRC and TGT Data', status: 'idle' },
        position: { x: 850, y: 120 },
        draggable: false
    },
    {
        id: 'apply_rules',
        type: 'custom',
        data: { fullName: 'Apply Rec Rules & Break Explain', status: 'idle' },
        position: { x: 1050, y: 120 },
        draggable: false
    },
    {
        id: 'output_rules',
        type: 'custom',
        data: { fullName: 'Output Rules', status: 'idle' },
        position: { x: 1250, y: 120 },
        draggable: false
    },
    {
        id: 'break_rolling',
        type: 'custom',
        data: { fullName: 'BreakRolling Details', status: 'idle' },
        position: { x: 1450, y: 120 },
        draggable: false
    },
    // Bottom flow nodes (TGT)
    {
        id: 'harmonisation_tgt',
        type: 'custom',
        data: { fullName: 'Harmonisation_TGT', status: 'idle' },
        position: { x: 450, y: 220 },
        draggable: false
    },
    {
        id: 'tgt_enrichment',
        type: 'custom',
        data: { fullName: 'TGT Enrichment', status: 'idle' },
        position: { x: 650, y: 220 },
        draggable: false
    },
    {
        id: 'tgt_data_transform',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment', status: 'idle' },
        position: { x: 850, y: 220 },
        draggable: false
    }
];

const initialEdges: Edge[] = [
    // Initial flow
    {
        id: 'config-to-file-search',
        source: 'reading_config_comp',
        target: 'file_searching_comp',
        sourceHandle: 'reading_config_comp-source',
        targetHandle: 'file_searching_comp-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    // Top flow edges (SRC)
    {
        id: 'file-search-to-harmonisation-src',
        source: 'file_searching_comp',
        target: 'harmonisation_src',
        sourceHandle: 'file_searching_comp-source',
        targetHandle: 'harmonisation_src-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment',
        source: 'harmonisation_src',
        target: 'src_enrichment',
        sourceHandle: 'harmonisation_src-source',
        targetHandle: 'src_enrichment-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform',
        source: 'src_enrichment',
        target: 'data_transform',
        sourceHandle: 'src_enrichment-source',
        targetHandle: 'data_transform-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine',
        source: 'data_transform',
        target: 'combine_data',
        sourceHandle: 'data_transform-source',
        targetHandle: 'combine_data-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    // Bottom flow edges (TGT)
    {
        id: 'file-search-to-harmonisation-tgt',
        source: 'file_searching_comp',
        target: 'harmonisation_tgt',
        sourceHandle: 'file_searching_comp-source',
        targetHandle: 'harmonisation_tgt-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment-tgt',
        source: 'harmonisation_tgt',
        target: 'tgt_enrichment',
        sourceHandle: 'harmonisation_tgt-source',
        targetHandle: 'tgt_enrichment-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform-tgt',
        source: 'tgt_enrichment',
        target: 'tgt_data_transform',
        sourceHandle: 'tgt_enrichment-source',
        targetHandle: 'tgt_data_transform-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine-tgt',
        source: 'tgt_data_transform',
        target: 'combine_data',
        sourceHandle: 'tgt_data_transform-source',
        targetHandle: 'combine_data-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    // Final flow edges
    {
        id: 'combine-to-rules',
        source: 'combine_data',
        target: 'apply_rules',
        sourceHandle: 'combine_data-source',
        targetHandle: 'apply_rules-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'rules-to-output',
        source: 'apply_rules',
        target: 'output_rules',
        sourceHandle: 'apply_rules-source',
        targetHandle: 'output_rules-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
    },
    {
        id: 'output-to-break',
        source: 'output_rules',
        target: 'break_rolling',
        sourceHandle: 'output_rules-source',
        targetHandle: 'break_rolling-target',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }
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
const CustomNode = memo(({ data, id, nodeOutputs, setSelectedNode }: { 
    data: any; 
    id: string;
    nodeOutputs: { [key: string]: any };
    setSelectedNode: (node: any) => void;
}) => {
    const { runNode, resetNodeAndDownstream } = useContext(HandlerContext) as HandlerContextType;
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const isRunning = data.status === 'running';
    const canReset = data.status === 'failed' || data.status === 'completed';
    const isSelected = data.selected || false;
    const canRun = data.areParamsApplied && !isRunning;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // When a node is clicked, set it as selected with its output
        const output = nodeOutputs[id];
        setSelectedNode({
            id,
            data: {
                ...data,
                output
            }
        });
    };

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
        const baseIconStyle = "w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-full border shadow-lg transition-all duration-200";
        
        if (isSelected || isHovered) {
            return `${baseIconStyle} border-emerald-400`;
        }
        
        return `${baseIconStyle} border-slate-700`;
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
            onClick={handleClick}
        >
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#10b981', width: '8px', height: '8px', cursor: 'pointer' }}
                id={`${id}-target`}
            />
            <div className={getIconContainerStyle()}>
                {data.status === 'running' && <FaSpinner className="animate-spin text-yellow-400 w-4 h-4" />}
                {data.status === 'completed' && <FaCheckCircle className="text-green-400 w-4 h-4" />}
                {data.status === 'failed' && <FaTimesCircle className="text-red-400 w-4 h-4" />}
                {data.status === 'standby' && <FaCircle className="text-white/80 w-4 h-4" />}
            </div>
            <div className="text-[8px] text-slate-400 mt-1 max-w-[80px] text-center">{data.fullName}</div>
            <div className="flex gap-0.5 mt-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        canRun && runNode(id);
                    }}
                    disabled={!canRun}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[6px] relative
                        ${!canRun
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                >
                    <FaPlay className="w-1 h-1" />
                    Run
                    {showTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[6px] 
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
                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[6px] ${!isRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-red-400'
                        }`}
                >
                    <FaStop className="w-1 h-1" />
                    Stop
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        resetNodeAndDownstream(id);
                    }}
                    disabled={!canReset && !isRunning}
                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[6px] ${!canReset && !isRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                >
                    <FaUndo className="w-1 h-1" />
                    Reset
                </button>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#10b981', width: '8px', height: '8px', cursor: 'pointer' }}
                id={`${id}-source`}
            />
        </div>
    );
});

export default function CompletenessControl({ instanceId }: { instanceId?: string }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [bottomBarHeight, setBottomBarHeight] = useState(96);
    const [isResizingBottom, setIsResizingBottom] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [areParamsApplied, setAreParamsApplied] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const minWidth = 48;
    const maxWidth = 800;
    const minHeight = 32;
    const nodeTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [runParams, setRunParams] = useState<LocalRunParameters>({
        expectedRunDate: '',
        inputConfigFilePath: '',
        inputConfigFilePattern: '',
        rootFileDir: '',
        runEnv: '',
        tempFilePath: ''
    });
    const [processIds, setProcessIds] = useState<{ [key: string]: string }>({});
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
    const [validatedParams, setValidatedParams] = useState<LocalRunParameters | null>(null);
    const [nodeOutputs, setNodeOutputs] = useState<{ [nodeId: string]: any }>(() => {
        const savedOutputs = localStorage.getItem('nodeOutputs');
        return savedOutputs ? JSON.parse(savedOutputs) : {};
    });
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

    // Add validation state
    const [paramValidation, setParamValidation] = useState<RunParameterValidation>({
        isValid: false,
        message: 'Please fill all required parameters'
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            areParamsApplied,
            nodeOutputs,
            setSelectedNode
        }
    })));

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
        setNodes(nds => nds.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, status } }
                : node
        ));
    }, [setNodes]);

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
            localStorage.setItem('validatedParams', JSON.stringify(runParams));
            setValidatedParams(runParams);
            setAreParamsApplied(true);
        } else {
            localStorage.removeItem('validatedParams');
            setAreParamsApplied(false);
        }
        
        return !hasErrors;
    }, [runParams]);

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
        const baseStyle = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-sm";
        return invalidFields.has(fieldName)
            ? `${baseStyle} border-red-500 bg-red-50 focus:ring-red-200 text-red-500`
            : `${baseStyle} border-gray-300 focus:ring-emerald-200 text-emerald-500 placeholder:text-emerald-300/50 placeholder:text-xs`;
    };

    // Parameter input fields JSX
    const renderParameterInputs = () => (
        <div className="space-y-4">
            {Object.entries(runParams).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                    <label className="text-sm font-bold text-white mb-1">
                        {key}
                        {invalidFields.has(key) && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                    {key === 'runEnv' ? (
                        <select
                            value={value || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            className={`${getInputStyle(key)} ${!value ? 'text-emerald-300/50 text-xs' : 'text-emerald-500'}`}
                        >
                            <option value="" className="text-emerald-300/50 text-xs">Select Environment</option>
                            <option value="development" className="text-emerald-500">Development</option>
                            <option value="staging" className="text-emerald-500">Staging</option>
                            <option value="production" className="text-emerald-500">Production</option>
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
                            placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
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
        localStorage.removeItem('nodeOutputs');
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

        console.log('🧹 Reset all nodes and cleared all data');
    }, [setNodes]);

    // Function to run nodes in sequence
    const runAllNodes = async () => {
        if (!areParamsApplied) {
            console.log('❌ Cannot run all nodes: Parameters have not been applied');
            return;
        }

        // Get parameters from localStorage
        const storedParams = localStorage.getItem('validatedParams');
        if (!storedParams) {
            console.log('❌ Cannot run all nodes: No validated parameters found');
            setAreParamsApplied(false);
            return;
        }

        setIsRunningAll(true);
        const nodeSequence = [
            // Top flow
            'reading_config_comp',
            'file_searching_comp',
            'harmonisation_src',
            'src_enrichment',
            'data_transform',
            // Bottom flow
            'harmonisation_tgt',
            'tgt_enrichment',
            'tgt_data_transform',
            // Final flow
            'combine_data',
            'apply_rules',
            'output_rules',
            'break_rolling'
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
                setBottomBarHeight(Math.max(minHeight, height));
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
    }, [isResizing, isResizingBottom]);

    // Update localStorage whenever nodeOutputs changes
    useEffect(() => {
        localStorage.setItem('nodeOutputs', JSON.stringify(nodeOutputs));
        console.log('💾 Saved node outputs to localStorage:', nodeOutputs);
    }, [nodeOutputs]);

    const resetAllNodeOutputs = useCallback(() => {
        setNodeOutputs({});
        localStorage.removeItem('nodeOutputs');
        console.log('🧹 Cleared all node outputs');
    }, []);

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

        // Update selected node with output data
        if (selectedNodesArr.length > 0) {
            const selectedId = selectedNodesArr[0].id;
            const output = nodeOutputs[selectedId];
            setSelectedNode({
                ...selectedNodesArr[0],
                data: {
                    ...selectedNodesArr[0].data,
                    output
                }
            });
        } else {
            setSelectedNode(null);
        }
    }, [setNodes, nodeOutputs]);

    // Helper: run a single node (original runNode logic, minus dependency checks)
    const runSingleNode = async (nodeId: string) => {
        // Check if parameters have been applied
        if (!areParamsApplied) {
            console.log('❌ Cannot run node: Parameters have not been applied');
            return;
        }
        const storedParams = localStorage.getItem('validatedParams');
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
                localStorage.removeItem('validatedParams');
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
            const prevOutputs = { ...nodeOutputs };
            const request = {
                nodeId,
                parameters: params,
                previousOutputs: prevOutputs,
                timestamp: new Date().toISOString()
            };
            const response = await ApiService.startCalculation(request);
            if (response.process_id) {
                setProcessIds(prev => ({ ...prev, [nodeId]: response.process_id }));
                const pollInterval = setInterval(async () => {
                    try {
                        const status = await ApiService.getProcessStatus(response.process_id);
                        if (status.status === 'completed' || status.status === 'failed') {
                            clearInterval(pollInterval);
                            updateNodeStatus(nodeId, status.status);
                            if (status.status === 'completed' && status.output) {
                                setNodeOutputs(prev => {
                                    const updated = { ...prev, [nodeId]: status.output };
                                    localStorage.setItem('nodeOutputs', JSON.stringify(updated));
                                    return updated;
                                });
                            }
                        }
                    } catch (error) {
                        clearInterval(pollInterval);
                        updateNodeStatus(nodeId, 'failed');
                    }
                }, 1000);
                nodeTimeouts.current[nodeId] = pollInterval;
            }
        } catch (error) {
            updateNodeStatus(nodeId, 'failed');
        }
    };

    // Chain-dependency aware node runner
    const runNode = useCallback(async (nodeId: string) => {
        try {
            await runNodeWithDependencies(
                nodeId,
                runSingleNode,
                dependencyMap,
                nodeStatusMap
            );
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    }, [dependencyMap, nodeStatusMap, runSingleNode]);

    // Downstream reset logic
    const resetNodeAndDownstream = useCallback(async (nodeId: string) => {
        const toReset = Array.from(getAllDownstreamNodes(nodeId, downstreamMap));
        for (const id of toReset) {
            // Stop process if running
            const processId = processIds[id];
            if (processId) {
                try { await ApiService.resetProcess(processId); } catch {}
            }
            if (nodeTimeouts.current[id]) {
                clearInterval(nodeTimeouts.current[id] as any);
                delete nodeTimeouts.current[id];
            }
            updateNodeStatus(id, 'idle');
            setNodeOutputs(prev => {
                const updated = { ...prev };
                delete updated[id];
                localStorage.setItem('nodeOutputs', JSON.stringify(updated));
                return updated;
            });
            setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, output: undefined } } : n));
        }
    }, [downstreamMap, processIds, updateNodeStatus, setNodeOutputs, setNodes]);

    // Add a global message when parameters haven't been applied
    const GlobalMessage = () => {
        if (!areParamsApplied) {
            return (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 
                    bg-slate-900/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
                    Fill and apply parameters to begin execution
                </div>
            );
        }
        return null;
    };

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

    // Define nodeTypes with the required props
    const nodeTypes = useMemo(() => ({
        custom: (props: any) => (
            <CustomNode 
                {...props} 
                nodeOutputs={nodeOutputs}
                setSelectedNode={setSelectedNode}
            />
        )
    }), [nodeOutputs, setSelectedNode]);

    return (
        <HandlerContext.Provider value={{ runNode, resetNodeAndDownstream }}>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <GlobalMessage />
            {/* Main Content */}
                <div className="flex flex-col h-screen">
                    {/* Flow Container */}
                    <div className="flex-1 overflow-hidden">
                        <div className="bg-slate-800/50 border-b border-slate-700/50 p-4">
                            <div className="flex justify-center">
                                <h1 className="text-2xl font-semibold text-emerald-400">
                                    Generic Completeness Control
                        </h1>
                    </div>
                </div>
                        <div className="h-[calc(100vh-180px)]">
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
                                panOnDrag={false}
                                zoomOnScroll={false}
                                preventScrolling={true}
                                className="bg-slate-900"
                                selectNodesOnDrag={false}
                                onSelectionChange={onSelectionChange}
                                multiSelectionKeyCode="Control"
                            >
                                <Background 
                                    color="#475569"
                                    gap={20}
                                    className="bg-slate-900"
                                />
                                <Controls className="bg-slate-800 border border-slate-700/50 rounded-lg" />
                    </ReactFlow>
                </div>
            </div>

                    {/* Bottom Output Bar with Resize Handle */}
                    <div 
                        className="relative bg-slate-800/95 border-t border-slate-700/50"
                        style={{ height: `${bottomBarHeight}px`, minHeight: '120px', maxHeight: '50vh' }}
                    >
            {/* Resize Handle */}
            <div
                className={`
                                absolute -top-1 left-0 w-full h-2 cursor-row-resize z-10
                                ${isResizingBottom ? 'bg-emerald-500' : 'bg-transparent hover:bg-emerald-500/30'}
                    transition-colors
                `}
                onMouseDown={(e) => {
                    e.preventDefault();
                                setIsResizingBottom(true);
                }}
            >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                <FaGripLines className="text-emerald-400/70" />
                            </div>
                        </div>

                        {/* Output Bar Content */}
                        <div className="h-full px-4 overflow-y-auto">
                            {selectedNode ? (
                                <div className="flex-1 text-sm text-slate-300 h-full overflow-hidden">
                                    <div className="flex items-center justify-between h-8 border-b border-slate-700/50">
                                        <span className="text-emerald-400 font-medium">{selectedNode.data?.fullName || selectedNode.fullName} Output</span>
                                        <button 
                                            onClick={() => setSelectedNode(null)}
                                            className="text-slate-400 hover:text-slate-300 text-xs"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-4">
                                        {/* Status */}
                                        <div>
                                            <span className="text-emerald-400 font-medium">Status: </span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                selectedNode.data.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                selectedNode.data.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                selectedNode.data.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {selectedNode.data.status}
                                            </span>
                                        </div>

                                        {/* Run Parameters */}
                                        {selectedNode.data.output?.run_parameters && (
                                            <div>
                                                <h3 className="text-emerald-400 font-medium mb-2">Run Parameters:</h3>
                                                <div className="bg-slate-900/50 rounded p-2 space-y-1">
                                                    {Object.entries(selectedNode.data.output.run_parameters).map(([key, value]) => (
                                                        <div key={key} className="grid grid-cols-2 gap-2">
                                                            <span className="text-slate-400">{key}:</span>
                                                            <span className="text-slate-300">{value as string}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Execution Logs */}
                                        {selectedNode.data.output?.execution_logs && (
                                            <div>
                                                <h3 className="text-emerald-400 font-medium mb-2">Execution Logs:</h3>
                                                <div className="bg-slate-900/50 rounded p-2 space-y-1">
                                                    {selectedNode.data.output.execution_logs.map((log: string, index: number) => (
                                                        <div key={index} className="text-slate-300">
                                                            {log}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Calculation Results */}
                                        {selectedNode.data.output?.calculation_results && (
                                            <div>
                                                <h3 className="text-emerald-400 font-medium mb-2">Calculation Results:</h3>
                                                <div className="bg-slate-900/50 rounded p-2">
                                                    <pre className="text-slate-300 whitespace-pre-wrap">
                                                        {JSON.stringify(selectedNode.data.output.calculation_results, null, 2)}
                                                    </pre>
                                                </div>
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
                </div>
            </div>

            {/* Right Sidebar */}
            <div
                ref={resizeRef}
                className={`
                        fixed right-0 top-0 h-full bg-slate-800/95 border-l border-slate-700/50
                    transition-all duration-300 ease-in-out
                    ${!isSidebarOpen ? 'w-12' : ''}
                `}
                style={{
                    width: isSidebarOpen ? `${sidebarWidth}px` : '48px',
                    transition: isResizing ? 'none' : undefined
                }}
                onDoubleClick={() => !isResizing && setIsSidebarOpen(!isSidebarOpen)}
            >
                    {/* Resize Handle */}
                    <div
                        className={`
                            absolute left-0 top-0 h-full w-1 cursor-col-resize
                            ${isResizing ? 'bg-emerald-500' : 'hover:bg-emerald-500/30'}
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
                        flex items-center h-16 px-4 border-b border-slate-700/50
                    ${isSidebarOpen ? 'justify-between' : 'justify-center'}
                `}>
                    {isSidebarOpen && (
                            <span className="text-emerald-400 font-medium">
                            Run Parameters
                        </span>
                    )}
                    <FaChevronLeft
                        className={`
                                text-emerald-400/70 cursor-pointer transition-transform duration-300 hover:text-emerald-300
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
                        <div className="p-6 text-slate-300 overflow-y-auto max-h-[calc(100vh-4rem)]">
                            <div className="space-y-6">
                                {/* Form fields with updated styling */}
                        <div className="space-y-4">
                                    {renderParameterInputs()}
                            </div>

                                {/* Buttons Container */}
                                <div className="pt-6 flex gap-4">
                                    <button
                                        onClick={handleApplyParams}
                                        className={`flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm 
                                        font-medium transition-colors shadow-lg shadow-emerald-900/20 focus:ring-2 
                                        focus:ring-emerald-500/50 active:transform active:scale-[0.98]`}
                                    >
                                        Apply Parameters
                                    </button>
                                    {/* Validation Message */}
                                    {paramValidation.message && (
                                        <p className={`mt-2 text-sm ${
                                            paramValidation.isValid ? 'text-emerald-400' : 'text-red-400'
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
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-emerald-400/70 vertical-text"
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