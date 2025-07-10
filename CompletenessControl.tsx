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
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaCircle, FaPlay, FaStop, FaUndo,
  FaChevronLeft, FaChevronUp, FaFolder, FaGripLines, FaChartBar, FaTable, FaFileAlt,
  FaExclamationTriangle } from 'react-icons/fa';
import { ApiService } from '@/app/services/api';
import { buildDependencyMap, buildDownstreamMap, runNodeWithDependencies,
  getAllDownstreamNodes } from '@/app/utils/graph-utils';
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