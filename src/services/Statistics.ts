import type { TestRecord } from '../types';

export class Statistics {
    static calculateMean(values: number[]): number {
        if (values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    static calculateStdDev(values: number[], mean: number): number {
        if (values.length < 2) return 0;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = this.calculateMean(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }

    static calculateCPK(values: number[], upperLimit: number | null, lowerLimit: number | null): number | null {
        if (values.length < 2) return null;
        const mean = this.calculateMean(values);
        const stdDev = this.calculateStdDev(values, mean);

        if (stdDev === 0) return 999; // Perfect consistency

        let cpkUpper = Infinity;
        let cpkLower = Infinity;

        if (upperLimit !== null) {
            cpkUpper = (upperLimit - mean) / (3 * stdDev);
        }
        if (lowerLimit !== null) {
            cpkLower = (mean - lowerLimit) / (3 * stdDev);
        }

        const cpk = Math.min(cpkUpper, cpkLower);
        return cpk === Infinity ? null : cpk;
    }

    static getHistogramData(values: number[], bins = 20) {
        // Simple binning logic
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const binSize = range / bins || 1; // Avoid div by zero

        const histogram = new Array(bins).fill(0);
        const binEdges = [];

        for (let i = 0; i <= bins; i++) {
            binEdges.push(min + i * binSize);
        }

        values.forEach(v => {
            let binIndex = Math.floor((v - min) / binSize);
            if (binIndex >= bins) binIndex = bins - 1;
            histogram[binIndex]++;
        });

        return { counts: histogram, binEdges };
    }

    static calculateMultiCPK(records: TestRecord[]): { frequency: number; cpk: number | null; stdDev: number }[] {
        if (records.length === 0) return [];

        // Group data by frequency
        const freqMap = new Map<number, { values: number[]; upper: number | null; lower: number | null }>();

        records.forEach(record => {
            if (record.type === 'multi' && record.data) {
                record.data.forEach((point) => {
                    if (!freqMap.has(point.frequency)) {
                        freqMap.set(point.frequency, { values: [], upper: point.upperLimit, lower: point.lowerLimit });
                    }
                    const entry = freqMap.get(point.frequency)!;
                    entry.values.push(point.value);
                    // Update limits if they were null
                    if (entry.upper === null) entry.upper = point.upperLimit;
                    if (entry.lower === null) entry.lower = point.lowerLimit;
                });
            }
        });

        const result: { frequency: number; cpk: number | null; stdDev: number }[] = [];

        // Sort frequencies
        const sortedFreqs = Array.from(freqMap.keys()).sort((a, b) => a - b);

        sortedFreqs.forEach(freq => {
            const entry = freqMap.get(freq)!;

            // Only calculate CPK if at least one limit is defined and is a valid number
            const hasLimits = (entry.upper !== null && entry.upper !== undefined) || (entry.lower !== null && entry.lower !== undefined);
            const cpk = hasLimits ? this.calculateCPK(entry.values, entry.upper, entry.lower) : null;

            const mean = this.calculateMean(entry.values);
            const stdDev = this.calculateStdDev(entry.values, mean);

            // Only include in results if limits exist and CPK is valid number
            if (hasLimits && cpk !== null && !isNaN(cpk)) {
                result.push({ frequency: freq, cpk, stdDev });
            }
        });

        return result;
    }
}
