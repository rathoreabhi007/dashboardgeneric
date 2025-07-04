'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function FooterWrapper() {
    const pathname = usePathname();
    const showFooter = pathname === '/';

    if (!showFooter) return null;
    return <Footer />;
} 