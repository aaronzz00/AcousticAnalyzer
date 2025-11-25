import * as XLSX from 'xlsx';
import type { ParsedData, TestItem, TestRecord, FrequencyPoint } from '../types';

export class ExcelParser {
    static async parse(file: File): Promise<ParsedData> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // 1. Identify SN Sheet
        const snSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('sn'));
        if (!snSheetName) {
            throw new Error('SN Sheet not found');
        }
        const snSheet = workbook.Sheets[snSheetName];
        const snList = this.parseSNList(snSheet);

        const testItems: TestItem[] = [];

        // 2. Parse Data Sheets
        for (const sheetName of workbook.SheetNames) {
            // Ignore any sheet that looks like an SN sheet
            if (sheetName.toLowerCase().includes('sn')) continue;

            const sheet = workbook.Sheets[sheetName];
            const channel = this.detectChannel(sheetName);
            const cleanName = this.cleanSheetName(sheetName);

            // Determine if Single or Multi
            // Heuristic: Check if Row 1 (or header) has multiple frequency columns starting from F
            // Or check if Row 4 has multiple values.
            // Requirement: "Single data record, only F column has test data"
            // "Multi data record, from F column starts frequency values"

            const isMulti = this.isMultiValueSheet(sheet);

            const records = this.parseRecords(sheet, snList, isMulti, channel, cleanName);

            testItems.push({
                id: `${cleanName}_${channel || 'Single'}`,
                name: cleanName,
                records,
                isMulti,
                channel
            });
        }

        return { snList, testItems };
    }

    private static parseSNList(sheet: XLSX.WorkSheet): string[] {
        // Assuming SNs are in column F (index 5), starting from Row 4
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A100');
        const snList: string[] = [];

        // Start from Row 4 (index 3)
        for (let R = 3; R <= range.e.r; ++R) {
            // SN is in Column F (index 5)
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: 5 })];
            if (cell && cell.v) {
                snList.push(String(cell.v).trim());
            } else {
                // If cell is empty but row exists, push empty string or placeholder to maintain index alignment
                // Assuming data rows correspond 1:1 to SN rows
                snList.push(`Unknown_SN_${R}`);
            }
        }
        return snList;
    }

    private static detectChannel(sheetName: string): 'L' | 'R' | undefined {
        const lower = sheetName.toLowerCase();
        if (lower.startsWith('left') || lower.endsWith('_l')) return 'L';
        if (lower.startsWith('right') || lower.endsWith('_r')) return 'R';
        return undefined;
    }

    private static cleanSheetName(sheetName: string): string {
        return sheetName
            .replace(/^Left_?|^Right_?|_L$|_R$/i, '')
            .trim();
    }

    private static isMultiValueSheet(sheet: XLSX.WorkSheet): boolean {
        // Check column G (index 6). If it has data in Row 4, it's likely multi.
        // Or check if Row 1/Header has values in G.
        // Requirement: "Single... only F column".
        // So if G4 exists, it's Multi.
        const cellG4 = sheet['G4'];
        return !!(cellG4 && cellG4.v);
    }

    private static parseRecords(
        sheet: XLSX.WorkSheet,
        snList: string[],
        isMulti: boolean,
        channel: 'L' | 'R' | undefined,
        testName: string
    ): TestRecord[] {
        const records: TestRecord[] = [];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');

        // Parse Limits (Row 2 and 3)
        // Row 2: Upper, Row 3: Lower
        // For Multi: Limits are per column (frequency)
        // For Single: Limits are in Column F

        // Frequencies (for Multi) - Assuming Row 1 or just the columns imply frequencies?
        // Requirement: "From F column starts frequency values" -> Assuming Row 1 contains the frequency headers?
        // Let's assume Row 1 (index 0) contains frequency labels for Multi.

        const frequencies: number[] = [];
        if (isMulti) {
            for (let C = 5; C <= range.e.c; ++C) { // Col F is index 5
                const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: C })]; // Row 1
                if (cell && cell.v) {
                    const freq = parseFloat(String(cell.v));
                    if (!isNaN(freq)) frequencies.push(freq);
                }
            }
        }

        // Iterate Rows starting from Row 4 (index 3)
        for (let R = 3; R <= range.e.r; ++R) {
            const snIndex = R - 3;
            // If we have more data rows than SNs, we should stop or use a placeholder?
            // Better to stop to avoid index out of bounds, but if SN list is shorter, we might miss data.
            // Let's assume alignment.

            let sn = snIndex < snList.length ? snList[snIndex] : `Unknown_SN_${R}`;

            // If SN is repeated in the list (e.g. 45846, 45846), we need to differentiate them for unique keys if we want to show all.
            // But for deduplication, we want to group them.
            // The user issue "SN mismatch" might be due to empty rows in SN sheet?
            // I added "Unknown_SN" handling above.

            const unitCell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })]; // Col E is Unit
            const unit = unitCell ? String(unitCell.v) : '';

            // Find Limit Rows dynamically
            let upperRowIdx = -1;
            let lowerRowIdx = -1;

            // Check first 3 rows (0, 1, 2) for limit labels in Column E (index 4)
            for (let r = 0; r < 3; r++) {
                const cell = sheet[XLSX.utils.encode_cell({ r: r, c: 4 })];
                if (cell && cell.v) {
                    const val = String(cell.v).toLowerCase();
                    if (val.includes('upper')) upperRowIdx = r;
                    if (val.includes('lower')) lowerRowIdx = r;
                }
            }

            if (isMulti) {
                const dataPoints: FrequencyPoint[] = [];
                let allPass = true;

                frequencies.forEach((freq, idx) => {
                    const colIndex = 5 + idx;
                    const valCell = sheet[XLSX.utils.encode_cell({ r: R, c: colIndex })];

                    let upper: number | null = null;
                    let lower: number | null = null;

                    if (upperRowIdx !== -1) {
                        const cell = sheet[XLSX.utils.encode_cell({ r: upperRowIdx, c: colIndex })];
                        if (cell && typeof cell.v === 'number') upper = cell.v;
                    }
                    if (lowerRowIdx !== -1) {
                        const cell = sheet[XLSX.utils.encode_cell({ r: lowerRowIdx, c: colIndex })];
                        if (cell && typeof cell.v === 'number') lower = cell.v;
                    }

                    const value = valCell && typeof valCell.v === 'number' ? valCell.v : null;

                    if (value !== null) {
                        // Check limits
                        let pass = true;
                        if (upper !== null && value > upper) pass = false;
                        if (lower !== null && value < lower) pass = false;
                        if (!pass) allPass = false;

                        dataPoints.push({
                            frequency: freq,
                            value,
                            upperLimit: upper,
                            lowerLimit: lower
                        });
                    }
                });

                if (dataPoints.length > 0) {
                    records.push({
                        sn,
                        testName,
                        channel,
                        type: 'multi',
                        data: dataPoints,
                        unit,
                        overallResult: allPass ? 'PASS' : 'FAIL',
                        rowId: R,
                        timestamp: R
                    });
                }

            } else {
                // Single Value
                const valCell = sheet[XLSX.utils.encode_cell({ r: R, c: 5 })]; // Col F

                let upper: number | null = null;
                let lower: number | null = null;

                if (upperRowIdx !== -1) {
                    const cell = sheet[XLSX.utils.encode_cell({ r: upperRowIdx, c: 5 })];
                    if (cell && typeof cell.v === 'number') upper = cell.v;
                }
                if (lowerRowIdx !== -1) {
                    const cell = sheet[XLSX.utils.encode_cell({ r: lowerRowIdx, c: 5 })];
                    if (cell && typeof cell.v === 'number') lower = cell.v;
                }

                const value = valCell && typeof valCell.v === 'number' ? valCell.v : null;

                if (value !== null) {
                    let result: 'PASS' | 'FAIL' = 'PASS';
                    if (upper !== null && value > upper) result = 'FAIL';
                    if (lower !== null && value < lower) result = 'FAIL';

                    records.push({
                        sn,
                        testName,
                        channel,
                        type: 'single',
                        value,
                        unit,
                        upperLimit: upper,
                        lowerLimit: lower,
                        result,
                        rowId: R,
                        timestamp: R
                    });
                }
            }
        }

        return records;
    }
}
