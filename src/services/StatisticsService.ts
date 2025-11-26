import type { TestItem } from '../types';
import type { FilterOptions } from './DataProcessor';

export interface StatisticsResult {
    total: number;
    units: {
        total: number;
        passed: number;
        failed: number;
    };
    sets: {
        passed: number;
        failed: number;
    };
}

export class StatisticsService {
    static calculate(filteredItems: TestItem[], filterOptions: FilterOptions): StatisticsResult {
        // When deduplicate is OFF, treat each record as a separate product (use rowId)
        // When deduplicate is ON, group by SN (or SN_channel)

        const unitResults = new Map<string, boolean>(); // key: unit identifier, value: pass/fail

        // Store metadata for each key to avoid parsing issues with underscores in SN
        const keyMeta = new Map<string, { sn: string, channel?: 'L' | 'R', rowId?: number }>();

        if (!filterOptions.deduplicate) {
            // Deduplicate OFF: Each record is a separate product
            filteredItems.forEach(item => {
                item.records.forEach(record => {
                    const productKey = record.channel
                        ? `${record.sn}_${record.channel}_${record.rowId}`
                        : `${record.sn}_${record.rowId}`;

                    if (!keyMeta.has(productKey)) {
                        keyMeta.set(productKey, {
                            sn: record.sn,
                            channel: record.channel,
                            rowId: record.rowId
                        });
                    }
                });
            });

            // For each product (record instance), check if all test items pass
            keyMeta.forEach((meta, productKey) => {
                const { sn, channel, rowId } = meta;
                let productPasses = true;

                for (const item of filteredItems) {
                    // Find the specific record by rowId
                    const record = item.records.find(r =>
                        r.sn === sn &&
                        r.rowId === rowId &&
                        (channel ? r.channel === channel : true)
                    );

                    if (!record) continue;

                    // Check if this test item has limits
                    let hasLimits = false;
                    if (record.type === 'single') {
                        hasLimits = record.upperLimit !== null || record.lowerLimit !== null;
                    } else {
                        hasLimits = record.data.some(d => d.upperLimit !== null || d.lowerLimit !== null);
                    }

                    if (!hasLimits) continue;

                    // Check if this test passes
                    const itemPasses = record.type === 'single'
                        ? record.result === 'PASS'
                        : record.overallResult === 'PASS';

                    if (!itemPasses) {
                        productPasses = false;
                        break;
                    }
                }

                unitResults.set(productKey, productPasses);
            });

        } else {
            // Deduplicate ON: Group by SN (or SN_channel)
            filteredItems.forEach(item => {
                item.records.forEach(record => {
                    const unitKey = record.channel ? `${record.sn}_${record.channel}` : record.sn;
                    if (!keyMeta.has(unitKey)) {
                        keyMeta.set(unitKey, {
                            sn: record.sn,
                            channel: record.channel
                        });
                    }
                });
            });

            keyMeta.forEach((meta, unitKey) => {
                const { sn, channel } = meta;
                let unitPasses = true;

                for (const item of filteredItems) {
                    // Find record for this unit in this test item
                    // We want the LATEST record.
                    const unitRecords = channel
                        ? item.records.filter(r => r.sn === sn && r.channel === channel)
                        : item.records.filter(r => r.sn === sn);

                    const record = unitRecords.length > 0 ? unitRecords[unitRecords.length - 1] : undefined;

                    if (!record) continue;

                    let hasLimits = false;
                    if (record.type === 'single') {
                        hasLimits = record.upperLimit !== null || record.lowerLimit !== null;
                    } else {
                        hasLimits = record.data.some(d => d.upperLimit !== null || d.lowerLimit !== null);
                    }

                    if (!hasLimits) continue;

                    const itemPasses = record.type === 'single'
                        ? record.result === 'PASS'
                        : record.overallResult === 'PASS';

                    if (!itemPasses) {
                        unitPasses = false;
                        break;
                    }
                }

                unitResults.set(unitKey, unitPasses);
            });
        }

        // Calculate unit statistics
        const unitsPassed = Array.from(unitResults.values()).filter(p => p).length;
        const unitsFailed = Array.from(unitResults.values()).filter(p => !p).length;

        // Calculate set statistics (only relevant when deduplicate is ON and L/R channels exist)
        let setsPassed = 0;
        let setsFailed = 0;
        let totalSNs = 0;

        if (filterOptions.deduplicate) {
            const snSet = new Set<string>();
            filteredItems.forEach(item => {
                item.records.forEach(record => {
                    snSet.add(record.sn);
                });
            });
            totalSNs = snSet.size;

            Array.from(snSet).forEach(sn => {
                const lPasses = unitResults.get(`${sn}_L`);
                const rPasses = unitResults.get(`${sn}_R`);

                if (lPasses !== undefined && rPasses !== undefined) {
                    if (lPasses && rPasses) {
                        setsPassed++;
                    } else {
                        setsFailed++;
                    }
                }
            });
        } else {
            totalSNs = unitResults.size; // When not deduplicating, each "unit" is a unique product instance
        }

        return {
            total: totalSNs,
            units: {
                total: unitResults.size,
                passed: unitsPassed,
                failed: unitsFailed
            },
            sets: {
                passed: setsPassed,
                failed: setsFailed
            }
        };
    }
}
