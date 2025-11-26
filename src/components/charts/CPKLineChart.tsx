import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Statistics } from '../../services/Statistics';
import type { TestItem } from '../../types';

interface CPKLineChartProps {
    item: TestItem;
    layout?: any;
    onRelayout?: (layout: any) => void;
    forceActive?: boolean;
}

export const CPKLineChart: React.FC<CPKLineChartProps> = React.memo(({ item, layout: savedLayout, onRelayout, forceActive }) => {
    const cpkData = useMemo(() => {
        return Statistics.calculateMultiCPK(item.records);
    }, [item.records]);

    if (cpkData.length === 0) return null;

    // Filter out points with null CPK (no limits)
    const validData = cpkData.filter(d => d.cpk !== null);

    if (validData.length === 0) return null;

    const frequencies = validData.map(d => d.frequency);
    const cpkValues = validData.map(d => d.cpk as number);
    const stdDevValues = validData.map(d => d.stdDev);

    const defaultLayout = {
        autosize: true,
        margin: { l: 40, r: 40, t: 20, b: 40 },
        xaxis: {
            type: 'log',
            title: { text: 'Frequency (Hz)' },
            autorange: true
        },
        yaxis: {
            title: { text: 'CPK Value' },
            range: [0, Math.max(2.0, ...cpkValues) * 1.1]
        },
        yaxis2: {
            title: { text: 'Variance', font: { color: '#f59e0b' } },
            overlaying: 'y',
            side: 'right',
            rangemode: 'tozero',
            showgrid: false
        },
        showlegend: true,
        legend: { orientation: 'h', y: 1.1 }
    };

    const [isActive, setIsActive] = React.useState(forceActive || false);

    const finalLayout = {
        ...defaultLayout,
        ...savedLayout,
        xaxis: {
            ...defaultLayout.xaxis,
            ...savedLayout?.xaxis,
            autorange: savedLayout?.xaxis?.range ? false : defaultLayout.xaxis.autorange
        },
        yaxis: {
            ...defaultLayout.yaxis,
            ...savedLayout?.yaxis,
            autorange: savedLayout?.yaxis?.range ? false : (defaultLayout.yaxis.range ? false : true)
        }
    };

    return (
        <div
            className={`w-full h-64 bg-white p-4 rounded-lg shadow mt-4 transition-colors ${!isActive ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => !isActive && setIsActive(true)}
            title={!isActive ? "Click to interact" : ""}
        >
            <h3 className="text-sm font-bold mb-2">CPK & Variance vs Frequency</h3>
            <Plot
                data={[
                    {
                        x: frequencies,
                        y: cpkValues,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'CPK',
                        line: { color: '#4f46e5', width: 2 },
                        marker: { size: 4 }
                    },
                    {
                        x: frequencies,
                        y: stdDevValues,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Variance (StdDev)',
                        yaxis: 'y2',
                        line: { color: '#f59e0b', width: 1.5, dash: 'dot' },
                        opacity: 0.7
                    },
                    {
                        x: [Math.min(...frequencies), Math.max(...frequencies)],
                        y: [1.33, 1.33],
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Target (1.33)',
                        line: { color: 'green', width: 2, dash: 'dash' }
                    }
                ]}
                layout={finalLayout}
                onRelayout={onRelayout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%', pointerEvents: isActive ? 'auto' : 'none' }}
                config={{ displayModeBar: isActive, staticPlot: !isActive }}
            />
        </div>
    );
}, (prevProps, nextProps) => {
    // Allow re-render if item.records change (filter changes)
    return prevProps.item.id === nextProps.item.id &&
        prevProps.item.records.length === nextProps.item.records.length &&
        JSON.stringify(prevProps.layout) === JSON.stringify(nextProps.layout);
});
