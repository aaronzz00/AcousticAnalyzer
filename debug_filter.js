const { DataProcessor } = require('./src/services/DataProcessor');

// Mock Data
const mockItems = [
    {
        id: 'Item1',
        name: 'Item1',
        isMulti: false,
        records: [
            { sn: 'SN1', type: 'single', value: 10, result: 'PASS', rowId: 1 },
            { sn: 'SN2', type: 'single', value: 20, result: 'FAIL', rowId: 2 },
            { sn: 'SN3', type: 'single', value: 10, result: 'PASS', rowId: 3 }
        ]
    },
    {
        id: 'Item2',
        name: 'Item2',
        isMulti: false,
        records: [
            { sn: 'SN1', type: 'single', value: 10, result: 'PASS', rowId: 1 },
            { sn: 'SN2', type: 'single', value: 10, result: 'PASS', rowId: 2 }, // SN2 Passes here
            { sn: 'SN3', type: 'single', value: 20, result: 'FAIL', rowId: 3 }  // SN3 Fails here
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
