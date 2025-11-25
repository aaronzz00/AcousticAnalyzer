import React, { useEffect, useRef, useState } from 'react';

interface LazyChartWrapperProps {
    id: string;
    onVisible: (id: string) => void;
    isRendered: boolean;
    children: React.ReactNode;
    placeholder?: React.ReactNode;
}

export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({
    id,
    onVisible,
    isRendered,
    children,
    placeholder
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasBeenVisible, setHasBeenVisible] = useState(false);

    useEffect(() => {
        if (hasBeenVisible || isRendered) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasBeenVisible(true);
                    onVisible(id);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [id, onVisible, hasBeenVisible, isRendered]);

    return (
        <div ref={containerRef}>
            {(hasBeenVisible || isRendered) ? children : (
                placeholder || (
                    <div className="w-full h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="text-gray-400">Loading chart...</div>
                    </div>
                )
            )}
        </div>
    );
};
