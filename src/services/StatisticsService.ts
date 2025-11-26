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
        // unitResults: Used for "Unit Statistics" (depends on deduplicate flag)
        const unitResults = new Map<string, boolean>();

        // latestStatusMap: Used for "Set Statistics" (always represents the latest status of physical units)
        const latestStatusMap = new Map<string, boolean>();

        // Helper to check if a record passes
        const checkRecordPass = (record: any, item: TestItem) => {
            let hasLimits = false;
            if (record.type === 'single') {
                hasLimits = record.upperLimit !== null || record.lowerLimit !== null;
            } else {
                hasLimits = record.data.some((d: any) => d.upperLimit !== null || d.lowerLimit !== null);
            }

            if (!hasLimits) return true; // No limits = Pass

            return record.type === 'single'
                ? record.result === 'PASS'
                : record.overallResult === 'PASS';
        };

        // 1. Calculate Unit Statistics (based on deduplicate flag)
        if (!filterOptions.deduplicate) {
            // Deduplicate OFF: Each record is a separate unit
            const keyMeta = new Map<string, { sn: string, channel?: 'L' | 'R', rowId?: number }>();

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

            keyMeta.forEach((meta, productKey) => {
                const { sn, channel, rowId } = meta;
                let productPasses = true;

                for (const item of filteredItems) {
                    const record = item.records.find(r =>
                        r.sn === sn &&
                        r.rowId === rowId &&
                        (channel ? r.channel === channel : true)
                    );

                    if (!record) continue;
                    if (!checkRecordPass(record, item)) {
                        productPasses = false;
                        break;
                    }
                }
                unitResults.set(productKey, productPasses);
            });
        }

        // 2. Calculate Latest Status for Set Statistics (and for Unit Stats if Dedup is ON)
        // We need to identify all unique SN/Channel pairs and find their latest record
        const uniqueUnits = new Map<string, { sn: string, channel?: 'L' | 'R' }>();

        filteredItems.forEach(item => {
            item.records.forEach(record => {
                const unitKey = record.channel ? `${record.sn}_${record.channel}` : record.sn;
                if (!uniqueUnits.has(unitKey)) {
                    uniqueUnits.set(unitKey, { sn: record.sn, channel: record.channel });
                }
            });
        });

        uniqueUnits.forEach((meta, unitKey) => {
            const { sn, channel } = meta;
            let unitPasses = true;

            for (const item of filteredItems) {
                // Find LATEST record for this unit in this test item
                const unitRecords = channel
                    ? item.records.filter(r => r.sn === sn && r.channel === channel)
                    : item.records.filter(r => r.sn === sn);

                const record = unitRecords.length > 0 ? unitRecords[unitRecords.length - 1] : undefined;

                if (!record) continue;
                if (!checkRecordPass(record, item)) {
                    unitPasses = false;
                    break;
                }
            }
            latestStatusMap.set(unitKey, unitPasses);
        });

        // If Deduplicate is ON, Unit Stats = Latest Stats
        if (filterOptions.deduplicate) {
            latestStatusMap.forEach((val, key) => unitResults.set(key, val));
        }

        // 3. Calculate Final Counts
        const unitsPassed = Array.from(unitResults.values()).filter(p => p).length;
        const unitsFailed = Array.from(unitResults.values()).filter(p => !p).length;

        // Calculate set statistics using latestStatusMap (Always calculated)
        let setsPassed = 0;
        let setsFailed = 0;

        const snSet = new Set<string>();
        filteredItems.forEach(item => {
            item.records.forEach(record => snSet.add(record.sn));
        });

        Array.from(snSet).forEach(sn => {
            const lPasses = latestStatusMap.get(`${sn}_L`);
            const rPasses = latestStatusMap.get(`${sn}_R`);

            if (lPasses !== undefined && rPasses !== undefined) {
                if (lPasses && rPasses) {
                    setsPassed++;
                } else {
                    setsFailed++;
                }
            }
        });

        return {
            total: filterOptions.deduplicate ? snSet.size : unitResults.size,
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
