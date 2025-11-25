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
        processedItems = this.filterRecords(processedItems, options.filterType);

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

    private static filterRecords(items: TestItem[], type: 'ALL' | 'PASS_ONLY' | 'FAIL_ONLY'): TestItem[] {
        if (type === 'ALL') return items;

        return items.map(item => ({
            ...item,
            records: item.records.filter(record => {
                const isFail = this.isFail(record);
                if (type === 'PASS_ONLY') return !isFail;
                if (type === 'FAIL_ONLY') return isFail;
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
