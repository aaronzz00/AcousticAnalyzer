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
        console.log('Sheet Names:', wb.SheetNames);

        const snSheet = wb.SheetNames.find(n => n.toLowerCase().includes('sn'));
        console.log('SN Sheet found:', snSheet);

        if (snSheet) {
            const sheet = wb.Sheets[snSheet];
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
            console.log('SN Sheet Range:', sheet['!ref']);
            // Check first few SNs
            const snList = [];
            for (let R = 3; R <= Math.min(range.e.r, 10); ++R) {
                const cell = sheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
                if (cell) snList.push(cell.v);
            }
            console.log('Sample SNs:', snList);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
