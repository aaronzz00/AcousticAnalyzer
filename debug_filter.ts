import { DataProcessor } from './src/services/DataProcessor.ts';
import type { TestItem, TestRecord } from './src/types';

// Mock Data
const mockItems: TestItem[] = [
    {
        id: 'Item1',
        name: 'Item1',
        isMulti: false,
        records: [
            { sn: 'SN1', type: 'single', value: 10, result: 'PASS', rowId: 1 } as TestRecord,
            { sn: 'SN2', type: 'single', value: 20, result: 'FAIL', rowId: 2 } as TestRecord,
            { sn: 'SN3', type: 'single', value: 10, result: 'PASS', rowId: 3 } as TestRecord
        ]
    },
    {
        id: 'Item2',
        name: 'Item2',
        isMulti: false,
        records: [
            { sn: 'SN1', type: 'single', value: 10, result: 'PASS', rowId: 1 } as TestRecord,
            { sn: 'SN2', type: 'single', value: 10, result: 'PASS', rowId: 2 } as TestRecord, // SN2 Passes here
            { sn: 'SN3', type: 'single', value: 20, result: 'FAIL', rowId: 3 } as TestRecord  // SN3 Fails here
        ]
    }
];

// Test PASS_ONLY
console.log('--- PASS_ONLY ---');
const passOnly = DataProcessor.process(mockItems, { deduplicate: false, filterType: 'PASS_ONLY', mergeChannels: false });
passOnly.forEach(item => {
    console.log(`${item.name}: ${item.records.map(r => r.sn).join(', ')}`);
});

// Test FAIL_ONLY
console.log('\n--- FAIL_ONLY ---');
const failOnly = DataProcessor.process(mockItems, { deduplicate: false, filterType: 'FAIL_ONLY', mergeChannels: false });
failOnly.forEach(item => {
    console.log(`${item.name}: ${item.records.map(r => r.sn).join(', ')}`);
});

// Test ALL_PASS_ONLY
// SN1: Pass, Pass -> Should Show
// SN2: Fail, Pass -> Should Hide (failed in Item1)
// SN3: Pass, Fail -> Should Hide (failed in Item2)
console.log('\n--- ALL_PASS_ONLY ---');
const allPassOnly = DataProcessor.process(mockItems, { deduplicate: false, filterType: 'ALL_PASS_ONLY', mergeChannels: false });
allPassOnly.forEach(item => {
    console.log(`${item.name}: ${item.records.map(r => r.sn).join(', ')}`);
});

// Test Missing Limits (Defaults to PASS)
console.log('\n--- MISSING LIMITS (FAIL_ONLY) ---');
const noLimitItems: TestItem[] = [{
    id: 'Item3',
    name: 'Item3',
    isMulti: false,
    records: [
        { sn: 'SN4', type: 'single', value: 100, result: 'PASS', rowId: 1 } as TestRecord // No limits, so PASS
    ]
}];
const failOnlyNoLimit = DataProcessor.process(noLimitItems, { deduplicate: false, filterType: 'FAIL_ONLY', mergeChannels: false });
console.log(`Item3 Records: ${failOnlyNoLimit[0].records.length} (Expected 0)`);
