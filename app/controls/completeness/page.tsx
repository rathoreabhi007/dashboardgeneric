'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

// Update the CustomNode component
const CustomNode = ({ data, id }: { data: any; id: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const isRunning = data.status === 'running';
    const canReset = data.status === 'failed' || data.status === 'completed';
    const isSelected = data.selected || false;

    // Check if the node can run
    const canRun = data.areParamsApplied && !isRunning;

    // Tooltip message
    const tooltipMessage = !data.areParamsApplied 
        ? "Please apply parameters first" 
        : isRunning 
            ? "Node is running" 
            : "Click to run node";

    const handlePinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onPinClick) {
            data.onPinClick(data);
        }
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
        >
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#10b981', width: '8px', height: '8px', cursor: 'pointer' }}
                id={`${id}-target`}
                onClick={handlePinClick}
            />
            <div className={getIconContainerStyle()}>
                {data.status === 'running' && <FaSpinner className="animate-spin text-yellow-400 w-4 h-4" />}
                {data.status === 'completed' && <FaCheckCircle className="text-green-400 w-4 h-4" />}
                {data.status === 'failed' && <FaTimesCircle className="text-red-400 w-4 h-4" />}
                {data.status === 'standby' && <FaSpinner className="text-blue-400 w-4 h-4" />}
                {data.status === 'idle' && <FaCircle className="text-white/80 w-4 h-4" />}
            </div>
            <div className="text-[8px] text-slate-400 mt-1 max-w-[80px] text-center">{data.fullName}</div>
            <div className="flex gap-0.5 mt-1">
                <button
                    onClick={() => canRun && data.onRun?.(id)}
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
                            {tooltipMessage}
                        </div>
                    )}
                </button>
                <button
                    onClick={() => data.onStop?.(id)}
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
                    onClick={() => data.onReset?.(id)}
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
                onClick={handlePinClick}
            />
        </div>
    );
};

// nodeTypes defined outside the component
const nodeTypes = { custom: CustomNode };

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
            onPinClick: (data: any) => setSelectedNode(data),
            onRun: async (nodeId: string) => {
                console.log(`🎯 Starting node ${nodeId}`);
                const currentNode = nodes.find(n => n.id === nodeId);
                if (currentNode?.data.status === 'running') {
                    console.log('⚠️ Node is already running');
                    return;
                }

                // Get and validate parameters from localStorage
                const storedParams = localStorage.getItem('validatedParams');
                if (!storedParams) {
                    console.log('❌ No validated parameters found');
                    setParamValidation({
                        isValid: false,
                        message: 'Please apply parameters before running nodes'
                    });
                    return;
                }

                // Parse and validate parameters
                try {
                    const params = JSON.parse(storedParams) as LocalRunParameters;
                    const hasEmptyFields = Object.entries(params).some(([key, value]) => {
                        if (!value || (typeof value === 'string' && value.trim() === '')) {
                            console.log(`❌ Invalid parameter detected: ${key}`);
                            return true;
                        }
                        return false;
                    });

                    if (hasEmptyFields) {
                        console.log('❌ Invalid parameters detected');
                        setParamValidation({
                            isValid: false,
                            message: 'Invalid parameters detected. Please apply valid parameters.'
                        });
                        localStorage.removeItem('validatedParams');
                        return;
                    }

                    // Additional validation for expected date format (YYYY-MM-DD)
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(params.expectedRunDate)) {
                        console.log('❌ Invalid date format');
                        setParamValidation({
                            isValid: false,
                            message: 'Invalid date format. Use YYYY-MM-DD format.'
                        });
                        localStorage.removeItem('validatedParams');
                        return;
                    }

                    // Additional validation for paths
                    if (!params.inputConfigFilePath.includes('/') && !params.inputConfigFilePath.includes('\\')) {
                        console.log('❌ Invalid config file path');
                        setParamValidation({
                            isValid: false,
                            message: 'Invalid config file path format.'
                        });
                        localStorage.removeItem('validatedParams');
                        return;
                    }

                    // Validate environment
                    const validEnvs = ['development', 'staging', 'production'];
                    if (!validEnvs.includes(params.runEnv.toLowerCase())) {
                        console.log('❌ Invalid environment');
                        setParamValidation({
                            isValid: false,
                            message: 'Invalid environment. Use development, staging, or production.'
                        });
                        localStorage.removeItem('validatedParams');
                        return;
                    }

                    console.log('📝 Run Parameters:', params);

                    // Update node status to running
                    updateNodeStatus(nodeId, 'running');

                    // Get previous outputs
                    const prevOutputs = { ...nodeOutputs };
                    console.log('📂 Latest outputs from localStorage:', prevOutputs);

                    // Prepare the request
                    const request = {
                        nodeId,
                        parameters: params,
                        previousOutputs: prevOutputs,
                        timestamp: new Date().toISOString()
                    };

                    console.log('🚀 Node Execution - Full Request:', request);

                    // Start the calculation
                    const response = await ApiService.startCalculation(request);
                    console.log('📤 Backend Response:', response);

                    if (response.process_id) {
                        console.log('✨ Process started with ID:', response.process_id);
                        setProcessIds(prev => ({
                            ...prev,
                            [nodeId]: response.process_id
                        }));

                        // Set up polling for status
                        const pollInterval = setInterval(async () => {
                            try {
                                const status = await ApiService.getProcessStatus(response.process_id);
                                console.log(`📊 Status update for ${nodeId}:`, status);

                                if (status.status === 'completed' || status.status === 'failed') {
                                    updateNodeStatus(nodeId, status.status);
                                    console.log(`✅ Process ${response.process_id} finished with status: ${status.status}`);
                                    clearInterval(pollInterval);
                                    
                                    if (status.output) {
                                        console.log(`📦 Node ${nodeId} Output:`, status.output);
                                        
                                        // Update nodeOutputs state and localStorage atomically
                                        const newOutput = status.output;
                                        setNodeOutputs(prev => {
                                            const updated = {
                                                ...prev,
                                                [nodeId]: newOutput
                                            };
                                            // Save to localStorage immediately
                                            localStorage.setItem('nodeOutputs', JSON.stringify(updated));
                                            console.log('🔄 Updated nodeOutputs state and localStorage:', updated);
                                            return updated;
                                        });
                                        
                                        // Update node data with output
                                        setNodes(nds => nds.map(n => 
                                            n.id === nodeId 
                                                ? { ...n, data: { ...n.data, output: status.output } }
                                                : n
                                        ));
                                    }
                                }
                            } catch (error) {
                                console.error('❌ Error polling status:', error);
                                updateNodeStatus(nodeId, 'failed');
                                clearInterval(pollInterval);
                            }
                        }, 1000);

                        nodeTimeouts.current[nodeId] = pollInterval as any;
                    }
                } catch (error) {
                    console.error('❌ Error parsing parameters:', error);
                    setParamValidation({
                        isValid: false,
                        message: 'Invalid parameter format detected.'
                    });
                    localStorage.removeItem('validatedParams');
                    return;
                }
            },
            onStop: async (nodeId: string) => {
                console.log(`Stopping node ${nodeId}`);
                const processId = processIds[nodeId];
                if (processId) {
                    try {
                        await ApiService.stopProcess(processId);
                        console.log(`Process ${processId} stopped successfully`);
                    } catch (error) {
                        console.error('Error stopping process:', error);
                    }
                }

                if (nodeTimeouts.current[nodeId]) {
                    clearInterval(nodeTimeouts.current[nodeId] as any);
                    delete nodeTimeouts.current[nodeId];
                }
                updateNodeStatus(nodeId, 'failed');
            },
            onReset: async (nodeId: string) => {
                console.log(`🔄 Resetting node ${nodeId}`);
                const processId = processIds[nodeId];
                if (processId) {
                    try {
                        await ApiService.resetProcess(processId);
                        console.log(`✨ Process ${processId} reset successfully`);
                    } catch (error) {
                        console.error('❌ Error resetting process:', error);
                    }
                }

                if (nodeTimeouts.current[nodeId]) {
                    clearInterval(nodeTimeouts.current[nodeId] as any);
                    delete nodeTimeouts.current[nodeId];
                }
                updateNodeStatus(nodeId, 'idle');
                
                // Clear output for this specific node
                setNodeOutputs(prev => {
                    const updated = { ...prev };
                    delete updated[nodeId];
                    localStorage.setItem('nodeOutputs', JSON.stringify(updated));
                    console.log(`🧹 Cleared output for node ${nodeId}`);
                    return updated;
                });
                
                // Clear any stored output data from node
                setNodes(nds => nds.map(n => 
                    n.id === nodeId 
                        ? { ...n, data: { ...n.data, output: undefined } }
                        : n
                ));
            }
        }
    })));

    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const updateNodeStatus = useCallback((nodeId: string, status: NodeStatus) => {
        console.log(`Node ${nodeId} status updated to: ${status}`);
        setNodes(nds => nds.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, status } }
                : node
        ));
    }, [setNodes]);

    const onConnect = useCallback(
        (params: Connection) => {
            // Add source and target handles to the connection
            const sourceHandle = `${params.source}-source`;
            const targetHandle = `${params.target}-target`;
            setEdges(eds => addEdge({
            ...params,
                sourceHandle,
                targetHandle,
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 1 }
            }, eds));
        },
        [setEdges]
    );

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

    const validateRunParameters = useCallback(() => {
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
            setAreParamsApplied(true);
        } else {
            localStorage.removeItem('validatedParams');
            setAreParamsApplied(false);
        }
        
        return !hasErrors;
    }, [runParams]);

    const handleApplyParams = useCallback(() => {
        const isValid = validateRunParameters();
        if (!isValid) {
            console.log('⚠️ Parameter validation failed. Please check highlighted fields.');
            setAreParamsApplied(false);
            return false;
        }
        setAreParamsApplied(true);
        return true;
    }, [validateRunParameters]);

    // Update the getInputStyle function to use emerald text color
    const getInputStyle = (fieldName: string) => {
        const baseStyle = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors";
        return invalidFields.has(fieldName)
            ? `${baseStyle} border-red-500 bg-red-50 focus:ring-red-200 text-red-500`
            : `${baseStyle} border-gray-300 focus:ring-emerald-200 text-emerald-500 placeholder-emerald-300`;
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
                            className={`${getInputStyle(key)} ${!value ? 'text-emerald-300' : 'text-emerald-500'}`}
                        >
                            <option value="" className="text-emerald-300">Select Environment</option>
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
                            placeholder={`Enter ${key}`}
                        />
                    )}
                    {invalidFields.has(key) && (
                        <p className="mt-1 text-sm text-red-500">
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

    // Add node selection handler
    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        const selectedIds = new Set(nodes.map(n => n.id));
        setSelectedNodes(selectedIds as Set<string>);
        
        // Update nodes with selection state
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                selected: selectedIds.has(node.id)
            }
        })));
    }, [setNodes]);

    // Update the node run function
    const runNode = async (nodeId: string) => {
        // Check if parameters have been applied
        if (!areParamsApplied) {
            console.log('❌ Cannot run node: Parameters have not been applied');
            return;
        }

        // Get parameters from localStorage
        const storedParams = localStorage.getItem('validatedParams');
        if (!storedParams) {
            console.log('❌ Cannot run node: No validated parameters found');
            setAreParamsApplied(false);
            return;
        }

        // Validate stored parameters
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

            // Find all upstream nodes
            const upstreamNodes = new Set<string>();
            const findUpstreamNodes = (currentId: string) => {
                edges.forEach(edge => {
                    if (edge.target === currentId) {
                        upstreamNodes.add(edge.source);
                        findUpstreamNodes(edge.source);
                    }
                });
            };
            findUpstreamNodes(nodeId);

            // Check if all upstream nodes are completed
            const allUpstreamCompleted = Array.from(upstreamNodes).every(id => {
                const node = nodes.find(n => n.id === id);
                return node?.data.status === 'completed';
            });

            if (!allUpstreamCompleted) {
                console.log('⏳ Node in standby: Waiting for upstream nodes to complete');
                updateNodeStatus(nodeId, 'standby');
                return;
            }

            // Proceed with node execution
            console.log(`🎯 Starting node ${nodeId}`);
            const currentNode = nodes.find(n => n.id === nodeId);
            if (currentNode?.data.status === 'running') {
                console.log('⚠️ Node is already running');
                return;
            }

            // Update node status to running
            updateNodeStatus(nodeId, 'running');

            // Get previous outputs
            const prevOutputs = { ...nodeOutputs };
            console.log('📂 Latest outputs from localStorage:', prevOutputs);

            // Prepare the request
            const request = {
                nodeId,
                parameters: params,
                previousOutputs: prevOutputs,
                timestamp: new Date().toISOString()
            };

            console.log('🚀 Node Execution - Full Request:', request);

            // Start the calculation
            const response = await ApiService.startCalculation(request);
            console.log('📤 Backend Response:', response);

            if (response.process_id) {
                console.log('✨ Process started with ID:', response.process_id);
                setProcessIds(prev => ({
                    ...prev,
                    [nodeId]: response.process_id
                }));

                // Set up polling for status
                const pollInterval = setInterval(async () => {
                    try {
                        const status = await ApiService.getProcessStatus(response.process_id);
                        console.log('📊 Status update for ' + nodeId + ':', status);

                        if (status.status === 'completed' || status.status === 'failed') {
                            clearInterval(pollInterval);
                            updateNodeStatus(nodeId, status.status);
                            
                            if (status.status === 'completed' && status.output) {
                                console.log('📦 Node ' + nodeId + ' Output:', status.output);
                                setNodeOutputs(prev => {
                                    const updated = {
                                        ...prev,
                                        [nodeId]: status.output
                                    };
                                    localStorage.setItem('nodeOutputs', JSON.stringify(updated));
                                    console.log('🔄 Updated nodeOutputs state and localStorage:', updated);
                                    return updated;
                                });
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error polling status:', error);
                        clearInterval(pollInterval);
                        updateNodeStatus(nodeId, 'failed');
                    }
                }, 1000);

                nodeTimeouts.current[nodeId] = pollInterval;
            }
        } catch (error) {
            console.error('❌ Error running node:', error);
            updateNodeStatus(nodeId, 'failed');
        }
    };

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <GlobalMessage />
            {/* Main Content */}
            <div className="relative flex flex-col h-screen">
                <div className="flex-1 relative" style={{ height: `calc(100vh - ${bottomBarHeight}px)` }}>
            <div className="flex-1">
                        <div className="bg-slate-800/50 border-b border-slate-700/50 p-4">
                            <div className="flex justify-center">
                                <h1 className="text-2xl font-semibold text-emerald-400">
                                    Generic Completeness Control
                        </h1>
                    </div>
                </div>

                        <div className="h-[calc(100vh-96px-4rem)]">
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
            </div>

                {/* Bottom Output Bar with Resize Handle */}
                <div className="relative">
            {/* Resize Handle */}
            <div
                className={`
                            absolute top-0 left-0 w-full h-1 cursor-row-resize z-10
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
                    <div 
                        className="bg-slate-800/95 border-t border-slate-700/50 px-4 overflow-hidden"
                        style={{ height: `${bottomBarHeight}px` }}
                    >
                        {selectedNode ? (
                            <div className="flex-1 text-sm text-slate-300 h-full overflow-hidden">
                                <div className="flex items-center justify-between h-8 border-b border-slate-700/50">
                                    <span className="text-emerald-400 font-medium">{selectedNode.fullName} Output</span>
                                    <button 
                                        onClick={() => setSelectedNode(null)}
                                        className="text-slate-400 hover:text-slate-300 text-xs"
                                    >
                                        Close
                                    </button>
                                </div>
                                {selectedNode.output ? (
                                    <div className="grid grid-cols-3 gap-4 py-2 text-xs h-[calc(100%-2rem)] overflow-auto">
                                        <div className="overflow-auto">
                                            <div className="font-medium text-emerald-400 mb-1 sticky top-0 bg-slate-800/95 py-1">Run Parameters</div>
                                            <table className="w-full">
                                                <tbody>
                                                    {Object.entries(selectedNode.output.run_parameters || {}).map(([key, value]) => (
                                                        <tr key={key} className="border-b border-slate-700/30">
                                                            <td className="py-0.5 pr-2 text-emerald-400/70">{key}:</td>
                                                            <td className="py-0.5">{String(value)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="overflow-auto">
                                            <div className="font-medium text-emerald-400 mb-1 sticky top-0 bg-slate-800/95 py-1">Execution Logs</div>
                                            <div className="space-y-0.5">
                                                {(selectedNode.output.execution_logs || []).map((log: string, index: number) => (
                                                    <div key={index} className="text-slate-300">{log}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="overflow-auto">
                                            <div className="font-medium text-emerald-400 mb-1 sticky top-0 bg-slate-800/95 py-1">Results</div>
                                            <table className="w-full">
                                                <tbody>
                                                    {Object.entries(selectedNode.output.calculation_results || {}).map(([key, value]) => (
                                                        <tr key={key} className="border-b border-slate-700/30">
                                                            <td className="py-0.5 pr-2 text-emerald-400/70">{key}:</td>
                                                            <td className="py-0.5">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-[calc(100%-2rem)] text-slate-400">
                                        No output available for this node
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-slate-400">
                                Click on a node's pin (left or right circle) to view its output
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
    );
} 