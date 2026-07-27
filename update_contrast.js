const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/features/desktop/menu/menu-admin.scss');
let content = fs.readFileSync(file, 'utf8');

// Ensure text is white !important for active pills
content = content.replace(/color:\s*white;/g, 'color: white !important;');
// Increase contrast for default states
content = content.replace(/#64748b/g, '#475569');

fs.writeFileSync(file, content);
console.log('Fixed font colors and contrast in menu-admin.scss');
