const fs = require('fs');

let content = fs.readFileSync('src/app/core/services/product.service.ts', 'utf8');

// 1. Change to computed
content = content.replace(/products = this\._products\.asReadonly\(\);/, 'products = computed(() => this._products().filter(p => !p.isDeleted));');

// 2. Change activeProducts to filter based on this.products() instead of _products() to avoid including deleted ones
content = content.replace(/activeProducts = computed\(\(\) => this\._products\(\)\.filter\(p => p\.isActive\)\);/, 'activeProducts = computed(() => this.products().filter(p => p.isActive));');

// 3. Fix delete
content = content.replace(/this\._products\.update\(list => list\.filter\(p => p\.id !== id\)\);/, "this._products.update(list => list.map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p));");

// 4. Save to server immediate inside delete
content = content.replace(/delete\(id: string\): void \{\n    this\._products\.update\(list => list\.map\(p => p\.id === id \? \{ \.\.\.p, isDeleted: true, updatedAt: new Date\(\)\.toISOString\(\) \} : p\)\);\n    this\.persist\(\);\n  \}/, "delete(id: string): void {\n    this._products.update(list => list.map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p));\n    this.persist();\n    this.dataSync.saveToServerImmediate();\n  }");

fs.writeFileSync('src/app/core/services/product.service.ts', content);
