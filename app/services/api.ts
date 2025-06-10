const API_BASE_URL = 'http://localhost:8000';

export interface CalculationRequest {
    num1: number;
    num2: number;
    num3: number;
}

export interface ProcessStatus {
    process_id: string;
    status: string;
    result?: number;
    error?: string;
    elapsed_time?: string;
    input_numbers?: Record<string, number>;
}

export interface RunParameters {
    expectedRunDate: string;
    inputConfigFilePath: string;
    inputConfigFilePattern: string;
    rootFileDir: string;
    runEnv: string;
    tempFilePath: string;
}

export interface CalculationInput {
    nodeId: string;
    parameters: RunParameters;
    previousOutputs?: { [nodeId: string]: any };
    num1?: number;
    num2?: number;
    num3?: number;
}

export class ApiService {
    static async healthCheck(): Promise<{ status: string, timestamp: number }> {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            throw new Error('Health check failed');
        }
        return response.json();
    }

    static async startCalculation(input: CalculationInput): Promise<{ process_id: string }> {
        const response = await fetch(`${API_BASE_URL}/run/${input.nodeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });
        if (!response.ok) {
            throw new Error(`Failed to start calculation for node ${input.nodeId}`);
        }
        return response.json();
    }

    static async getProcessStatus(processId: string): Promise<{ status: string; output?: any }> {
        const response = await fetch(`${API_BASE_URL}/status/${processId}`);
        if (!response.ok) {
            throw new Error('Failed to get process status');
        }
        return response.json();
    }

    static async stopProcess(processId: string): Promise<{ status: string }> {
        const response = await fetch(`${API_BASE_URL}/stop/${processId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to stop process');
        }
        return response.json();
    }

    static async resetProcess(processId: string): Promise<{ status: string }> {
        const response = await fetch(`${API_BASE_URL}/reset/${processId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to reset process');
        }
        return response.json();
    }
} 