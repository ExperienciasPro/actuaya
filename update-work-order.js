const fs = require('fs');

let content = fs.readFileSync('src/app/core/services/work-order.service.ts', 'utf8');

// 1. orders computed
content = content.replace(/orders = this\._orders\.asReadonly\(\);/, 'orders = computed(() => this._orders().filter(o => !o.isDeleted));');

// 2. assignedOrders, activeOrders, completedOrders are computed from this._orders(). Change to this.orders()
content = content.replace(/assignedOrders = computed\(\(\) =>\n    this\._orders\(\)\.filter/g, "assignedOrders = computed(() =>\n    this.orders().filter");
content = content.replace(/activeOrders = computed\(\(\) =>\n    this\._orders\(\)\.filter/g, "activeOrders = computed(() =>\n    this.orders().filter");
content = content.replace(/completedOrders = computed\(\(\) =>\n    this\._orders\(\)\.filter/g, "completedOrders = computed(() =>\n    this.orders().filter");

// 3. removeEvidence
content = content.replace(/\[otId\]: \(map\[otId\] \|\| \[\]\)\.filter\(e => e\.id !== evidenceId\),/, "[otId]: (map[otId] || []).map(e => e.id === evidenceId ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e),");

// 4. removeSparePart
content = content.replace(/\[otId\]: \(map\[otId\] \|\| \[\]\)\.filter\(p => p\.id !== partId\),/, "[otId]: (map[otId] || []).map(p => p.id === partId ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p),");

// 5. Update getEvidence and getSpareParts to filter out deleted ones
content = content.replace(/getEvidence\(otId: string\): OtEvidence\[\] \{\n    return this\._evidence\(\)\[otId\] \|\| \[\];\n  \}/, "getEvidence(otId: string): OtEvidence[] {\n    return (this._evidence()[otId] || []).filter(e => !e.isDeleted);\n  }");

content = content.replace(/getSpareParts\(otId: string\): OtSparePart\[\] \{\n    return this\._spareParts\(\)\[otId\] \|\| \[\];\n  \}/, "getSpareParts(otId: string): OtSparePart[] {\n    return (this._spareParts()[otId] || []).filter(p => !p.isDeleted);\n  }");

// 6. getById
content = content.replace(/getById\(id: string\): WorkOrder \| undefined \{\n    return this\._orders\(\)\.find\(o => o\.id === id\);\n  \}/, "getById(id: string): WorkOrder | undefined {\n    return this.orders().find(o => o.id === id);\n  }");

fs.writeFileSync('src/app/core/services/work-order.service.ts', content);
