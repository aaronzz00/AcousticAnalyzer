import type { TestItem } from '../types';
import type { FilterOptions } from './DataProcessor';

export interface ProjectState {
    version: number;
    timestamp: number;
    items: TestItem[];
    comments: Record<string, string>;
    visibility: Record<string, boolean>;
    filterOptions: FilterOptions;
    summary?: string;
    reportTitle?: string;
    chartLayouts?: Record<string, any>;
    testMetadata?: Array<{ key: string, value: string }>;
}

export class PersistenceService {
    static saveProject(
        items: TestItem[],
        comments: Record<string, string>,
        visibility: Record<string, boolean>,
        filterOptions: FilterOptions,
        summary: string,
        chartLayouts: Record<string, any>,
        reportTitle: string,
        testMetadata: Array<{ key: string, value: string }>
    ) {
        const state: ProjectState = {
            version: 1,
            timestamp: Date.now(),
            items,
            comments,
            visibility,
            filterOptions,
            summary,
            reportTitle,
            chartLayouts,
            testMetadata
        };

        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = reportTitle.replace(/[^a-z0-9_\-]/gi, '_');
        a.download = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async loadProject(file: File): Promise<ProjectState> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = e.target?.result as string;
                    const state = JSON.parse(json) as ProjectState;
                    // Basic validation
                    if (!state.items || !Array.isArray(state.items)) {
                        throw new Error('Invalid project file format');
                    }
                    resolve(state);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}
