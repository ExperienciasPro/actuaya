const fs = require('fs');
const path = require('path');

function replaceFile(filePath, callbacks) {
  let content = fs.readFileSync(filePath, 'utf8');
  callbacks.forEach(cb => { content = cb(content); });
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

// 1. storytelling.service.ts
replaceFile('src/app/core/services/storytelling.service.ts', [
  c => c.replace(/import \{ Injectable, signal, inject \} from '@angular\/core';/, "import { Injectable, signal, computed, inject, Injector } from '@angular/core';\nimport { DataSyncService } from './data-sync.service';"),
  c => c.replace(/private readonly DATASOURCES_KEY = 'um_datasources';/, "private readonly DATASOURCES_KEY = 'um_datasources';\n\n  private injector = inject(Injector);\n  private _dataSync: DataSyncService | null = null;\n  private get dataSync(): DataSyncService {\n    if (!this._dataSync) {\n      this._dataSync = this.injector.get(DataSyncService);\n    }\n    return this._dataSync;\n  }"),
  c => c.replace(/storyboards = signal/, 'private storyboardsSignal = signal'),
  c => c.replace(/dataSources = signal<DataSource\[\]>\(this.storage.get<DataSource\[\]>\(this.DATASOURCES_KEY\) \|\| \[\]\);/, "private dataSourcesSignal = signal<DataSource[]>(this.storage.get<DataSource[]>(this.DATASOURCES_KEY) || []);\n  storyboards = computed(() => this.storyboardsSignal().filter(s => !s.isDeleted));\n  dataSources = computed(() => this.dataSourcesSignal().filter(s => !s.isDeleted));"),
  c => c.replace(/this.dataSources\(\)/g, 'this.dataSourcesSignal()'),
  c => c.replace(/this.dataSources.set/g, 'this.dataSourcesSignal.set'),
  c => c.replace(/this.storyboards\(\)/g, 'this.storyboardsSignal()'),
  c => c.replace(/this.storyboards.set/g, 'this.storyboardsSignal.set'),
  c => c.replace(/this.storage.set\(this.DATASOURCES_KEY, updated\);/g, "this.storage.set(this.DATASOURCES_KEY, updated);\n    this.dataSync.trackLocalModification(this.DATASOURCES_KEY);\n    this.dataSync.saveToServerDebounced();"),
  c => c.replace(/this.storage.set\(this.STORYBOARDS_KEY, updated\);/g, "this.storage.set(this.STORYBOARDS_KEY, updated);\n    this.dataSync.trackLocalModification(this.STORYBOARDS_KEY);\n    this.dataSync.saveToServerDebounced();"),
  c => c.replace(/const updated = this.dataSourcesSignal\(\).filter\(s => s.id !== id\);/, "const updated = this.dataSourcesSignal().map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s);\n    this.dataSync.saveToServerImmediate();"),
  c => c.replace(/const updated = this.storyboardsSignal\(\).filter\(s => s.id !== id\);/, "const updated = this.storyboardsSignal().map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: new Date().toISOString() } : s);\n    this.dataSync.saveToServerImmediate();")
]);
