from fastapi import FastAPI, HTTPException
import time
from pydantic import BaseModel
import asyncio
from typing import Dict, Optional, List, Any
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import logging
import random
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI server starting up...")
    logger.info("CORS middleware configured")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

class NodeType(str, Enum):
    CONFIG_COMP = "reading_config_comp"
    FILE_SEARCH_SRC = "file_searching_src"
    FILE_SEARCH_TGT = "file_searching_tgt"
    HARMONISATION_SRC = "harmonisation_src"
    SRC_ENRICHMENT = "src_enrichment"
    DATA_TRANSFORM = "data_transform"
    HARMONISATION_TGT = "harmonisation_tgt"
    TGT_ENRICHMENT = "tgt_enrichment"
    TGT_DATA_TRANSFORM = "tgt_data_transform"
    COMBINE_DATA = "combine_data"
    APPLY_RULES = "apply_rules"
    OUTPUT_RULES = "output_rules"
    BREAK_ROLLING = "break_rolling"

class RunParameters(BaseModel):
    expectedRunDate: str
    inputConfigFilePath: str
    inputConfigFilePattern: str
    rootFileDir: str
    runEnv: str
    tempFilePath: str

class CalculationInput(BaseModel):
    nodeId: str
    parameters: RunParameters
    previousOutputs: Optional[Dict[str, Any]] = None

class ProcessStatus(BaseModel):
    process_id: str
    status: str  # "pending", "running", "completed", "failed", "stopped"
    node_id: str
    output: Optional[Dict] = None
    error: Optional[str] = None
    start_time: float
    parameters: Optional[Dict] = None

class ProcessResponse(BaseModel):
    process_id: str
    status: str
    output: Optional[Dict] = None

# Store process information and tasks in memory
processes: Dict[str, ProcessStatus] = {}
tasks: Dict[str, asyncio.Task] = {}

# Store process states
process_states = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Long-Running Calculator API"}

@app.post("/run/{node_id}")
async def run_node(node_id: str, input_data: CalculationInput):
    process_id = f"{node_id}_{int(time.time() * 1000)}"
    
    logger.info(f"📝 Received calculation request for node {node_id} - Process ID: {process_id}")
    logger.info("📋 Parameters received:")
    for key, value in input_data.parameters.dict().items():
        logger.info(f"  - {key}: {value}")
    
    if input_data.previousOutputs:
        logger.info("📋 Previous outputs received:")
        for node_id, output in input_data.previousOutputs.items():
            logger.info(f"  - From node {node_id}: {output}")
    
    # Store initial process state
    processes[process_id] = ProcessStatus(
        process_id=process_id,
        status="running",
        node_id=node_id,
        start_time=time.time(),
        parameters=input_data.parameters.dict()
    )
    
    # Start the node processing in the background
    task = asyncio.create_task(process_node_async(process_id, node_id, input_data.parameters, input_data.previousOutputs))
    tasks[process_id] = task
    
    return {
        "process_id": process_id,
        "status": "running",
        "message": f"Node {node_id} processing started"
    }

@app.get("/status/{process_id}")
async def get_status(process_id: str):
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")
    
    process = processes[process_id]
    elapsed_time = time.time() - process.start_time
    
    return {
        "process_id": process_id,
        "status": process.status,
        "node_id": process.node_id,
        "output": process.output,
        "error": process.error,
        "elapsed_time": f"{elapsed_time:.2f} seconds",
        "parameters": process.parameters
    }

@app.post("/stop/{process_id}")
async def stop_process(process_id: str):
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")
    
    if process_id in tasks and not tasks[process_id].done():
        tasks[process_id].cancel()
        try:
            await tasks[process_id]
        except asyncio.CancelledError:
            processes[process_id].status = "stopped"
            processes[process_id].error = "Process stopped by user"
        
        del tasks[process_id]
        
    return {
        "process_id": process_id,
        "status": processes[process_id].status,
        "message": "Process stopped"
    }

@app.post("/reset/{process_id}")
async def reset_process(process_id: str):
    if process_id in processes:
        if process_id in tasks and not tasks[process_id].done():
            tasks[process_id].cancel()
            try:
                await tasks[process_id]
            except asyncio.CancelledError:
                pass
            del tasks[process_id]
        
        del processes[process_id]
    
    return {
        "message": "Process reset successfully",
        "process_id": process_id
    }

async def process_node_async(process_id: str, node_id: str, params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None):
    try:
        # Simulate processing time based on node type
        processing_time = random.uniform(2, 5)
        await asyncio.sleep(processing_time)
        
        output = process_node(node_id, params, previous_outputs)
        processes[process_id].status = "completed"
        processes[process_id].output = output
        
        logger.info(f"✅ Node {node_id} (Process {process_id}) completed successfully")
        logger.info(f"📤 Output: {output}")
        
    except Exception as e:
        logger.error(f"❌ Error processing node {node_id}: {str(e)}")
        processes[process_id].status = "failed"
        processes[process_id].error = str(e)

def process_node(node_id: str, params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    if node_id == "reading_config_comp":
        return process_config_comp_node(params)
    elif node_id == "file_searching_src":
        return process_file_search_node(params, previous_outputs, "src")
    elif node_id == "file_searching_tgt":
        return process_file_search_node(params, previous_outputs, "tgt")
    elif "harmonisation" in node_id:
        return process_harmonisation_node(params, previous_outputs)
    elif "enrichment" in node_id:
        return process_enrichment_node(params, previous_outputs)
    elif "transform" in node_id:
        return process_transform_node(params, previous_outputs)
    elif node_id == "combine_data":
        return process_combine_node(params, previous_outputs)
    elif node_id == "apply_rules":
        return process_rules_node(params, previous_outputs)
    elif node_id == "output_rules":
        return process_output_node(params, previous_outputs)
    elif node_id == "break_rolling":
        return process_break_node(params, previous_outputs)
    else:
        return process_generic_node(params)

def process_config_comp_node(params: RunParameters) -> Dict:
    """Process the combined config node that handles both SRC and TGT configurations."""
    is_valid = validate_config_file(params.inputConfigFilePath, params.inputConfigFilePattern)
    return {
        "status": "success" if is_valid else "failed",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting combined config validation at {datetime.now().isoformat()}",
            f"Checking file path: {params.inputConfigFilePath}",
            f"Validating against pattern: {params.inputConfigFilePattern}",
            f"Environment: {params.runEnv}",
            "Combined file format validation completed"
        ],
        "calculation_results": {
            "validation_details": {
                "file_path": params.inputConfigFilePath,
                "pattern_matched": params.inputConfigFilePattern,
                "path_format_valid": True,
                "pattern_format_valid": True,
                "combined_validation": True
            },
            "environment_info": {
                "run_date": params.expectedRunDate,
                "environment": params.runEnv,
                "root_directory": params.rootFileDir
            }
        }
    }

def process_file_search_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None, side: str = "src") -> Dict:
    """Process the file searching component for either SRC or TGT side."""
    has_valid_path = '/' in params.rootFileDir or '\\' in params.rootFileDir
    
    # Use config node output if available
    config_validation = None
    if previous_outputs and "reading_config_comp" in previous_outputs:
        config_validation = previous_outputs["reading_config_comp"].get("calculation_results", {}).get("validation_details")
    
    side_path = f"{params.rootFileDir}/{side}"
    
    return {
        "status": "success" if has_valid_path else "failed",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting {side.upper()} file search at {datetime.now().isoformat()}",
            f"Checking {side.upper()} directory: {side_path}",
            f"Environment: {params.runEnv}",
            f"File search completed for {side.upper()}",
            *(["Using config validation from previous node"] if config_validation else [])
        ],
        "calculation_results": {
            "file_search_details": {
                "path": side_path,
                "is_valid": has_valid_path,
                "files_found": [f"example_{side}_1.dat", f"example_{side}_2.dat"]
            },
            "config_validation": config_validation
        }
    }

def process_harmonisation_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting harmonisation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Harmonisation completed"
        ],
        "calculation_results": {
            "harmonisation_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_enrichment_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting enrichment at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Enrichment completed"
        ],
        "calculation_results": {
            "enrichment_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_transform_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting data transformation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Transformation completed"
        ],
        "calculation_results": {
            "transform_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_combine_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting data combination at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Combination completed"
        ],
        "calculation_results": {
            "combine_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_rules_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting rules application at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Rules applied"
        ],
        "calculation_results": {
            "rules_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_output_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting output generation at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Output generated"
        ],
        "calculation_results": {
            "output_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_break_node(params: RunParameters, previous_outputs: Optional[Dict[str, Any]] = None) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting break rolling at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Break rolling completed"
        ],
        "calculation_results": {
            "break_info": {
                "processed_at": datetime.now().isoformat(),
                "environment": params.runEnv
            }
        }
    }

def process_generic_node(params: RunParameters) -> Dict:
    return {
        "status": "success",
        "run_parameters": params.dict(),
        "execution_logs": [
            f"Starting general processing at {datetime.now().isoformat()}",
            f"Processing with environment: {params.runEnv}",
            "Processing completed"
        ],
        "calculation_results": {
            "processed_at": datetime.now().isoformat(),
            "environment": params.runEnv
        }
    }

def validate_config_file(file_path: str, pattern: str) -> bool:
    # Add your config file validation logic here
    return True  # Placeholder return

@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {"status": "healthy", "timestamp": time.time()} 