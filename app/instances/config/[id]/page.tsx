'use client';

import { useEffect, useState } from 'react';
import ConfigControl from '@/app/controls/config/page';

export default function ConfigInstance({ params }: { params: Promise<{ id: string }> }) {
    const [instanceId, setInstanceId] = useState<string>('');
    const [timestamp, setTimestamp] = useState<string>('');

    useEffect(() => {
        const initializeInstance = async () => {
            const resolvedParams = await params;
            setInstanceId(resolvedParams.id);
            setTimestamp(new Date().toISOString());
            document.title = `Config Control - ${resolvedParams.id}`;
        };

        initializeInstance();
    }, [params]);

    if (!instanceId || !timestamp) {
        return null; // or a loading state
    }

    return (
        <div>
            <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                            Instance ID: {instanceId}
                        </div>
                        <div className="text-sm text-gray-400">
                            Created: {timestamp}
                        </div>
                    </div>
                </div>
            </div>
            <ConfigControl />
        </div>
    );
} 