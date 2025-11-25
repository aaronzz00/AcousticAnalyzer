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

        // Check a few data sheets (not SN sheets)
        const dataSheets = wb.SheetNames.filter(n => !n.toLowerCase().includes('sn'));

        // Check first 2 data sheets
        dataSheets.slice(0, 2).forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            console.log(`\nSheet: ${sheetName}`);

            // Check Rows 1, 2, 3 (Indices 0, 1, 2) in Column E (Index 4)
            for (let R = 0; R < 3; ++R) {
                const cell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })];
                console.log(`Row ${R + 1}, Col E: ${cell ? cell.v : 'EMPTY'}`);
            }
        });
    }
});
