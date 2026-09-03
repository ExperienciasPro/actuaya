const fs = require('fs');
const path = require('path');

function replaceFile(filePath, callback) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = callback(content);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

// 1. equipo.service.ts
replaceFile('src/app/core/services/equipo.service.ts', content => {
  return content
    .replace('equipos = signal<Equipo[]>(this.loadEquipos());', 'private equiposSignal = signal<Equipo[]>(this.loadEquipos());\n  equipos = computed(() => this.equiposSignal().filter(e => !e.isDeleted));')
    .replace('this.equipos().map', 'this.equiposSignal().map')
    .replace('this.equipos()', 'this.equiposSignal()') // inside addEquipo
    .replace('this.equipos().map', 'this.equiposSignal().map') // inside updateEquipo
    .replace('this.equipos.set(list)', 'this.equiposSignal.set(list)') // inside saveEquipos
    .replace(/deleteEquipo\(id: string\) \{\s*this\.saveEquipos\(this\.equipos\(\)\.filter\(e => e\.id !== id\)\);\s*\}/g, 'deleteEquipo(id: string) {\n    this.saveEquipos(this.equiposSignal().map(e => e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e));\n  }')
    .replace('this.equiposSignal().map', 'this.equipos().map'); // Fix the computed map back
});

// Also add isDeleted to model
replaceFile('src/app/core/models/equipo.model.ts', content => {
  if (!content.includes('isDeleted')) {
    return content.replace('updatedAt: string;', 'updatedAt: string;\n  isDeleted?: boolean;');
  }
  return content;
});
