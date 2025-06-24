'use client';

import { useEffect, useState } from 'react';
import CompletenessControl from '@/app/controls/completeness/page';

export default function CompletenessInstance({ params }: { params: Promise<{ id: string }> }) {
    const [instanceId, setInstanceId] = useState<string>('');
    const [timestamp, setTimestamp] = useState<string>('');

    useEffect(() => {
        const initializeInstance = async () => {
            const resolvedParams = await params;
            setInstanceId(resolvedParams.id);
            setTimestamp(new Date().toISOString());
            document.title = `Completeness Control`;
        };

        initializeInstance();
    }, [params]);

    if (!instanceId || !timestamp) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5', color: 'black' }}>
                <div className="text-black text-lg">Initializing instance...</div>
            </div>
        );
    }

    return (
        <div>
            <CompletenessControl instanceId={instanceId} />
        </div>
    );
} 