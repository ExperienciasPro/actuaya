---
description: Reglas de persistencia de datos para nuevos módulos en ActuaYa
---

# Persistencia de Datos — Reglas para Nuevos Módulos

Cada nuevo módulo que almacene datos de usuario DEBE seguir estas reglas para garantizar que los datos sobrevivan actualizaciones, limpiezas de caché y cambios de navegador.

## Regla 1: Usar StorageService para guardar datos
Todos los servicios deben usar `StorageService` (inyectado) para leer/escribir datos.
```typescript
private storage = inject(StorageService);
private readonly STORAGE_KEY = 'um_<nombre_modulo>';
```

## Regla 2: Prefijo obligatorio `um_`
Todas las claves de localStorage **DEBEN** usar el prefijo `um_`. Esto es lo que el `DataSyncService` usa para identificar datos que deben sincronizarse al servidor.

```typescript
// ✅ Correcto
private readonly STORAGE_KEY = 'um_invoices';

// ❌ Incorrecto
private readonly STORAGE_KEY = 'invoices';
```

## Regla 3: No se necesita sincronización individual
El `DataSyncService` en `app.ts` intercepta TODAS las llamadas a `storage.set()` con prefijo `um_*` y las sincroniza automáticamente al servidor PHP con debounce de 2 segundos.

**No es necesario** agregar lógica de sincronización en cada servicio individual. Solo usa `this.storage.set(key, data)` y el sistema se encarga del resto.

## Regla 4: Estructura de servicio estándar
```typescript
@Injectable({ providedIn: 'root' })
export class NuevoModuloService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_nuevo_modulo';

  // Signal reactiva
  private _items = signal<Item[]>(this.loadFromStorage());

  private loadFromStorage(): Item[] {
    return this.storage.get<Item[]>(this.STORAGE_KEY) || [];
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this._items());
    // ↑ DataSyncService detecta esto automáticamente y lo sube al servidor
  }
}
```

## Regla 5: Deploy seguro
- La carpeta `api/` en Hostinger **NUNCA** se toca en actualizaciones
- El `angular.json` **NO** incluye `api/` en los assets del build
- Solo se suben archivos de `dist/actuaya-app/browser/` a `public_html/actuaya/`

## Arquitectura del sistema de persistencia

```
┌─────────────────────────────────┐
│  Servicio del Módulo            │
│  storage.set('um_xxx', data)    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  StorageService                 │
│  localStorage.setItem()         │
└──────────┬──────────────────────┘
           │ (interceptado por AppComponent)
           ▼
┌─────────────────────────────────┐
│  DataSyncService                │
│  saveToServerDebounced() (2s)   │
│  POST /api/data.php?key=_bulk   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  PHP API (api/data.php)         │
│  → api/data/{key}.json          │
└─────────────────────────────────┘
```

## Archivos clave
- `src/app/core/services/storage.service.ts` — Acceso a localStorage
- `src/app/core/services/data-sync.service.ts` — Sincronización con servidor
- `src/app/app.ts` — Intercepta storage.set() y activa sincronización
- `api/data.php` — Backend PHP (en Hostinger, NUNCA en el build)
