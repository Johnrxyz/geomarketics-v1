const fs = require('fs');
const content = fs.readFileSync('public/MAIN_First_Floor.svg', 'utf8');

const width = 4324;
const height = 3062;
const CELL_SIZE = 20;
const cols = Math.ceil(width / CELL_SIZE);
const rows = Math.ceil(height / CELL_SIZE);

let grid = Array(rows).fill(0).map(() => Array(cols).fill('.'));

const regex = /<rect[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*stroke="([^"]+)"[^>]*>/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  const stroke = match[5];
  if (stroke === '#000000' || stroke === 'rgb(0, 0, 0)') {
    count++;
    // Get full match text to check for transform
    const fullTag = match[0];
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    let w = parseFloat(match[3]);
    let h = parseFloat(match[4]);
    
    const transformMatch = fullTag.match(/transform="rotate\(([^,]+),([^,]+),([^\)]+)\)"/);
    if (transformMatch) {
      const angle = parseFloat(transformMatch[1]);
      if (Math.abs(angle) === 90 || Math.abs(angle) === 270) {
        const cx = parseFloat(transformMatch[2]);
        const cy = parseFloat(transformMatch[3]);
        // Rotate the bounding box
        x = cx - h/2;
        y = cy - w/2;
        const temp = w;
        w = h;
        h = temp;
      }
    }

    const startCol = Math.max(0, Math.floor(x / CELL_SIZE));
    const endCol = Math.min(cols - 1, Math.floor((x + w) / CELL_SIZE));
    const startRow = Math.max(0, Math.floor(y / CELL_SIZE));
    const endRow = Math.min(rows - 1, Math.floor((y + h) / CELL_SIZE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          grid[r][c] = '#';
        }
      }
    }
  }
}
console.log(`Found ${count} obstacles`);
const out = grid.map(row => row.join('')).join('\n');
fs.writeFileSync('grid_debug.txt', out);
