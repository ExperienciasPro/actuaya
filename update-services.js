const fs = require('fs');
const path = require('path');

const basePath = '/Users/gonzalojimenezramirez/Desktop/Desarrollos/actuaya/src/app/core';

function updateFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated service: ${filePath}`);
}

// 2. gastro.service.ts
updateFile(path.join(basePath, 'services/gastro.service.ts'), [
  { search: 'private _zones = signal', replace: 'private _zonesSignal = signal' },
  { search: 'private _tables = signal', replace: 'private _tablesSignal = signal' },
  { search: 'private _orders = signal', replace: 'private _ordersSignal = signal' },
  { search: 'this._zones.', replace: 'this._zonesSignal.' },
  { search: 'this._tables.', replace: 'this._tablesSignal.' },
  { search: 'this._orders.', replace: 'this._ordersSignal.' },
  { search: 'this._zones()', replace: 'this._zonesSignal()' },
  { search: 'this._tables()', replace: 'this._tablesSignal()' },
  { search: 'this._orders()', replace: 'this._ordersSignal()' },
  { search: 'zones = this._zonesSignal.asReadonly();', replace: 'zones = computed(() => this._zonesSignal().filter(z => !z.isDeleted));' },
  { search: 'tables = this._tablesSignal.asReadonly();', replace: 'tables = computed(() => this._tablesSignal().filter(t => !t.isDeleted));' },
  { search: 'orders = this._ordersSignal.asReadonly();', replace: 'orders = computed(() => this._ordersSignal().filter(o => !o.isDeleted));' },
  { 
    search: 'this._zonesSignal.update(list => list.filter(z => z.id !== id));\n    this._tablesSignal.update(list => list.filter(t => t.zoneId !== id));',
    replace: 'this._zonesSignal.update(list => list.map(z => z.id === id ? { ...z, isDeleted: true, updatedAt: new Date().toISOString() } : z));\n    this._tablesSignal.update(list => list.map(t => t.zoneId === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));'
  },
  {
    search: 'this._tablesSignal.update(list => list.filter(t => t.id !== id));',
    replace: 'this._tablesSignal.update(list => list.map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));'
  },
  { search: 'this.persistZones();\n    this.persistTables();\n  }', replace: 'this.persistZones();\n    this.persistTables();\n    this.dataSync.saveToServerImmediate();\n  }' },
  { search: 'this.persistTables();\n  }', replace: 'this.persistTables();\n    this.dataSync.saveToServerImmediate();\n  }' }
]);

// 4. licitaciones.service.ts
updateFile(path.join(basePath, 'services/licitaciones.service.ts'), [
  { search: 'batches = signal<LicitacionBatch[]>', replace: 'private batchesSignal = signal<LicitacionBatch[]>' },
  { search: 'this.batches()', replace: 'this.batchesSignal()' },
  { search: 'this.batches.', replace: 'this.batchesSignal.' },
  { search: 'batchesSignal = signal<LicitacionBatch[]>(', replace: 'batchesSignal = signal<LicitacionBatch[]>(\n    this.storage.get<LicitacionBatch[]>(this.STORAGE_KEY) || []\n  );\n  batches = computed(() => this.batchesSignal().filter(b => !b.isDeleted));\n\n  // old signal start:' },
  { search: '// old signal start:\n    this.storage.get<LicitacionBatch[]>(this.STORAGE_KEY) || []\n  );', replace: '' },
  { 
    search: 'const updated = this.batchesSignal().filter(b => b.id !== id);',
    replace: 'const updated = this.batchesSignal().map(b => b.id === id ? { ...b, isDeleted: true, updatedAt: new Date().toISOString() } : b);'
  },
  { search: 'this.persist();\n  }', replace: 'this.persist();\n    this.dataSync.saveToServerImmediate();\n  }' },
  { search: 'this.dataSync.saveToServerImmediate();\n  }\n\n  private getCurrentWeekLabel()', replace: 'this.dataSync.saveToServerDebounced();\n  }\n\n  private getCurrentWeekLabel()' }
]);

// 6. menu.service.ts
updateFile(path.join(basePath, 'services/menu.service.ts'), [
  { search: 'items      = signal<MenuItem[]>', replace: 'private itemsSignal = signal<MenuItem[]>' },
  { search: 'categories = signal<MenuCategory[]>', replace: 'private categoriesSignal = signal<MenuCategory[]>' },
  { search: 'this.items()', replace: 'this.itemsSignal()' },
  { search: 'this.items.', replace: 'this.itemsSignal.' },
  { search: 'this.categories()', replace: 'this.categoriesSignal()' },
  { search: 'this.categories.', replace: 'this.categoriesSignal.' },
  { search: 'private categoriesSignal = signal<MenuCategory[]>(this.ensureDefaultCategories(\n    this.load<MenuCategory[]>(CATS_KEY, this.DEFAULT_CATEGORIES)\n  ));', 
    replace: 'private categoriesSignal = signal<MenuCategory[]>(this.ensureDefaultCategories(\n    this.load<MenuCategory[]>(CATS_KEY, this.DEFAULT_CATEGORIES)\n  ));\n  items = computed(() => this.itemsSignal().filter(i => !i.isDeleted));\n  categories = computed(() => this.categoriesSignal().filter(c => !c.isDeleted));' 
  },
  { search: 'this.itemsSignal.update(list => list.filter(i => i.id !== id));', replace: 'this.itemsSignal.update(list => list.map(i => i.id === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i));' },
  { search: 'this.categoriesSignal.update(list => list.filter(c => c.id !== id));', replace: 'this.categoriesSignal.update(list => list.map(c => c.id === id ? { ...c, isDeleted: true, updatedAt: new Date().toISOString() } : c));' },
  { search: 'this.persist(ITEMS_KEY, this.itemsSignal());\n  }', replace: 'this.persist(ITEMS_KEY, this.itemsSignal());\n    this.dataSync.saveToServerImmediate();\n  }' },
  { search: 'this.persist(CATS_KEY, this.categoriesSignal());\n  }', replace: 'this.persist(CATS_KEY, this.categoriesSignal());\n    this.dataSync.saveToServerImmediate();\n  }' },
  { search: 'this.dataSync.saveToServerImmediate();\n  }\n\n  /**', replace: 'this.dataSync.saveToServerDebounced();\n  }\n\n  /**' }
]);

// 8. asignaciones.service.ts
updateFile(path.join(basePath, 'services/asignaciones.service.ts'), [
  { search: 'private _technicians = signal', replace: 'private _techniciansSignal = signal' },
  { search: 'private _assignments = signal', replace: 'private _assignmentsSignal = signal' },
  { search: 'this._technicians()', replace: 'this._techniciansSignal()' },
  { search: 'this._technicians.', replace: 'this._techniciansSignal.' },
  { search: 'this._assignments()', replace: 'this._assignmentsSignal()' },
  { search: 'this._assignments.', replace: 'this._assignmentsSignal.' },
  { search: 'technicians = this._techniciansSignal.asReadonly();', replace: 'technicians = computed(() => this._techniciansSignal().filter(t => !t.isDeleted));' },
  { search: 'assignments = this._assignmentsSignal.asReadonly();', replace: 'assignments = computed(() => this._assignmentsSignal().filter(a => !a.isDeleted));' },
  { search: 'this._techniciansSignal.update(ts => ts.filter(t => t.id !== id));', replace: 'this._techniciansSignal.update(ts => ts.map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));' },
  { search: 'this._assignmentsSignal.update(as => as.filter(a => a.id !== id));', replace: 'this._assignmentsSignal.update(as => as.map(a => a.id === id ? { ...a, isDeleted: true, updatedAt: new Date().toISOString() } : a));' },
  { search: 'this.persistTechnicians();\n  }', replace: 'this.persistTechnicians();\n    this.dataSync.saveToServerImmediate();\n  }' },
  { search: 'this.persistAssignments();\n  }', replace: 'this.persistAssignments();\n    this.dataSync.saveToServerImmediate();\n  }' }
]);

// 9. education.service.ts
updateFile(path.join(basePath, 'services/education.service.ts'), [
  { search: 'import { Injectable, signal, computed, inject, effect } from \'@angular/core\';', replace: 'import { Injectable, signal, computed, inject, effect, Injector } from \'@angular/core\';\nimport { DataSyncService } from \'./data-sync.service\';' },
  { search: 'programs = signal<EducationalProgram[]>', replace: 'private _programsSignal = signal<EducationalProgram[]>' },
  { search: 'incomes = signal<ProgramIncome[]>', replace: 'private _incomesSignal = signal<ProgramIncome[]>' },
  { search: 'expenses = signal<ProgramExpense[]>', replace: 'private _expensesSignal = signal<ProgramExpense[]>' },
  { search: 'this.programs()', replace: 'this._programsSignal()' },
  { search: 'this.programs.', replace: 'this._programsSignal.' },
  { search: 'this.incomes()', replace: 'this._incomesSignal()' },
  { search: 'this.incomes.', replace: 'this._incomesSignal.' },
  { search: 'this.expenses()', replace: 'this._expensesSignal()' },
  { search: 'this.expenses.', replace: 'this._expensesSignal.' },
  { search: 'private _expensesSignal = signal<ProgramExpense[]>([]);', replace: 'private _expensesSignal = signal<ProgramExpense[]>([]);\n  programs = computed(() => this._programsSignal().filter(p => !p.isDeleted));\n  incomes = computed(() => this._incomesSignal().filter(i => !i.isDeleted));\n  expenses = computed(() => this._expensesSignal().filter(e => !e.isDeleted));\n\n  private injector = inject(Injector);\n  private _dataSync: DataSyncService | null = null;\n  private get dataSync(): DataSyncService {\n    if (!this._dataSync) {\n      this._dataSync = this.injector.get(DataSyncService);\n    }\n    return this._dataSync;\n  }' },
  { search: 'const updated = this._programsSignal().filter(p => p.id !== id);', replace: 'const updated = this._programsSignal().map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p);' },
  { search: 'const updated = this._incomesSignal().filter(i => i.id !== id);', replace: 'const updated = this._incomesSignal().map(i => i.id === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i);' },
  { search: 'const updated = this._expensesSignal().filter(e => e.id !== id);', replace: 'const updated = this._expensesSignal().map(e => e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e);' },
  { search: 'const updatedIncomes = this._incomesSignal().filter(i => i.programId !== id);', replace: 'const updatedIncomes = this._incomesSignal().map(i => i.programId === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i);' },
  { search: 'const updatedExpenses = this._expensesSignal().filter(e => e.programId !== id);', replace: 'const updatedExpenses = this._expensesSignal().map(e => e.programId === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e);' },
  
  // Updating storages to also trigger datasync correctly
  { search: 'this.storage.set(this.PROGRAMS_KEY, updated);', replace: 'this.storage.set(this.PROGRAMS_KEY, updated);\n    this.dataSync.trackLocalModification(this.PROGRAMS_KEY);\n    this.dataSync.saveToServerDebounced();' },
  { search: 'this.storage.set(this.INCOMES_KEY, updated);', replace: 'this.storage.set(this.INCOMES_KEY, updated);\n    this.dataSync.trackLocalModification(this.INCOMES_KEY);\n    this.dataSync.saveToServerDebounced();' },
  { search: 'this.storage.set(this.EXPENSES_KEY, updated);', replace: 'this.storage.set(this.EXPENSES_KEY, updated);\n    this.dataSync.trackLocalModification(this.EXPENSES_KEY);\n    this.dataSync.saveToServerDebounced();' },
  { search: 'this.storage.set(this.INCOMES_KEY, updatedIncomes);', replace: 'this.storage.set(this.INCOMES_KEY, updatedIncomes);\n    this.dataSync.trackLocalModification(this.INCOMES_KEY);\n    this.dataSync.saveToServerDebounced();' },
  { search: 'this.storage.set(this.EXPENSES_KEY, updatedExpenses);', replace: 'this.storage.set(this.EXPENSES_KEY, updatedExpenses);\n    this.dataSync.trackLocalModification(this.EXPENSES_KEY);\n    this.dataSync.saveToServerDebounced();' },
  
  // Appending saveToServerImmediate to delete methods in education
  { search: 'this.dataSync.saveToServerDebounced();\n  }\n\n  // — CRUD Incomes —', replace: 'this.dataSync.saveToServerImmediate();\n  }\n\n  // — CRUD Incomes —' }, // For deleteProgram
  { search: 'this.dataSync.saveToServerDebounced();\n  }\n\n  // — CRUD Expenses —', replace: 'this.dataSync.saveToServerImmediate();\n  }\n\n  // — CRUD Expenses —' }, // For deleteIncome
  { search: 'this.dataSync.saveToServerDebounced();\n  }\n}', replace: 'this.dataSync.saveToServerImmediate();\n  }\n}' } // For deleteExpense
]);
