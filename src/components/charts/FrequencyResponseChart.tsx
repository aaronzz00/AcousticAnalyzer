import React from 'react';
import Plot from 'react-plotly.js';
import type { TestItem, MultiValueRecord } from '../../types';

interface FrequencyResponseChartProps {
    item: TestItem;
    layout?: any;
    onRelayout?: (layout: any) => void;
    forceActive?: boolean;
}

export const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = React.memo(
    ({ item, layout: savedLayout, onRelayout, forceActive }) => {
        const records = item.records as MultiValueRecord[];
        if (records.length === 0) return <div className="text-sm text-gray-500">No Data</div>;

        // Prepare Traces
        const traces: any[] = [];

        // 1. Limits (Take from first record, assuming consistent limits for the test item)
        // Or better, find the first record that has limits defined.
        const refRecord = records.find(r => r.data.length > 0);

        if (refRecord) {
            const freqs = refRecord.data.map(d => d.frequency);
            const uppers = refRecord.data.map(d => d.upperLimit);
            const lowers = refRecord.data.map(d => d.lowerLimit);

            // Check if limits exist (not all null)
            if (uppers.some(u => u !== null)) {
                traces.push({
                    x: freqs,
                    y: uppers,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Upper Limit',
                    line: { color: 'red', dash: 'dash', width: 2 },
                    hoverinfo: 'y'
                });
            }
            if (lowers.some(l => l !== null)) {
                traces.push({
                    x: freqs,
                    y: lowers,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Lower Limit',
                    line: { color: 'red', dash: 'dash', width: 2 },
                    hoverinfo: 'y'
                });
            }
        }

        // 2. Data Traces
        records.forEach(record => {
            const freqs = record.data.map(d => d.frequency);
            const values = record.data.map(d => d.value);

            traces.push({
                x: freqs,
                y: values,
                type: 'scatter',
                mode: 'lines',
                name: record.sn,
                line: {
                    color: record.overallResult === 'FAIL' ? 'orange' : 'rgba(31, 119, 180, 0.3)',
                    width: 1
                },
                opacity: 0.6,
                showlegend: false // Too many SNs to show in legend usually
            });
        });

        const [isActive, setIsActive] = React.useState(forceActive || false);

        const defaultLayout = {
            title: { text: item.name },
            autosize: true,
            xaxis: {
                type: 'log',
                title: { text: 'Frequency (Hz)' },
                autorange: true
            },
            yaxis: {
                title: { text: records[0]?.unit || 'Amplitude' },
                autorange: true
            },
            showlegend: true,
            margin: { l: 50, r: 20, t: 40, b: 50 },
            hovermode: 'closest'
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
            <div
                className={`w-full h-96 bg-white p-4 rounded-lg shadow transition-colors ${!isActive ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => !isActive && setIsActive(true)}
                title={!isActive ? "Click to interact" : ""}
            >
                <Plot
                    data={traces}
                    layout={finalLayout}
                    onRelayout={onRelayout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%', pointerEvents: isActive ? 'auto' : 'none' }}
                    config={{ displayModeBar: isActive, staticPlot: !isActive }}
                />
            </div>
        );
    }, (prevProps, nextProps) => {
        // Custom comparison function - Allow re-render if item.records change (filter changes)
        return prevProps.item.id === nextProps.item.id &&
            prevProps.item.records.length === nextProps.item.records.length &&
            JSON.stringify(prevProps.layout) === JSON.stringify(nextProps.layout);
    });
