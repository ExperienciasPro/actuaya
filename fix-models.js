const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src/app/core/models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add isDeleted to any interface that has an id
  content = content.replace(/(\s+)id:\s+string;([^]*?)\}/g, (match, p1, p2) => {
    let result = match;
    if (!result.includes('isDeleted?: boolean')) {
      // Find the last property before }
      result = result.replace(/(\n\s*)\}/, `$1  isDeleted?: boolean;$1}`);
      changed = true;
    }
    if (!result.includes('updatedAt')) {
      result = result.replace(/(\n\s*)\}/, `$1  updatedAt?: string;$1}`);
      changed = true;
    }
    return result;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed model ${file}`);
  }
});
