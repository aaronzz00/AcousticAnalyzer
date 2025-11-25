export interface AcousticRecord {
    sn: string;
    testName: string;
    channel?: 'L' | 'R';
    timestamp?: number; // For deduplication (using row index if timestamp not available)
    rowId: number; // Original row index for debugging
}

export interface SingleValueRecord extends AcousticRecord {
    type: 'single';
    value: number;
    unit: string;
    upperLimit: number | null;
    lowerLimit: number | null;
    result: 'PASS' | 'FAIL';
}

export interface FrequencyPoint {
    frequency: number;
    value: number;
    upperLimit: number | null;
    lowerLimit: number | null;
}

export interface MultiValueRecord extends AcousticRecord {
    type: 'multi';
    data: FrequencyPoint[]; // Array of points (Freq, Amp, Limits)
    unit: string;
    overallResult: 'PASS' | 'FAIL';
}

export type TestRecord = SingleValueRecord | MultiValueRecord;

export interface TestItem {
    id: string; // Unique ID for the test item (e.g., sheet name + channel)
    name: string;
    records: TestRecord[];
    isMulti: boolean;
    channel?: 'L' | 'R';
}

export interface ParsedData {
    snList: string[];
    testItems: TestItem[];
}
