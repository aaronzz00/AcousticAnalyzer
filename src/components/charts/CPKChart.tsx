import React from 'react';
import Plot from 'react-plotly.js';
import type { TestItem, SingleValueRecord } from '../../types';
import { Statistics } from '../../services/Statistics';

interface CPKChartProps {
    item: TestItem;
    layout?: any;
    onRelayout?: (layout: any) => void;
    forceActive?: boolean;
}

export const CPKChart: React.FC<CPKChartProps> = React.memo(({ item, layout: savedLayout, onRelayout, forceActive }) => {
    // ... (existing logic) ...

    const [isActive, setIsActive] = React.useState(forceActive || false);

    // ... (calculation logic) ...

    if (item.isMulti) {
        return <div className="text-sm text-gray-500">CPK Analysis for Multi-point data not fully defined.</div>;
    }

    const records = item.records as SingleValueRecord[];
    const values = records.map(r => r.value).filter(v => v !== null);

    if (values.length === 0) return <div className="text-sm text-gray-500">No data available.</div>;

    const upper = records[0]?.upperLimit;
    const lower = records[0]?.lowerLimit;

    const cpk = Statistics.calculateCPK(values, upper, lower);
    const mean = Statistics.calculateMean(values);
    const stdDev = Statistics.calculateStdDev(values, mean);

    // If CPK is valid (limits exist), show Histogram + CPK Text
    if (cpk !== null) {
        // Generate Normal Distribution Curve
        const x = [];
        const y = [];
        const min = Math.min(...values, lower || -Infinity);
        const max = Math.max(...values, upper || Infinity);
        const range = max - min;
        const step = range / 100 || 1;

        for (let i = min - range / 2; i <= max + range / 2; i += step) {
            x.push(i);
            const exponent = -0.5 * Math.pow((i - mean) / stdDev, 2);
            const prob = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            y.push(prob);
        }

        const defaultLayout = {
            autosize: true,
            showlegend: true,
            margin: { l: 40, r: 20, t: 20, b: 30 },
            xaxis: { title: { text: 'Value' }, autorange: true },
            yaxis: { title: { text: 'Count' }, autorange: true },
            shapes: [
                ...(lower !== null ? [{
                    type: 'line' as const, x0: lower, x1: lower, y0: 0, y1: 1, xref: 'x' as const, yref: 'paper' as const,
                    line: { color: 'red', width: 2, dash: 'dash' as const }
                }] : []),
                ...(upper !== null ? [{
                    type: 'line' as const, x0: upper, x1: upper, y0: 0, y1: 1, xref: 'x' as const, yref: 'paper' as const,
                    line: { color: 'red', width: 2, dash: 'dash' as const }
                }] : [])
            ]
        };

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
                autorange: savedLayout?.yaxis?.range ? false : defaultLayout.yaxis.autorange
            }
        };

        return (
            <div className="w-full h-64 bg-white p-4 rounded-lg shadow mt-4 flex flex-col items-center">
                <h3 className="text-sm font-bold mb-2 w-full text-left">Distribution Analysis</h3>
                <div
                    className={`flex-grow w-full transition-colors ${!isActive ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => !isActive && setIsActive(true)}
                    title={!isActive ? "Click to interact" : ""}
                >
                    <Plot
                        data={[
                            {
                                x: values,
                                type: 'histogram',
                                name: 'Data',
                                opacity: 0.7,
                                marker: { color: 'blue' },
                                autobinx: true
                            },
                            {
                                x: x,
                                y: y,
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Normal Dist',
                                line: { color: 'red' }
                            }
                        ]}
                        layout={finalLayout}
                        onRelayout={onRelayout}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%', pointerEvents: isActive ? 'auto' : 'none' }}
                        config={{ displayModeBar: isActive, staticPlot: !isActive }}
                    />
                </div>
                <div className="mt-2 text-lg font-bold text-gray-800 flex gap-4">
                    <span>CPK: {cpk.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 font-normal self-center">Variance (σ): {stdDev.toFixed(4)}</span>
                </div>
            </div>
        );
    } else {
        // No limits or CPK -> Show Pie Chart of Pass/Fail
        const passCount = records.filter(r => r.result === 'PASS').length;
        const failCount = records.filter(r => r.result === 'FAIL').length;

        return (
            <div className="w-full h-64 bg-white p-4 rounded-lg shadow mt-4">
                <h3 className="text-sm font-bold mb-2">Result Distribution</h3>
                <Plot
                    data={[{
                        values: [passCount, failCount],
                        labels: ['PASS', 'FAIL'],
                        type: 'pie',
                        marker: { colors: ['#4ade80', '#f87171'] }
                    }]}
                    layout={{
                        autosize: true,
                        margin: { l: 20, r: 20, t: 20, b: 20 },
                        showlegend: true
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>
        );
    }
}, (prevProps, nextProps) => {
    // Allow re-render if item.records change (filter changes)
    return prevProps.item.id === nextProps.item.id &&
        prevProps.item.records.length === nextProps.item.records.length &&
        JSON.stringify(prevProps.layout) === JSON.stringify(nextProps.layout);
});
