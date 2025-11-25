import type { TestItem, TestRecord } from '../types';

export interface FilterOptions {
    deduplicate: boolean;
    filterType: 'ALL' | 'PASS_ONLY' | 'FAIL_ONLY' | 'ALL_PASS_ONLY';
    mergeChannels: boolean;
}

export class DataProcessor {
    static process(items: TestItem[], options: FilterOptions): TestItem[] {
        // 0. Consolidate Items (if multiple files were loaded and resulted in duplicate Item Names)
        // This should ideally be done BEFORE process, but we can do it here if we assume 'items' might contain duplicates from multiple files.
        // However, App.tsx will likely concat them. Let's add a public helper or do it here.
        // Let's do it here to be safe.
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

        // 2. Merging Channels
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
            // Key by ID (which is usually Name + Channel)
            // If we load multiple files, the ID might be same.
            // We want to merge records.
            if (map.has(item.id)) {
                const existing = map.get(item.id)!;
                existing.records = [...existing.records, ...item.records];
            } else {
                // Clone to avoid issues
                map.set(item.id, { ...item, records: [...item.records] });
            }
        });

        return Array.from(map.values());
    }

    private static deduplicateRecords(records: TestRecord[]): TestRecord[] {
        const latestMap = new Map<string, TestRecord>();

        records.forEach(record => {
            // Key: SN + Channel (if exists)
            // Since records are within a TestItem, we assume TestName is same.
            const key = `${record.sn}_${record.channel || ''}`;

            const existing = latestMap.get(key);
            // Keep if new (not existing) or if current record is "later" (higher rowId/timestamp)
            if (!existing || (record.rowId > existing.rowId)) {
                latestMap.set(key, record);
            }
        });

        return Array.from(latestMap.values());
    }

    private static mergeChannelItems(items: TestItem[]): TestItem[] {
        const mergedMap = new Map<string, TestItem>();

        items.forEach(item => {
            // If item has no channel, it's already standalone or merged
            if (!item.channel) {
                mergedMap.set(item.name, item);
                return;
            }

            const existing = mergedMap.get(item.name);
            if (existing) {
                // Merge records
                existing.records = [...existing.records, ...item.records];
                // Clear channel if we are merging L and R
                existing.channel = undefined;
                // ID usually becomes just the name
                existing.id = item.name;
            } else {
                // Create new entry, but clone to avoid mutating original if needed
                mergedMap.set(item.name, {
                    ...item,
                    id: item.name,
                    channel: undefined // Will be undefined after merge intent
                });
            }
        });

        return Array.from(mergedMap.values());
    }

    private static filterRecords(items: TestItem[], type: 'ALL' | 'PASS_ONLY' | 'FAIL_ONLY' | 'ALL_PASS_ONLY'): TestItem[] {
        if (type === 'ALL') return items;

        if (type === 'ALL_PASS_ONLY') {
            // "Display only units where ALL test items passed"
            // This is complex because it requires looking across ALL test items for a specific SN.
            // We need to identify SNs that have failures in ANY test item.

            const failedSNs = new Set<string>();

            items.forEach(item => {
                item.records.forEach(record => {
                    if (this.isFail(record)) {
                        failedSNs.add(record.sn);
                    }
                });
            });

            return items.map(item => ({
                ...item,
                records: item.records.filter(r => !failedSNs.has(r.sn))
            }));
        }

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
