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
import { RunParameters } from '@/app/types';

// Node status types
type NodeStatus = 'idle' | 'running' | 'completed' | 'failed';

const initialNodes: Node[] = [
    // Top flow nodes
    {
        id: 'reading_config_src',
        type: 'custom',
        data: { fullName: 'Reading_config_SRC', status: 'idle' },
        position: { x: 50, y: 20 },
        draggable: false
    },
    {
        id: 'reading_ops_src',
        type: 'custom',
        data: { fullName: 'Reading_ops_SRC', status: 'idle' },
        position: { x: 250, y: 20 },
        draggable: false
    },
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
    // Bottom flow nodes
    {
        id: 'reading_config_tgt',
        type: 'custom',
        data: { fullName: 'Reading_config_TGT', status: 'idle' },
        position: { x: 50, y: 220 },
        draggable: false
    },
    {
        id: 'reading_ops_tgt',
        type: 'custom',
        data: { fullName: 'Reading_ops_TGT', status: 'idle' },
        position: { x: 250, y: 220 },
        draggable: false
    },
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
    // Top flow edges
    {
        id: 'config-to-ops',
        source: 'reading_config_src',
        target: 'reading_ops_src',
        sourceHandle: 'reading_config_src-source',
        targetHandle: 'reading_ops_src-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'ops-to-harmonisation',
        source: 'reading_ops_src',
        target: 'harmonisation_src',
        sourceHandle: 'reading_ops_src-source',
        targetHandle: 'harmonisation_src-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'harmonisation-to-enrichment',
        source: 'harmonisation_src',
        target: 'src_enrichment',
        sourceHandle: 'harmonisation_src-source',
        targetHandle: 'src_enrichment-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'enrichment-to-transform',
        source: 'src_enrichment',
        target: 'data_transform',
        sourceHandle: 'src_enrichment-source',
        targetHandle: 'data_transform-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'transform-to-combine',
        source: 'data_transform',
        target: 'combine_data',
        sourceHandle: 'data_transform-source',
        targetHandle: 'combine_data-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'combine-to-rules',
        source: 'combine_data',
        target: 'apply_rules',
        sourceHandle: 'combine_data-source',
        targetHandle: 'apply_rules-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'rules-to-output',
        source: 'apply_rules',
        target: 'output_rules',
        sourceHandle: 'apply_rules-source',
        targetHandle: 'output_rules-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'output-to-break',
        source: 'output_rules',
        target: 'break_rolling',
        sourceHandle: 'output_rules-source',
        targetHandle: 'break_rolling-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    // Bottom flow edges
    {
        id: 'config-to-ops-tgt',
        source: 'reading_config_tgt',
        target: 'reading_ops_tgt',
        sourceHandle: 'reading_config_tgt-source',
        targetHandle: 'reading_ops_tgt-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'ops-to-harmonisation-tgt',
        source: 'reading_ops_tgt',
        target: 'harmonisation_tgt',
        sourceHandle: 'reading_ops_tgt-source',
        targetHandle: 'harmonisation_tgt-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'harmonisation-to-enrichment-tgt',
        source: 'harmonisation_tgt',
        target: 'tgt_enrichment',
        sourceHandle: 'harmonisation_tgt-source',
        targetHandle: 'tgt_enrichment-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'enrichment-to-transform-tgt',
        source: 'tgt_enrichment',
        target: 'tgt_data_transform',
        sourceHandle: 'tgt_enrichment-source',
        targetHandle: 'tgt_data_transform-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    },
    {
        id: 'transform-to-combine-tgt',
        source: 'tgt_data_transform',
        target: 'combine_data',
        sourceHandle: 'tgt_data_transform-source',
        targetHandle: 'combine_data-target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 1 }
    }
];

// CustomNode component moved outside
const CustomNode = ({ data, id }: { data: any; id: string }) => {
    const isRunning = data.status === 'running';
    const canReset = data.status === 'failed' || data.status === 'completed';

    const handlePinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onPinClick) {
            data.onPinClick(data);
        }
    };

    return (
        <div className="relative flex flex-col items-center">
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#10b981', width: '8px', height: '8px', cursor: 'pointer' }}
                id={`${id}-target`}
                onClick={handlePinClick}
            />
            <div className="w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-full border border-slate-700 shadow-lg">
                {data.status === 'running' && <FaSpinner className="animate-spin text-yellow-400 w-4 h-4" />}
                {data.status === 'completed' && <FaCheckCircle className="text-green-400 w-4 h-4" />}
                {data.status === 'failed' && <FaTimesCircle className="text-red-400 w-4 h-4" />}
                {data.status === 'idle' && <FaCircle className="text-white/80 w-4 h-4" />}
            </div>
            <div className="text-[8px] text-slate-400 mt-1 max-w-[80px] text-center">{data.fullName}</div>
            <div className="flex gap-0.5 mt-1">
                <button
                    onClick={() => data.onRun?.(id)}
                    disabled={isRunning}
                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[6px] ${isRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                >
                    <FaPlay className="w-1 h-1" />
                    Run
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
    const resizeRef = useRef<HTMLDivElement>(null);
    const minWidth = 48;
    const maxWidth = 800;
    const minHeight = 32;
    const nodeTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [runParams, setRunParams] = useState({
        expectedRunDate: new Date().toISOString().split('T')[0],
        inputConfigFilePath: '',
        inputConfigFilePattern: '*.config',
        rootFileDir: '/path/to/root',
        runEnv: 'development',
        tempFilePath: '/tmp'
    });
    const [processIds, setProcessIds] = useState<{ [key: string]: string }>({});
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
    const [validatedParams, setValidatedParams] = useState<RunParameters | null>(null);
    const [nodeOutputs, setNodeOutputs] = useState<{ [nodeId: string]: any }>(() => {
        const savedOutputs = localStorage.getItem('nodeOutputs');
        return savedOutputs ? JSON.parse(savedOutputs) : {};
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onPinClick: (data: any) => setSelectedNode(data),
            onRun: async (nodeId: string) => {
                console.log(`🎯 Starting node ${nodeId}`);
                const currentNode = nodes.find(n => n.id === nodeId);
                if (currentNode?.data.status === 'running') {
                    console.log('⚠️ Node is already running');
                    return;
                }

                // Get parameters from localStorage
                const storedParams = localStorage.getItem('validatedParams');
                const params = storedParams ? JSON.parse(storedParams) : null;

                if (!params) {
                    console.log('❌ No validated parameters found');
                    return;
                }

                console.log('📝 Run Parameters:', {
                    expectedRunDate: params.expectedRunDate,
                    inputConfigFilePath: params.inputConfigFilePath,
                    inputConfigFilePattern: params.inputConfigFilePattern,
                    rootFileDir: params.rootFileDir,
                    runEnv: params.runEnv,
                    tempFilePath: params.tempFilePath
                });

                try {
                updateNodeStatus(nodeId, 'running');

                    // Get previous node outputs based on connections
                    const incomingNodes = edges
                        .filter(edge => edge.target === nodeId)
                        .map(edge => edge.source);
                    
                    console.log('🔍 Current nodeOutputs state:', nodeOutputs);
                    
                    // Get latest outputs from localStorage
                    const savedOutputs = localStorage.getItem('nodeOutputs');
                    const latestOutputs = savedOutputs ? JSON.parse(savedOutputs) : {};
                    console.log('📂 Latest outputs from localStorage:', latestOutputs);
                    
                    const previousOutputs = incomingNodes.reduce((acc, sourceNodeId) => {
                        // First try to get from current state
                        let output = nodeOutputs[sourceNodeId];
                        
                        // If not in current state, try localStorage
                        if (!output && latestOutputs[sourceNodeId]) {
                            output = latestOutputs[sourceNodeId];
                            // Update current state with localStorage data
                            setNodeOutputs(prev => ({
                                ...prev,
                                [sourceNodeId]: output
                            }));
                        }
                        
                        if (output) {
                            acc[sourceNodeId] = output;
                        }
                        return acc;
                    }, {} as { [key: string]: any });

                    // Log incoming connections and their outputs
                    if (incomingNodes.length > 0) {
                        console.log('🔄 Previous Node Connections:', incomingNodes);
                        console.log('📥 Previous Node Outputs:', previousOutputs);
                    }

                    console.log('🚀 Node Execution - Full Request:', {
                        nodeId,
                        parameters: params,
                        previousOutputs,
                        timestamp: new Date().toISOString()
                    });

                    const response = await ApiService.startCalculation({
                        nodeId,
                        parameters: params,
                        previousOutputs
                    }) as { process_id: string; status: string };

                    console.log('📤 Backend Response:', {
                        processId: response.process_id,
                        status: response.status,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`✨ Process started with ID: ${response.process_id}`);
                    setProcessIds(prev => ({ ...prev, [nodeId]: response.process_id }));

                    const pollInterval = setInterval(async () => {
                        try {
                            const status = await ApiService.getProcessStatus(response.process_id);
                            console.log(`📊 Status update for ${nodeId}:`, {
                                processId: response.process_id,
                                status: status.status,
                                output: status.output,
                                timestamp: new Date().toISOString()
                            });
                            
                            if (status.status === 'completed' || status.status === 'failed') {
                                updateNodeStatus(nodeId, status.status as NodeStatus);
                                clearInterval(pollInterval);
                                console.log(`✅ Process ${response.process_id} finished with status: ${status.status}`);
                                
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
                } catch (error) {
                    console.error('❌ Error starting calculation:', error);
                    updateNodeStatus(nodeId, 'failed');
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

    const validateParams = () => {
        const newInvalidFields = new Set<string>();
        
        // Simple validation - just check if fields are non-empty strings
        Object.entries(runParams).forEach(([key, value]) => {
            if (!value || value.trim() === '') {
                newInvalidFields.add(key);
            }
        });

        setInvalidFields(newInvalidFields);
        const isValid = newInvalidFields.size === 0;
        console.log('Validation result:', isValid, 'Parameters:', runParams);
        
        if (isValid) {
            localStorage.setItem('validatedParams', JSON.stringify(runParams));
            setValidatedParams(runParams);
        } else {
            localStorage.removeItem('validatedParams');
            setValidatedParams(null);
        }
        
        return isValid;
    };

    const handleApplyParams = () => {
        if (validateParams()) {
            console.log('Parameters are valid:', runParams);
            // Store in localStorage when applying
            localStorage.setItem('validatedParams', JSON.stringify(runParams));
            setValidatedParams(runParams);
        } else {
            console.log('Parameter validation failed');
            localStorage.removeItem('validatedParams');
            setValidatedParams(null);
        }
    };

    // Function to run nodes in sequence
    const runAllNodes = async () => {
        // Get parameters from localStorage
        const storedParams = localStorage.getItem('validatedParams');
        const params = storedParams ? JSON.parse(storedParams) : null;

        if (!params) {
            console.log('No validated parameters available');
            return;
        }

        setIsRunningAll(true);
        const nodeSequence = [
            // Top flow
            'reading_config_src',
            'reading_ops_src',
            'harmonisation_src',
            'src_enrichment',
            'data_transform',
            // Bottom flow
            'reading_config_tgt',
            'reading_ops_tgt',
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Expected Run Date
                                </label>
                                <input
                                    type="text"
                                    value={runParams.expectedRunDate}
                                    onChange={(e) => handleParamChange('expectedRunDate', e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-sm 
                                    transition-colors hover:border-slate-600/50
                                    ${invalidFields.has('expectedRunDate')
                                        ? 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                        : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50'
                                    }`}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Input Config File Path
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={runParams.inputConfigFilePath}
                                        onChange={(e) => handleParamChange('inputConfigFilePath', e.target.value)}
                                        className={`flex-1 px-4 py-2.5 bg-slate-800/50 border rounded-lg text-sm 
                                        transition-colors hover:border-slate-600/50
                                        ${invalidFields.has('inputConfigFilePath')
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                            : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50'
                                        }`}
                                        placeholder="/path/to/config"
                                    />
                                    <button
                                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors
                                        border border-slate-700/50 hover:border-slate-600/50 group"
                                        title="Browse"
                                    >
                                        <FaFolder className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                                    </button>
                                </div>
                            </div>

                            {/* Input Config File Pattern */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Input Config File Pattern
                                </label>
                                <input
                                    type="text"
                                    value={runParams.inputConfigFilePattern}
                                    onChange={(e) => handleParamChange('inputConfigFilePattern', e.target.value)}
                                    className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-sm 
                                    transition-colors hover:border-slate-600/50
                                    ${invalidFields.has('inputConfigFilePattern')
                                        ? 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                        : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50'
                                    }`}
                                    placeholder="*.config"
                                />
                            </div>

                            {/* Root File Directory */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Root File Directory
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={runParams.rootFileDir}
                                        onChange={(e) => handleParamChange('rootFileDir', e.target.value)}
                                        className={`flex-1 px-4 py-2.5 bg-slate-800/50 border rounded-lg text-sm 
                                        transition-colors hover:border-slate-600/50
                                        ${invalidFields.has('rootFileDir')
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                            : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50'
                                        }`}
                                        placeholder="/path/to/root"
                                    />
                                    <button
                                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors
                                        border border-slate-700/50 hover:border-slate-600/50 group"
                                        title="Browse"
                                    >
                                        <FaFolder className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                                    </button>
                                </div>
                            </div>

                            {/* Run Environment */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Run Environment
                                </label>
                                <select
                                    value={runParams.runEnv}
                                    onChange={(e) => handleParamChange('runEnv', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                    focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                    hover:border-slate-600/50"
                                >
                                    <option value="development">Development</option>
                                    <option value="staging">Staging</option>
                                    <option value="production">Production</option>
                                </select>
                            </div>

                            {/* Temp Filepath */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Temp Filepath
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={runParams.tempFilePath}
                                        onChange={(e) => handleParamChange('tempFilePath', e.target.value)}
                                        className={`flex-1 px-4 py-2.5 bg-slate-800/50 border rounded-lg text-sm 
                                        transition-colors hover:border-slate-600/50
                                        ${invalidFields.has('tempFilePath')
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                                            : 'border-slate-700/50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50'
                                        }`}
                                        placeholder="/tmp"
                                    />
                                    <button
                                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors
                                        border border-slate-700/50 hover:border-slate-600/50 group"
                                        title="Browse"
                                    >
                                        <FaFolder className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                                    </button>
                                </div>
                            </div>

                            {/* Buttons Container */}
                            <div className="pt-6 flex gap-4">
                                <button
                                    onClick={handleApplyParams}
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm 
                                    font-medium transition-colors shadow-lg shadow-emerald-900/20 focus:ring-2 
                                    focus:ring-emerald-500/50 active:transform active:scale-[0.98]"
                                >
                                    Apply Parameters
                                </button>
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
                                    onClick={resetAllNodeOutputs}
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