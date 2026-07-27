const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/features/desktop/menu/menu-admin.scss');
let content = fs.readFileSync(file, 'utf8');

// Replace orange colors with deep violet from brand design system
content = content.replace(/#e67e22/g, 'var(--accent, #6c3ce9)');
content = content.replace(/rgba\(230, 126, 34, 0\.4\)/g, 'rgba(108, 60, 233, 0.3)');
content = content.replace(/rgba\(230, 126, 34, 0\.3\)/g, 'rgba(108, 60, 233, 0.2)');

fs.writeFileSync(file, content);
console.log('Replaced colors in menu-admin.scss');
