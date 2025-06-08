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
type NodeStatus = 'idle' | 'running' | 'completed' | 'failed';

const CustomNode = ({ data, ...props }: any) => {
    const isRunning = data.status === 'running';
    const canReset = data.status === 'failed' || data.status === 'completed';

    return (
        <div className="relative flex flex-col items-center">
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#10b981', width: '8px', height: '8px' }}
                id={`${props.id}-target`}
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
                    onClick={() => data.onRun?.(props.id)}
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
                    onClick={() => data.onStop?.(props.id)}
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
                    onClick={() => data.onReset?.(props.id)}
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
                style={{ background: '#10b981', width: '8px', height: '8px' }}
                id={`${props.id}-source`}
            />
        </div>
    );
};

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

export default function CompletenessControl({ instanceId }: { instanceId?: string }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(320); // 320px = w-80
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const minWidth = 48; // 12 * 4 = 48px (w-12)
    const maxWidth = 640; // Maximum width
    const nodeTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [runParams, setRunParams] = useState({
        expectedRunDate: new Date().toISOString().split('T')[0],
        inputConfigFilePath: '',
        inputConfigFilePattern: '*.config',
        rootFileDir: '/path/to/root',
        runEnv: 'development',
        tempFilesPath: '/tmp'
    });
    const [processIds, setProcessIds] = useState<{ [key: string]: string }>({});

    // Memoize nodeTypes to prevent recreation on each render
    const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onRun: async (nodeId: string) => {
                console.log(`Starting node ${nodeId}`);
                const currentNode = nodes.find(n => n.id === nodeId);
                if (currentNode?.data.status === 'running') return;

                try {
                    updateNodeStatus(nodeId, 'running');
                    const response = await ApiService.startCalculation({
                        num1: Math.random() * 100,
                        num2: Math.random() * 100,
                        num3: Math.random() * 100
                    });

                    console.log(`Process started with ID: ${response.process_id}`);
                    setProcessIds(prev => ({ ...prev, [nodeId]: response.process_id }));

                    const pollInterval = setInterval(async () => {
                        try {
                            const status = await ApiService.getProcessStatus(response.process_id);
                            console.log(`Status update for ${nodeId}: ${status.status}`);
                            
                            if (status.status === 'completed' || status.status === 'failed') {
                                updateNodeStatus(nodeId, status.status as NodeStatus);
                                clearInterval(pollInterval);
                                console.log(`Process ${response.process_id} finished with status: ${status.status}`);
                            }
                        } catch (error) {
                            console.error('Error polling status:', error);
                            updateNodeStatus(nodeId, 'failed');
                            clearInterval(pollInterval);
                        }
                    }, 1000);

                    nodeTimeouts.current[nodeId] = pollInterval as any;
                } catch (error) {
                    console.error('Error starting calculation:', error);
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
                console.log(`Resetting node ${nodeId}`);
                const processId = processIds[nodeId];
                if (processId) {
                    try {
                        await ApiService.resetProcess(processId);
                        console.log(`Process ${processId} reset successfully`);
                    } catch (error) {
                        console.error('Error resetting process:', error);
                    }
                }

                if (nodeTimeouts.current[nodeId]) {
                    clearInterval(nodeTimeouts.current[nodeId] as any);
                    delete nodeTimeouts.current[nodeId];
                }
                updateNodeStatus(nodeId, 'idle');
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
        setRunParams(prev => ({
            ...prev,
            [param]: value
        }));
    };

    const handleApplyParams = () => {
        // Here we'll implement the parameter application logic
        console.log('Applying parameters:', runParams);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = document.documentElement.clientWidth - e.clientX;
            const width = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setSidebarWidth(width);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Main Content */}
            <div className="flex-1">
                <div className="bg-slate-800/50 border-b border-slate-700/50 p-4">
                    <div className="flex justify-center">
                        <h1 className="text-2xl font-semibold text-emerald-400">
                            Generic Completeness Control
                        </h1>
                    </div>
                </div>

                <div className="h-[calc(100vh-96px)]">
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

            {/* Resize Handle */}
            <div
                className={`
                    absolute right-auto h-full w-1 cursor-col-resize z-10
                    ${isResizing ? 'bg-emerald-500' : 'bg-transparent hover:bg-emerald-500/30'}
                    transition-colors
                `}
                style={{ left: `calc(100% - ${sidebarWidth}px - 2px)` }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
            >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <FaGripLines className="text-emerald-400/70 rotate-90" />
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
                                    type="date"
                                    value={runParams.expectedRunDate}
                                    onChange={(e) => handleParamChange('expectedRunDate', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                    focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                    hover:border-slate-600/50"
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
                                        className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                        focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                        hover:border-slate-600/50"
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
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                    focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                    hover:border-slate-600/50"
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
                                        className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                        focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                        hover:border-slate-600/50"
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

                            {/* Temporary Files Path */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-emerald-400/90">
                                    Temporary Files Path
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={runParams.tempFilesPath}
                                        onChange={(e) => handleParamChange('tempFilesPath', e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm 
                                        focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors
                                        hover:border-slate-600/50"
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

                            {/* Apply Button */}
                            <div className="pt-6">
                                <button
                                    onClick={handleApplyParams}
                                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm 
                                    font-medium transition-colors shadow-lg shadow-emerald-900/20 focus:ring-2 
                                    focus:ring-emerald-500/50 active:transform active:scale-[0.98]"
                                >
                                    Apply Parameters
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