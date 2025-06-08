from fastapi import FastAPI, HTTPException
import time
from pydantic import BaseModel
import asyncio
from typing import Dict, Optional
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import logging

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

class Numbers(BaseModel):
    num1: float
    num2: float
    num3: float

class ProcessStatus(BaseModel):
    process_id: str
    status: str  # "pending", "running", "completed", "failed", "stopped"
    result: Optional[float] = None
    error: Optional[str] = None
    start_time: float
    input_numbers: Optional[Dict] = None

# Store process information and tasks in memory
processes: Dict[str, ProcessStatus] = {}
tasks: Dict[str, asyncio.Task] = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Long-Running Calculator API"}

@app.post("/calculate/sum")
async def start_calculation(numbers: Numbers):
    # Generate a unique process ID
    process_id = str(uuid.uuid4())
    
    # Store process information
    processes[process_id] = ProcessStatus(
        process_id=process_id,
        status="pending",
        start_time=time.time(),
        input_numbers={
            "num1": numbers.num1,
            "num2": numbers.num2,
            "num3": numbers.num3
        }
    )
    
    # Start the calculation in the background
    task = asyncio.create_task(run_calculation(process_id, numbers))
    tasks[process_id] = task
    
    return {
        "process_id": process_id,
        "message": "Calculation started",
        "status_endpoint": f"/status/{process_id}"
    }

@app.post("/stop/{process_id}")
async def stop_calculation(process_id: str):
    if process_id not in processes:
        raise HTTPException(status_code=404, detail="Process not found")
    
    if process_id in tasks and not tasks[process_id].done():
        # Cancel the task
        tasks[process_id].cancel()
        try:
            await tasks[process_id]
        except asyncio.CancelledError:
            processes[process_id].status = "stopped"
            processes[process_id].error = "Process stopped by user"
        
        # Clean up
        del tasks[process_id]
        
    return {
        "process_id": process_id,
        "message": "Process stopped",
        "status": processes[process_id].status
    }

@app.post("/reset/{process_id}")
async def reset_calculation(process_id: str):
    if process_id in processes:
        # Stop the process if it's running
        if process_id in tasks and not tasks[process_id].done():
            tasks[process_id].cancel()
            try:
                await tasks[process_id]
            except asyncio.CancelledError:
                pass
            del tasks[process_id]
        
        # Remove process data
        del processes[process_id]
    
    return {
        "message": "Process reset successfully",
        "process_id": process_id
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
        "result": process.result,
        "error": process.error,
        "elapsed_time": f"{elapsed_time:.2f} seconds",
        "input_numbers": process.input_numbers
    }

async def run_calculation(process_id: str, numbers: Numbers):
    try:
        # Update status to running
        processes[process_id].status = "running"
        
        # Simulate a long computation (3 minutes)
        await asyncio.sleep(180)  # 180 seconds = 3 minutes
        
        # Perform the calculation
        result = numbers.num1 + numbers.num2 + numbers.num3
        
        # Update process with result
        processes[process_id].status = "completed"
        processes[process_id].result = result
        
    except asyncio.CancelledError:
        processes[process_id].status = "stopped"
        processes[process_id].error = "Process stopped by user"
        raise
    except Exception as e:
        # Update process with error
        processes[process_id].status = "failed"
        processes[process_id].error = str(e)

@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {"status": "healthy", "timestamp": time.time()} 