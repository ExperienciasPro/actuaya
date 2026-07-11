import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { GoalMode } from '../models/goal.model';
import { TaskPriority } from '../models/task.model';

export interface MicroTaskSuggestion {
  title: string;
  priority: TaskPriority;
  source: 'curated' | 'community';
}

interface CommunityTemplate {
  goalKeywords: string[];
  taskTitle: string;
  mode: GoalMode;
  usageCount: number;
  createdAt: string;
}

interface StaticEntry {
  keywords: string[];
  mode: GoalMode | 'both';
  tasks: { title: string; priority: TaskPriority }[];
}

@Injectable({ providedIn: 'root' })
export class MicroTaskTemplateService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_community_microtasks';

  private communityTemplates = signal<CommunityTemplate[]>(this.loadFromStorage());

  // ─── Static curated database ───
  private readonly staticDatabase: StaticEntry[] = [
    // ══════════════════════════════════
    // LEADER — Desarrollo personal
    // ══════════════════════════════════

    // Organizar tiempo
    {
      keywords: ['organizar', 'tiempo', 'horario', 'agenda', 'productividad'],
      mode: 'leader',
      tasks: [
        { title: 'Definir mis 3 prioridades de la semana', priority: 'high' },
        { title: 'Bloquear 2 horas de enfoque profundo en el calendario', priority: 'high' },
        { title: 'Establecer hora fija de inicio y cierre del día', priority: 'medium' },
        { title: 'Identificar mis 3 ladrones de tiempo más frecuentes', priority: 'medium' },
        { title: 'Desactivar notificaciones no esenciales durante el trabajo', priority: 'low' },
      ],
    },
    // Delegar
    {
      keywords: ['delegar', 'equipo', 'ayuda', 'contratar', 'asignar'],
      mode: 'leader',
      tasks: [
        { title: 'Listar todas las tareas que hago y que alguien más podría hacer', priority: 'high' },
        { title: 'Elegir 1 tarea repetitiva y asignársela a alguien esta semana', priority: 'high' },
        { title: 'Crear un checklist sencillo para la tarea que voy a delegar', priority: 'medium' },
        { title: 'Definir cómo voy a revisar el trabajo delegado', priority: 'medium' },
        { title: 'Agendar una revisión de 15 min con quien recibe la tarea', priority: 'low' },
      ],
    },
    // Salud y energía
    {
      keywords: ['salud', 'energía', 'ejercicio', 'dormir', 'bienestar', 'descanso'],
      mode: 'leader',
      tasks: [
        { title: 'Elegir 3 días fijos de la semana para hacer ejercicio', priority: 'high' },
        { title: 'Establecer una alarma para acostarme a la misma hora', priority: 'medium' },
        { title: 'Preparar mis almuerzos del día siguiente la noche anterior', priority: 'medium' },
        { title: 'Caminar 15 minutos después de comer hoy', priority: 'low' },
        { title: 'Dejar el celular fuera de la habitación al dormir', priority: 'low' },
      ],
    },
    // Finanzas personales
    {
      keywords: ['finanzas', 'separar', 'dinero', 'ahorro', 'cuenta', 'personal'],
      mode: 'leader',
      tasks: [
        { title: 'Abrir o activar una cuenta bancaria separada para el negocio', priority: 'high' },
        { title: 'Definir mi sueldo fijo mensual como emprendedor', priority: 'high' },
        { title: 'Anotar todos mis gastos personales de la última semana', priority: 'medium' },
        { title: 'Programar una transferencia automática quincenal a mi ahorro', priority: 'medium' },
        { title: 'Revisar si tengo suscripciones personales que puedo cancelar', priority: 'low' },
      ],
    },
    // Leer / aprender
    {
      keywords: ['leer', 'libro', 'aprender', 'curso', 'capacitación', 'inspirar', 'estudio'],
      mode: 'leader',
      tasks: [
        { title: 'Elegir 1 libro o curso para este mes', priority: 'high' },
        { title: 'Leer 10 páginas hoy (o ver 1 lección del curso)', priority: 'medium' },
        { title: 'Anotar la idea más importante que leí o aprendí hoy', priority: 'medium' },
        { title: 'Compartir lo aprendido con alguien del equipo o un colega', priority: 'low' },
        { title: 'Agendar 20 minutos diarios fijos para lectura/aprendizaje', priority: 'low' },
      ],
    },
    // Red de contactos / Networking
    {
      keywords: ['contactos', 'networking', 'red', 'conexiones', 'alianzas', 'café'],
      mode: 'leader',
      tasks: [
        { title: 'Hacer una lista de 5 personas que admiro o de las que puedo aprender', priority: 'high' },
        { title: 'Enviar 1 mensaje hoy a un contacto profesional valioso', priority: 'high' },
        { title: 'Agendar un café virtual o presencial con otro emprendedor', priority: 'medium' },
        { title: 'Unirme a un grupo de WhatsApp o comunidad de emprendedores', priority: 'medium' },
        { title: 'Asistir a 1 evento de networking este mes', priority: 'low' },
      ],
    },
    // Planificación
    {
      keywords: ['planificar', 'planificación', 'plan', 'estrategia', 'objetivos', 'metas'],
      mode: 'leader',
      tasks: [
        { title: 'Revisar qué metas cumplí y cuáles no este mes', priority: 'high' },
        { title: 'Definir las 3 metas más importantes del próximo mes', priority: 'high' },
        { title: 'Bloquear el último viernes del mes para revisión y planeación', priority: 'medium' },
        { title: 'Crear un tablero sencillo con mis metas visibles', priority: 'medium' },
        { title: 'Identificar qué obstáculo bloquea mi meta principal', priority: 'low' },
      ],
    },
    // Fondo de emergencia / ahorro
    {
      keywords: ['emergencia', 'fondo', 'ahorro', 'imprevisto', 'reserva'],
      mode: 'leader',
      tasks: [
        { title: 'Calcular cuánto necesito para cubrir 3 meses de gastos fijos', priority: 'high' },
        { title: 'Definir qué porcentaje de mis ingresos voy a ahorrar', priority: 'high' },
        { title: 'Abrir una cuenta de ahorro si no la tengo', priority: 'medium' },
        { title: 'Hacer mi primera transferencia al fondo de emergencia hoy', priority: 'medium' },
        { title: 'Programar transferencia automática para cada quincena', priority: 'low' },
      ],
    },
    // Comunicación / liderazgo
    {
      keywords: ['comunicación', 'liderazgo', 'liderar', 'equipo', 'motivar', 'inspirar'],
      mode: 'leader',
      tasks: [
        { title: 'Agendar una reunión 1-a-1 con cada miembro del equipo esta semana', priority: 'high' },
        { title: 'Dar feedback positivo a alguien del equipo hoy', priority: 'medium' },
        { title: 'Establecer un canal claro para comunicar prioridades semanales', priority: 'medium' },
        { title: 'Pedir a alguien del equipo que me dé retroalimentación honesta', priority: 'low' },
        { title: 'Escribir la visión de mi negocio en 3 frases claras', priority: 'low' },
      ],
    },
    // Estrés / burnout
    {
      keywords: ['estrés', 'burnout', 'agotamiento', 'ansiedad', 'descansar', 'vacaciones'],
      mode: 'leader',
      tasks: [
        { title: 'Identificar las 3 cosas que más estrés me causan', priority: 'high' },
        { title: 'Bloquear 1 día completo libre esta semana (sin trabajo)', priority: 'high' },
        { title: 'Definir un ritual de desconexión al final del día laboral', priority: 'medium' },
        { title: 'Decir "no" a 1 compromiso que no es prioridad esta semana', priority: 'medium' },
        { title: 'Practicar 5 minutos de respiración profunda hoy', priority: 'low' },
      ],
    },

    // ══════════════════════════════════
    // BUSINESS — Metas del negocio
    // ══════════════════════════════════

    // Conseguir clientes
    {
      keywords: ['clientes', 'conseguir', 'prospectos', 'leads', 'nuevos', 'atraer', 'captar'],
      mode: 'business',
      tasks: [
        { title: 'Listar 10 prospectos que podrían necesitar mi producto/servicio', priority: 'high' },
        { title: 'Preparar un mensaje de contacto personalizado (no spam)', priority: 'high' },
        { title: 'Contactar a 3 prospectos hoy por el canal que más usen', priority: 'high' },
        { title: 'Definir mi propuesta de valor en 1 frase clara', priority: 'medium' },
        { title: 'Pedir a 2 clientes actuales que me recomienden', priority: 'medium' },
      ],
    },
    // Ventas / ingresos
    {
      keywords: ['ventas', 'vender', 'ingresos', 'facturación', 'subir', 'aumentar', 'ticket'],
      mode: 'business',
      tasks: [
        { title: 'Identificar mi producto/servicio más rentable', priority: 'high' },
        { title: 'Crear un combo o paquete con 2 productos complementarios', priority: 'high' },
        { title: 'Ofrecer el combo a 5 clientes actuales esta semana', priority: 'medium' },
        { title: 'Revisar los precios: ¿cobro lo que realmente vale?', priority: 'medium' },
        { title: 'Establecer una meta de ventas diaria o semanal', priority: 'low' },
      ],
    },
    // Cuentas / finanzas del negocio
    {
      keywords: ['cuentas', 'finanzas', 'gastos', 'ingresos', 'ordenar', 'contabilidad'],
      mode: 'business',
      tasks: [
        { title: 'Anotar todos los ingresos de esta semana en una hoja/app', priority: 'high' },
        { title: 'Anotar todos los gastos de esta semana', priority: 'high' },
        { title: 'Calcular mi utilidad real (ingresos - gastos)', priority: 'medium' },
        { title: 'Identificar mi gasto más alto y evaluar si puedo reducirlo', priority: 'medium' },
        { title: 'Crear un hábito: registrar ingresos/gastos cada viernes', priority: 'low' },
      ],
    },
    // Servicio al cliente
    {
      keywords: ['servicio', 'atención', 'cliente', 'mejorar', 'calidad', 'satisfacción', 'feedback'],
      mode: 'business',
      tasks: [
        { title: 'Escribir a 5 clientes recientes para preguntar cómo les fue', priority: 'high' },
        { title: 'Crear una encuesta rápida de satisfacción (3 preguntas)', priority: 'medium' },
        { title: 'Identificar la queja más frecuente y proponer una solución', priority: 'high' },
        { title: 'Definir un tiempo máximo de respuesta para consultas', priority: 'medium' },
        { title: 'Agradecer personalmente a 3 clientes fieles', priority: 'low' },
      ],
    },
    // Presencia online / redes
    {
      keywords: ['presencia', 'online', 'redes', 'digital', 'instagram', 'facebook', 'tiktok', 'google', 'web', 'página'],
      mode: 'business',
      tasks: [
        { title: 'Actualizar la foto de perfil y bio del negocio en redes', priority: 'high' },
        { title: 'Tomar 5 fotos profesionales de mis productos/servicios', priority: 'high' },
        { title: 'Programar 3 publicaciones de valor para esta semana', priority: 'medium' },
        { title: 'Responder todos los comentarios y mensajes pendientes', priority: 'medium' },
        { title: 'Crear o actualizar mi perfil en Google My Business', priority: 'low' },
      ],
    },
    // Recuperar clientes
    {
      keywords: ['recuperar', 'clientes', 'perdidos', 'inactivos', 'reactivar', 'retención'],
      mode: 'business',
      tasks: [
        { title: 'Listar 10 clientes que no han comprado en los últimos 3 meses', priority: 'high' },
        { title: 'Crear una oferta especial de "te extrañamos"', priority: 'high' },
        { title: 'Enviar la oferta por WhatsApp o correo a los 10 clientes', priority: 'medium' },
        { title: 'Llamar a los 3 clientes más importantes de la lista', priority: 'medium' },
        { title: 'Analizar por qué se fueron (precio, servicio, competencia)', priority: 'low' },
      ],
    },
    // Referidos
    {
      keywords: ['referidos', 'recomendaciones', 'boca', 'recomendar'],
      mode: 'business',
      tasks: [
        { title: 'Definir qué beneficio ofreceré a quien me refiera un cliente', priority: 'high' },
        { title: 'Crear un mensaje sencillo que explique el programa', priority: 'medium' },
        { title: 'Enviar el programa a mis 10 mejores clientes', priority: 'high' },
        { title: 'Agradecer públicamente al primer cliente que haga un referido', priority: 'medium' },
        { title: 'Medir cuántos clientes nuevos llegaron por referidos este mes', priority: 'low' },
      ],
    },
    // Reducir gastos
    {
      keywords: ['reducir', 'gasto', 'costos', 'ahorrar', 'suscripciones', 'recortar'],
      mode: 'business',
      tasks: [
        { title: 'Listar TODOS los gastos fijos mensuales del negocio', priority: 'high' },
        { title: 'Marcar cuáles son 100% necesarios y cuáles no', priority: 'high' },
        { title: 'Cancelar o renegociar al menos 1 gasto innecesario hoy', priority: 'medium' },
        { title: 'Comparar precios de proveedores actuales vs. alternativas', priority: 'medium' },
        { title: 'Evaluar si algún gasto se puede compartir con otro negocio', priority: 'low' },
      ],
    },
    // Marketing / publicidad
    {
      keywords: ['marketing', 'publicidad', 'promoción', 'campaña', 'anuncio', 'marca'],
      mode: 'business',
      tasks: [
        { title: 'Definir quién es mi cliente ideal en 1 párrafo', priority: 'high' },
        { title: 'Crear una promoción sencilla para esta semana', priority: 'high' },
        { title: 'Publicar la promoción en mis redes sociales', priority: 'medium' },
        { title: 'Enviar la promo por WhatsApp a mis contactos de clientes', priority: 'medium' },
        { title: 'Medir cuántas ventas generó la promoción', priority: 'low' },
      ],
    },
    // Inventario / stock
    {
      keywords: ['inventario', 'stock', 'productos', 'proveedores', 'compras', 'almacén'],
      mode: 'business',
      tasks: [
        { title: 'Hacer un conteo rápido de los productos disponibles', priority: 'high' },
        { title: 'Identificar los 3 productos que más se venden', priority: 'high' },
        { title: 'Verificar si hay productos próximos a vencer o con baja rotación', priority: 'medium' },
        { title: 'Negociar mejores condiciones con mi proveedor principal', priority: 'medium' },
        { title: 'Crear un sistema simple de registro de entradas y salidas', priority: 'low' },
      ],
    },
    // Procesos / automatización
    {
      keywords: ['procesos', 'automatizar', 'sistema', 'eficiencia', 'optimizar', 'mejorar', 'procedimientos'],
      mode: 'business',
      tasks: [
        { title: 'Listar las 5 tareas que más repito cada semana', priority: 'high' },
        { title: 'Elegir 1 de esas tareas y crear un paso a paso escrito', priority: 'high' },
        { title: 'Buscar 1 herramienta gratuita que pueda automatizar esa tarea', priority: 'medium' },
        { title: 'Documentar el proceso para que alguien más lo pueda ejecutar', priority: 'medium' },
        { title: 'Medir cuánto tiempo ahorro con el nuevo proceso', priority: 'low' },
      ],
    },
    // Equipo / contratación
    {
      keywords: ['equipo', 'contratar', 'personal', 'empleado', 'colaborador', 'freelancer'],
      mode: 'business',
      tasks: [
        { title: 'Definir exactamente qué función necesito cubrir', priority: 'high' },
        { title: 'Escribir una descripción clara del puesto (máx 10 líneas)', priority: 'high' },
        { title: 'Publicar la vacante en 2 grupos o plataformas relevantes', priority: 'medium' },
        { title: 'Preparar 5 preguntas clave para la entrevista', priority: 'medium' },
        { title: 'Definir un período de prueba de 2 semanas con objetivos claros', priority: 'low' },
      ],
    },

    // ══════════════════════════════════
    // BOTH — Aplican para líder y negocio
    // ══════════════════════════════════
    {
      keywords: ['hábito', 'rutina', 'disciplina', 'constancia'],
      mode: 'both',
      tasks: [
        { title: 'Elegir 1 solo hábito nuevo para construir este mes', priority: 'high' },
        { title: 'Definir el momento exacto del día en que lo haré', priority: 'high' },
        { title: 'Anclar el hábito a algo que ya hago (Ej: después de lavarme los dientes)', priority: 'medium' },
        { title: 'Llevar un registro diario simple (hecho/no hecho)', priority: 'medium' },
        { title: 'Celebrar cada día que cumplo el hábito (recompensa pequeña)', priority: 'low' },
      ],
    },
    {
      keywords: ['meta', 'objetivo', 'lograr', 'alcanzar', 'cumplir', 'propósito'],
      mode: 'both',
      tasks: [
        { title: 'Escribir la meta en una frase clara y medible', priority: 'high' },
        { title: 'Definir cómo voy a saber si la cumplí (indicador)', priority: 'high' },
        { title: 'Identificar el primer paso más pequeño posible', priority: 'medium' },
        { title: 'Definir una fecha límite realista', priority: 'medium' },
        { title: 'Contarle a alguien mi meta para crear compromiso', priority: 'low' },
      ],
    },
  ];

  // ─── Public methods ───

  getSuggestions(goalTitle: string, mode: GoalMode, intentionAction?: string): MicroTaskSuggestion[] {
    if (!goalTitle || goalTitle.trim().length < 3) return [];

    // Combine keywords from title + intention action for better context
    let searchText = goalTitle;
    if (intentionAction && intentionAction.trim().length > 2) {
      searchText += ' ' + intentionAction;
    }
    const searchWords = this.normalizeText(searchText).split(/\s+/);

    // 1) Search static database
    const staticResults = this.searchStatic(searchWords, mode);

    // 2) Search community templates
    const communityResults = this.searchCommunity(searchWords, mode);

    // 3) Merge: curated first, then community (deduplicated), max 5
    const merged: MicroTaskSuggestion[] = [];
    const seenTitles = new Set<string>();

    for (const task of staticResults) {
      const key = this.normalizeText(task.title);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        merged.push(task);
      }
    }

    for (const task of communityResults) {
      const key = this.normalizeText(task.title);
      if (!seenTitles.has(key) && merged.length < 7) {
        seenTitles.add(key);
        merged.push(task);
      }
    }

    return merged.slice(0, 5);
  }

  learnFromUser(goalTitle: string, mode: GoalMode, tasks: { title: string; priority: TaskPriority }[]): void {
    if (!goalTitle || tasks.length === 0) return;

    const keywords = this.extractKeywords(goalTitle);
    const existing = this.communityTemplates();
    const updated = [...existing];

    for (const task of tasks) {
      const normalizedTitle = this.normalizeText(task.title);
      // Check if this task already exists in community templates
      const existingIdx = updated.findIndex(
        t => this.normalizeText(t.taskTitle) === normalizedTitle
      );

      if (existingIdx >= 0) {
        // Increment usage count
        updated[existingIdx] = {
          ...updated[existingIdx],
          usageCount: updated[existingIdx].usageCount + 1,
        };
      } else {
        // Add new community template
        updated.push({
          goalKeywords: keywords,
          taskTitle: task.title,
          mode,
          usageCount: 1,
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.communityTemplates.set(updated);
    this.persist();
  }

  // ─── Private helpers ───

  private searchStatic(titleWords: string[], mode: GoalMode): MicroTaskSuggestion[] {
    let bestMatch: StaticEntry | null = null;
    let bestScore = 0;

    for (const entry of this.staticDatabase) {
      if (entry.mode !== 'both' && entry.mode !== mode) continue;

      let score = 0;
      for (const word of titleWords) {
        for (const keyword of entry.keywords) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += word === keyword ? 3 : 1; // exact match scores higher
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (!bestMatch || bestScore < 1) return [];

    return bestMatch.tasks.map(t => ({
      title: t.title,
      priority: t.priority,
      source: 'curated' as const,
    }));
  }

  private searchCommunity(titleWords: string[], mode: GoalMode): MicroTaskSuggestion[] {
    const templates = this.communityTemplates()
      .filter(t => t.mode === mode)
      .map(t => {
        let score = 0;
        for (const word of titleWords) {
          for (const keyword of t.goalKeywords) {
            if (keyword.includes(word) || word.includes(keyword)) {
              score += 1;
            }
          }
        }
        // Boost by usage count
        score += Math.min(t.usageCount * 0.5, 3);
        return { template: t, score };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return templates.map(t => ({
      title: t.template.taskTitle,
      priority: 'medium' as TaskPriority,
      source: 'community' as const,
    }));
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a',
      'en', 'con', 'por', 'para', 'y', 'o', 'que', 'se', 'es', 'no',
      'mi', 'mis', 'me', 'su', 'sus', 'este', 'esta', 'esto', 'más',
      'mas', 'muy', 'ya', 'como', 'ser', 'ha', 'he',
    ]);
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  private loadFromStorage(): CommunityTemplate[] {
    return this.storage.get<CommunityTemplate[]>(this.STORAGE_KEY) || [];
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this.communityTemplates());
  }
}
