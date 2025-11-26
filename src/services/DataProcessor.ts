import type { TestItem, TestRecord } from '../types';

export interface FilterOptions {
    deduplicate: boolean;
    filterType: 'ALL' | 'PASS_ONLY' | 'FAIL_ONLY';
    mergeChannels: boolean;
}

export class DataProcessor {
    static process(items: TestItem[], options: FilterOptions): TestItem[] {
        // 0. Consolidate Items (if multiple files were loaded and resulted in duplicate Item Names)
        let processedItems = this.consolidateItems(items);

        // Clone to avoid mutation
        processedItems = processedItems.map(item => ({ ...item, records: [...item.records] }));

        // 1. Deduplication
        if (options.deduplicate) {
            processedItems = processedItems.map(item => ({
                ...item,
                records: this.deduplicateRecords(item.records)
            }));
        }

        // 2. Merging Channels - treat L and R as separate products
        if (options.mergeChannels) {
            processedItems = this.mergeChannelItems(processedItems);
        }

        // 3. Filtering
        processedItems = this.filterRecords(processedItems, options.filterType, options.deduplicate);

        return processedItems;
    }

    static consolidateItems(items: TestItem[]): TestItem[] {
        const map = new Map<string, TestItem>();

        items.forEach(item => {
            if (map.has(item.id)) {
                const existing = map.get(item.id)!;
                existing.records = [...existing.records, ...item.records];
            } else {
                map.set(item.id, { ...item, records: [...item.records] });
            }
        });

        return Array.from(map.values());
    }

    private static deduplicateRecords(records: TestRecord[]): TestRecord[] {
        const latestMap = new Map<string, TestRecord>();

        records.forEach(record => {
            const key = `${record.sn}_${record.channel || ''}`;

            const existing = latestMap.get(key);
            if (!existing || (record.rowId > existing.rowId)) {
                latestMap.set(key, record);
            }
        });

        return Array.from(latestMap.values());
    }

    private static mergeChannelItems(items: TestItem[]): TestItem[] {
        // When merging channels, treat L and R as separate products
        // This means we keep the records separate but remove the channel identifier from the item level
        return items.map(item => {
            if (!item.channel) {
                return item;
            }

            // Keep records with their channel info, but remove channel from item
            // Each L/R will be counted separately in statistics
            return {
                ...item,
                records: item.records
            };
        });
    }

    private static filterRecords(items: TestItem[], type: 'ALL' | 'PASS_ONLY' | 'FAIL_ONLY', deduplicate: boolean): TestItem[] {
        if (type === 'ALL') return items;

        // Build a map of product/unit pass/fail status based on ALL test items
        const unitStatus = new Map<string, boolean>(); // key: product identifier, value: true if all tests pass

        // Store metadata for each key to avoid parsing issues with underscores in SN
        const keyMeta = new Map<string, { sn: string, channel?: 'L' | 'R', rowId?: number }>();

        if (!deduplicate) {
            // Deduplicate OFF: Each record is a separate product (use rowId)
            items.forEach(item => {
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

            // For each product, check if ALL test items pass
            keyMeta.forEach((meta, productKey) => {
                const { sn, channel, rowId } = meta;
                let productPasses = true;

                for (const item of items) {
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
                    const testPasses = this.isFail(record) === false;
                    if (!testPasses) {
                        productPasses = false;
                        break;
                    }
                }

                unitStatus.set(productKey, productPasses);
            });

        } else {
            // Deduplicate ON: Group by SN (or SN_channel)
            items.forEach(item => {
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

            // For each unit, check if ALL test items (with limits) pass
            keyMeta.forEach((meta, unitKey) => {
                const { sn, channel } = meta;
                let unitPasses = true;

                for (const item of items) {
                    // Find record for this unit in this test item
                    // We want the LATEST record.
                    const unitRecords = channel
                        ? item.records.filter(r => r.sn === sn && r.channel === channel)
                        : item.records.filter(r => r.sn === sn);

                    const record = unitRecords.length > 0 ? unitRecords[unitRecords.length - 1] : undefined;

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
                    const testPasses = this.isFail(record) === false;
                    if (!testPasses) {
                        unitPasses = false;
                        break;
                    }
                }

                unitStatus.set(unitKey, unitPasses);
            });
        }

        // Filter records based on product/unit pass/fail status
        return items.map(item => ({
            ...item,
            records: item.records.filter(record => {
                const productKey = deduplicate
                    ? (record.channel ? `${record.sn}_${record.channel}` : record.sn)
                    : (record.channel ? `${record.sn}_${record.channel}_${record.rowId}` : `${record.sn}_${record.rowId}`);

                const passes = unitStatus.get(productKey) ?? true;

                if (type === 'PASS_ONLY') return passes;
                if (type === 'FAIL_ONLY') return !passes;
                return true;
            })
        }));
    }

    private static isFail(record: TestRecord): boolean {
        if (record.type === 'single') {
            return record.result === 'FAIL';
        } else {
            return record.overallResult === 'FAIL';
        }
    }
}
