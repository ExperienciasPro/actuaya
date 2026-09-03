const fs = require('fs');

let content = fs.readFileSync('src/app/core/services/tecnico.service.ts', 'utf8');

// 1. Import computed
content = content.replace(/import \{ Injectable, signal, inject, Injector \} from '@angular\/core';/, "import { Injectable, signal, computed, inject, Injector } from '@angular/core';");

// 2. Change signal to computed
content = content.replace(/tecnicos = signal<Tecnico\[\]>\(this\.loadTecnicos\(\)\);/, `private tecnicosSignal = signal<Tecnico[]>(this.loadTecnicos());\n  tecnicos = computed(() => this.tecnicosSignal().filter(t => !t.isDeleted));`);

// 3. Fix saveTecnicos
content = content.replace(/this\.tecnicos\.set\(list\);/, "this.tecnicosSignal.set(list);");
content = content.replace(/this\.dataSync\.saveToServerImmediate\(\);/, "this.dataSync.saveToServerDebounced();");

// 4. Fix usages of this.tecnicos() to this.tecnicosSignal() for add/update
content = content.replace(/this\.saveTecnicos\(\[newTecnico, \.\.\.this\.tecnicos\(\)\]\);/, "this.saveTecnicos([newTecnico, ...this.tecnicosSignal()]);");
content = content.replace(/const list = this\.tecnicos\(\)\.map/g, "const list = this.tecnicosSignal().map");

// 5. Fix deleteTecnico
content = content.replace(/this\.saveTecnicos\(this\.tecnicos\(\)\.filter\(t => t\.id !== id\)\);/g, "this.saveTecnicos(this.tecnicosSignal().map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));\n    this.dataSync.saveToServerImmediate();");

fs.writeFileSync('src/app/core/services/tecnico.service.ts', content);
