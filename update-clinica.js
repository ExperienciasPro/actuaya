const fs = require('fs');

let content = fs.readFileSync('src/app/core/services/clinica.service.ts', 'utf8');

// 1. Change to computed for patients, appointments, notes, histories
content = content.replace(/patients\s*=\s*this\._patients\.asReadonly\(\);/, 'patients = computed(() => this._patients().filter(p => !p.isDeleted));');
content = content.replace(/appointments\s*=\s*this\._appointments\.asReadonly\(\);/, 'appointments = computed(() => this._appointments().filter(a => !a.isDeleted));');
content = content.replace(/notes\s*=\s*this\._notes\.asReadonly\(\);/, 'notes = computed(() => this._notes().filter(n => !n.isDeleted));');

// 2. updatePatient
content = content.replace(/removePatient\(id: string\): void \{\n    this\.updatePatient\(id, \{ active: false \}\);\n  \}/, "removePatient(id: string): void {\n    this.updatePatient(id, { active: false, isDeleted: true });\n    this.dataSync.saveToServerImmediate();\n  }");

// 3. removeNote
content = content.replace(/removeNote\(id: string\): void \{\n    this\._notes\.update\(list => list\.filter\(n => n\.id !== id\)\);\n    this\.persist\(this\.NOTES_KEY, this\._notes\(\)\);\n  \}/, "removeNote(id: string): void {\n    this._notes.update(list => list.map(n => n.id === id ? { ...n, isDeleted: true, updatedAt: new Date().toISOString() } : n));\n    this.persist(this.NOTES_KEY, this._notes());\n    this.dataSync.saveToServerImmediate();\n  }");

fs.writeFileSync('src/app/core/services/clinica.service.ts', content);
