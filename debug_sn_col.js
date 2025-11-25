import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const files = [
    'Reference Data/Acoustic Data Reference_single.xlsx',
    'Reference Data/Acoustic Data Reference_dual.xlsx'
];

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        console.log(`\nChecking ${file}...`);
        const buf = fs.readFileSync(filePath);
        const wb = XLSX.read(buf, { type: 'buffer' });

        // Find SN sheet
        const snSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('sn'));
        if (snSheetName) {
            const sheet = wb.Sheets[snSheetName];
            console.log(`SN Sheet: ${snSheetName}`);

            // Check Column A (Index 0) and Column F (Index 5) for first few rows
            console.log('Row | Col A (Date?) | Col F (SN?)');
            for (let R = 3; R <= 10; ++R) { // Rows 4-11
                const cellA = sheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
                const cellF = sheet[XLSX.utils.encode_cell({ r: R, c: 5 })];
                console.log(`${R + 1} | ${cellA ? cellA.v : ''} | ${cellF ? cellF.v : ''}`);
            }
        }
    }
});
