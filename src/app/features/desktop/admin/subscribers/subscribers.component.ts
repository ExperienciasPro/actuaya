import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { UserService, UserProfile } from '../../../../core/services/user.service';
import { MockSubscriptionService } from '../../../../core/services/mock-subscription.service';
import { StorageService } from '../../../../core/services/storage.service';
import { DataSyncService } from '../../../../core/services/data-sync.service';
import { Router } from '@angular/router';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';
import { SubscriptionStatusBadgeComponent } from '../../../../shared/components/subscription-status-badge/subscription-status-badge';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
  AppSolution,
  PaymentFrequency,
  APP_LABELS,
  APP_ICONS,
  STATUS_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  SUBSCRIPTION_TYPE_ICONS,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_FREQUENCY_MONTHS,
  RenewalHealth,
  CompanyInfo,
  CompanyContact,
  Currency,
} from '../../../../core/models/subscription.model';

type PanelMode = 'closed' | 'create' | 'edit';
type ActiveTab = 'subscribers' | 'users';

/** Vista unificada que puede ser un suscriptor formal o un usuario activo */
export interface UnifiedSubscriber {
  id: string;
  sourceType: 'subscription' | 'user';
  name: string;
  email: string;
  phone?: string;
  status: SubscriptionStatus;          // ACTIVE | TRIAL | EXPIRED | SUSPENDED
  statusLabel: string;
  createdAt: string;
  lastLogin?: string;
  role?: string;
  // Para registros formales de suscripción
  sub?: Subscription;
}

@Component({
  selector: 'um-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule, UmIconComponent, SubscriptionStatusBadgeComponent, DatePipe],
  templateUrl: './subscribers.component.html',
  styleUrl: './subscribers.scss',
})
export class SubscribersComponent {
  private subService = inject(SubscriptionService);
  private userService = inject(UserService);
  private mockSubService = inject(MockSubscriptionService);
  private storageService = inject(StorageService);
  private dataSyncService = inject(DataSyncService);
  private router = inject(Router);

  // ─── Tab State ─────────────────────────────
  activeTab = signal<ActiveTab>('users');

  // ─── Subscription State ────────────────────
  searchQuery = signal('');
  statusFilter = signal<string>('all');
  panelMode = signal<PanelMode>('closed');
  editingId = signal<string | null>(null);
  toast = signal('');

  // ─── Detail Panels ─────────────────────────
  selectedUser = signal<UserProfile | null>(null);
  selectedSub = signal<Subscription | null>(null);

  // ─── Subscription Form ─────────────────────
  form = signal(this.emptyForm());

  // ─── User Management State ─────────────────
  users = signal<UserProfile[]>([]);
  userSearchQuery = signal('');
  userStatusFilter = signal<string>('all');
  passwordModal = signal(false);
  editingUser = signal<UserProfile | null>(null);
  newPassword = '';
  confirmPassword = '';
  passwordError = '';

  // ─── New User Modal State ────────────────
  newUserModal = signal(false);
  newUserError = '';
  newUser = { name: '', email: '', phone: '', password: '', companyName: '', role: 'user', subscriptionStatus: 'trial', occupation: '' };

  // ─── Activation Modal State ──────────────
  activationModal = signal(false);
  activationUser = signal<UserProfile | null>(null);
  activationMonths = 1;

  // ─── Import State ──────────────────────
  importResults = signal<{ created: number; skipped: number; errors: number } | null>(null);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ─── Enums for template ───────────────────
  readonly appOptions = Object.values(AppSolution);
  readonly statusOptions = Object.values(SubscriptionStatus);
  readonly clientTypeOptions = Object.values(SubscriptionType);
  readonly frequencyOptions = Object.values(PaymentFrequency);
  readonly appLabels = APP_LABELS;
  readonly appIcons = APP_ICONS;
  readonly statusLabels = STATUS_LABELS;
  readonly clientTypeLabels = SUBSCRIPTION_TYPE_LABELS;
  readonly clientTypeIcons = SUBSCRIPTION_TYPE_ICONS;
  readonly frequencyLabels = PAYMENT_FREQUENCY_LABELS;
  readonly currencies: Currency[] = ['COP', 'USD'];

  // ─── Company size labels ──────────────────
  readonly companySizeLabels: Record<string, string> = {
    solo: 'Solo yo',
    micro: '2-10 personas',
    small: '11-50 personas',
    medium: '51-200 personas',
    large: '200+ personas',
  };

  // ─── Computed ─────────────────────────────

  /**
   * Lista unificada: registros formales de suscripción + usuarios activos/prueba
   * que no tienen un registro empresarial propio.
   */
  private allUnified = computed<UnifiedSubscriber[]>(() => {
    const formalSubs = this.subService.getAll();
    const formalEmails = new Set(formalSubs.map(s => s.contact.email.toLowerCase()));

    // Mapear suscripciones formales
    const fromSubs: UnifiedSubscriber[] = formalSubs.map(s => ({
      id: s.id,
      sourceType: 'subscription',
      name: s.company.name,
      email: s.contact.email,
      phone: s.contact.whatsapp || s.contact.phone,
      status: s.status,
      statusLabel: STATUS_LABELS[s.status as SubscriptionStatus] || s.status,
      createdAt: s.createdAt,
      sub: s,
    }));

    // Mapear usuarios activos/prueba que no tienen suscriptor formal
    // Usamos this.userService.allUsers() (signal reactivo) para que el computed
    // se recalcule cuando cambie la lista de usuarios.
    const fromUsers: UnifiedSubscriber[] = this.userService.allUsers()
      .filter(u =>
        u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trial'
      )
      .filter(u => !formalEmails.has((u.email || '').toLowerCase()))
      .map(u => ({
        id: 'user-' + u.id,
        sourceType: 'user' as const,
        name: u.name,
        email: u.email || '',
        phone: u.phone,
        status: (u.subscriptionStatus === 'active' ? 'active' : 'trial') as SubscriptionStatus,
        statusLabel: u.subscriptionStatus === 'active' ? '✅ Activa' : '⏳ Prueba',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        role: u.role,
      }));

    return [...fromSubs, ...fromUsers];
  });

  stats = computed(() => {
    const unified = this.allUnified();
    const activeStatuses = new Set(['ACTIVE', 'active']);
    const trialStatuses  = new Set(['TRIAL',  'trial']);
    const expiredStatuses   = new Set(['EXPIRED',   'expired']);
    const suspendedStatuses = new Set(['SUSPENDED', 'suspended']);

    const active    = unified.filter(u => activeStatuses.has(u.status)).length;
    const trial     = unified.filter(u => trialStatuses.has(u.status)).length;
    const expired   = unified.filter(u => expiredStatuses.has(u.status)).length;
    const suspended = unified.filter(u => suspendedStatuses.has(u.status)).length;

    // Ingresos solo de suscripciones formales
    return {
      total: unified.length,
      active,
      expired,
      trial,
      suspended,
      urgent: this.subService.urgentRenewals(),
      revenueCOP: this.subService.totalRevenueCOP(),
      revenueUSD: this.subService.totalRevenueUSD(),
    };
  });

  userStats = computed(() => this.userService.getSystemStats());

  /** Advanced stats for superadmin dashboard */
  advancedUserStats = computed(() => {
    const users = this.users();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newLast30 = users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
    const activeLastWeek = users.filter(u => u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo).length;
    const churnRisk = users.filter(u => {
      if (!u.lastLogin || u.role === 'superadmin') return false;
      const daysSince = (now.getTime() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 14 && u.isActive;
    }).length;
    const trialExpiringSoon = users.filter(u => {
      if (u.subscriptionStatus !== 'trial') return false;
      const daysLeft = (new Date(u.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    // Total storage
    const storageKeys = this.storageService.getAllKeys('um_');
    let totalBytes = 0;
    storageKeys.forEach(k => {
      const raw = this.storageService.getRaw(k);
      if (raw) totalBytes += raw.length * 2;
    });

    return {
      newLast30,
      activeLastWeek,
      churnRisk,
      trialExpiringSoon,
      totalStorageKB: (totalBytes / 1024).toFixed(1),
      totalStorageMB: (totalBytes / (1024 * 1024)).toFixed(2),
      storageKeys: storageKeys.length,
    };
  });

  filteredSubscriptions = computed(() => {
    const unified = this.allUnified();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    const activeSet    = new Set(['ACTIVE',    'active']);
    const trialSet     = new Set(['TRIAL',     'trial']);
    const expiredSet   = new Set(['EXPIRED',   'expired']);
    const suspendedSet = new Set(['SUSPENDED', 'suspended']);

    return unified.filter(u => {
      const matchQuery = !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone || '').toLowerCase().includes(query);

      let matchStatus = status === 'all';
      if (!matchStatus) {
        if (status === 'ACTIVE')    matchStatus = activeSet.has(u.status);
        else if (status === 'TRIAL')     matchStatus = trialSet.has(u.status);
        else if (status === 'EXPIRED')   matchStatus = expiredSet.has(u.status);
        else if (status === 'SUSPENDED') matchStatus = suspendedSet.has(u.status);
        else matchStatus = u.status === status;
      }
      return matchQuery && matchStatus;
    });
  });

  constructor() {
    if (!this.userService.isSuperAdmin()) {
      this.router.navigate(['/d/dashboard']);
    }
    this.refreshUsers();
  }

  // ─── Detail Panel Actions ─────────────────

  openUserDetail(user: UserProfile): void {
    this.selectedUser.set(user);
  }

  closeUserDetail(): void {
    this.selectedUser.set(null);
  }

  openSubDetail(sub: Subscription): void {
    this.selectedSub.set(sub);
  }

  closeSubDetail(): void {
    this.selectedSub.set(null);
  }

  editFromDetail(): void {
    const sub = this.selectedSub();
    if (sub) {
      this.closeSubDetail();
      this.openEdit(sub);
    }
  }

  // ─── User Detail Helpers ──────────────────

  getDaysSince(iso: string): number {
    const diff = Date.now() - new Date(iso).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  }

  getTrialDaysRemaining(user: UserProfile): number {
    if (!user.trialEndsAt) return 0;
    const diff = new Date(user.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // ─── Subscriber Detail Helpers ────────────

  getMonthlyRevenue(sub: Subscription): number {
    const months = PAYMENT_FREQUENCY_MONTHS[sub.paymentFrequency] || 1;
    return sub.amount / months;
  }

  getLTV(sub: Subscription): number {
    const startDate = new Date(sub.startDate);
    const months = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return this.getMonthlyRevenue(sub) * months;
  }

  getSubscriptionAge(sub: Subscription): string {
    const days = this.getDaysSince(sub.startDate);
    if (days < 30) return `${days} días`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return `${years} año${years > 1 ? 's' : ''}${rem > 0 ? ` ${rem}m` : ''}`;
  }

  getAmbassadorCommissionAmount(sub: Subscription): number {
    if (!sub.ambassadorCommission) return 0;
    return (sub.amount * sub.ambassadorCommission) / 100;
  }

  // ─── Panel Actions ────────────────────────

  openCreate(): void {
    this.form.set(this.emptyForm());
    this.editingId.set(null);
    this.panelMode.set('create');
  }

  openEdit(sub: Subscription): void {
    this.form.set({
      companyName: sub.company.name,
      companyNit: sub.company.nit,
      contactName: sub.contact.name,
      contactEmail: sub.contact.email,
      contactWhatsapp: sub.contact.whatsapp,
      contactPhone: sub.contact.phone || '',
      app: sub.app,
      status: sub.status,
      clientType: sub.clientType || SubscriptionType.PERSONA,
      startDate: sub.startDate,
      nextRenewalDate: sub.nextRenewalDate,
      lastPaymentDate: sub.lastPaymentDate,
      amount: sub.amount,
      paymentFrequency: sub.paymentFrequency || PaymentFrequency.MONTHLY,
      currency: sub.currency,
      notes: sub.notes || '',
      ambassadorName: sub.ambassadorName || '',
      ambassadorCommission: sub.ambassadorCommission || 0,
      storageUsedMB: sub.storageUsedMB || 0,
      storageLimitMB: sub.storageLimitMB || 100,
    });
    this.editingId.set(sub.id);
    this.panelMode.set('edit');
  }

  closePanel(): void {
    this.panelMode.set('closed');
    this.editingId.set(null);
  }

  // ─── Subscription CRUD ─────────────────────

  saveSubscription(): void {
    const f = this.form();
    if (!f.companyName.trim() || !f.contactEmail.trim()) return;

    const subData = {
      company: { name: f.companyName, nit: f.companyNit } as CompanyInfo,
      contact: { name: f.contactName, email: f.contactEmail, whatsapp: f.contactWhatsapp, phone: f.contactPhone } as CompanyContact,
      app: f.app as AppSolution,
      status: f.status as SubscriptionStatus,
      clientType: f.clientType as SubscriptionType,
      startDate: f.startDate,
      nextRenewalDate: f.nextRenewalDate,
      lastPaymentDate: f.lastPaymentDate,
      amount: Number(f.amount),
      paymentFrequency: f.paymentFrequency as PaymentFrequency,
      currency: f.currency as Currency,
      notes: f.notes || undefined,
      ambassadorName: f.ambassadorName || undefined,
      ambassadorCommission: f.ambassadorCommission ? Number(f.ambassadorCommission) : undefined,
      storageUsedMB: Number(f.storageUsedMB) || 0,
      storageLimitMB: Number(f.storageLimitMB) || 100,
    };

    if (this.panelMode() === 'edit' && this.editingId()) {
      this.subService.update(this.editingId()!, subData);
      this.showToast('✅ Suscripción actualizada');
    } else {
      this.subService.create(subData);
      this.showToast('✅ Suscripción creada');
    }

    this.closePanel();
  }

  deleteSubFromDetail(): void {
    const sub = this.selectedSub();
    if (sub && confirm(`¿Eliminar la suscripción de "${sub.company.name}"? Esta acción no se puede deshacer.`)) {
      this.subService.delete(sub.id);
      this.closeSubDetail();
      this.showToast('🗑️ Suscripción eliminada');
    }
  }

  deleteSub(sub: Subscription): void {
    if (confirm(`¿Eliminar la suscripción de "${sub.company.name}"? Esta acción no se puede deshacer.`)) {
      this.subService.delete(sub.id);
      this.showToast('🗑️ Suscripción eliminada');
    }
  }

  // ─── User Management ─────────────────────

  async refreshUsers(): Promise<void> {
    await this.dataSyncService.syncFromServer();
    this.users.set(this.userService.getAllUsers());
  }

  /** All people: users from UserService + subscribers from SubscriptionService
   *  that don't have a matching user account. */
  private allPeople = computed<UserProfile[]>(() => {
    const users = this.users();
    const userEmails = new Set(users.map(u => (u.email || '').toLowerCase()));

    // Convert formal subscriptions (without a user account) into UserProfile-like objects
    const subsAsUsers: UserProfile[] = this.subService.getAll()
      .filter(s => !userEmails.has(s.contact.email.toLowerCase()))
      .map(s => ({
        id: 'sub-' + s.id,
        name: s.contact.name || s.company.name,
        email: s.contact.email,
        phone: s.contact.whatsapp || s.contact.phone || '',
        role: 'user' as const,
        isActive: (s.status as string) === 'ACTIVE' || (s.status as string) === 'active',
        createdAt: s.createdAt,
        lastLogin: undefined as any,
        subscriptionStatus: ((s.status as string) === 'ACTIVE' ? 'active' : (s.status as string) === 'TRIAL' ? 'trial' : 'expired') as any,
        trialEndsAt: s.nextRenewalDate || '',
        subscriptionActivatedByAdmin: false,
        companyName: s.company.name,
        occupation: '',
        age: undefined as any,
        companySize: undefined as any,
        password: '',
      }));

    return [...users, ...subsAsUsers];
  });

  // ─── Advanced Filters State ────────────────
  showAdvancedFilters = signal(false);
  filterDepartment = signal('');
  filterCity = signal('');
  filterRole = signal('');
  filterActivity = signal('');
  filterSortOrder = signal('newest');

  readonly departmentsList = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  filteredUsers = computed(() => {
    const all = this.allPeople();
    const query = this.userSearchQuery().toLowerCase().trim();
    const filter = this.userStatusFilter();

    // Advanced filters
    const dept = this.filterDepartment();
    const city = this.filterCity().toLowerCase().trim();
    const role = this.filterRole();
    const activity = this.filterActivity();
    const sortOrder = this.filterSortOrder();

    let result = all.filter(u => {
      // 1. Query general
      const matchQuery = !query ||
        u.name.toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.phone || '').toLowerCase().includes(query) ||
        (u.companyName || '').toLowerCase().includes(query);

      if (!matchQuery) return false;

      // 2. Chip de Estado principal
      let matchStatus = filter === 'all';
      if (!matchStatus) {
        if (filter === 'active') matchStatus = u.isActive && u.subscriptionStatus === 'active';
        else if (filter === 'trial') matchStatus = u.subscriptionStatus === 'trial';
        else if (filter === 'expired') matchStatus = u.subscriptionStatus === 'expired';
        else if (filter === 'inactive') matchStatus = !u.isActive;
        else if (filter === 'churn-risk') {
          if (!u.lastLogin || u.role === 'superadmin') { matchStatus = false; }
          else {
            const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
            matchStatus = daysSince > 14 && u.isActive;
          }
        }
      }
      if (!matchStatus) return false;

      // 3. Filtro de Departamento
      if (dept && u.department !== dept) return false;

      // 4. Filtro de Ciudad
      if (city && !(u.city || '').toLowerCase().includes(city)) return false;

      // 5. Filtro de Rol
      if (role && u.role !== role) return false;

      // 6. Filtro de Actividad Reciente
      if (activity) {
        if (!u.lastLogin) return false;
        const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
        if (activity === 'today' && daysSince > 1) return false;
        if (activity === 'week' && daysSince > 7) return false;
        if (activity === 'inactive-14' && daysSince <= 14) return false;
      }

      return true;
    });

    // 7. Ordenación
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return result;
  });

  // ─── Engagement & Churn Helpers ─────────────

  /** Days since last login */
  getDaysSinceLogin(lastLogin?: string): number {
    if (!lastLogin) return -1;
    return Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
  }

  /** Engagement label based on last login */
  getEngagementLabel(lastLogin?: string): string {
    const days = this.getDaysSinceLogin(lastLogin);
    if (days < 0) return 'Sin datos';
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days <= 3) return `${days}d — Alto`;
    if (days <= 7) return `${days}d — Medio`;
    if (days <= 14) return `${days}d — Bajo`;
    return `${days}d — Riesgo`;
  }

  /** Engagement CSS class */
  getEngagementClass(lastLogin?: string): string {
    const days = this.getDaysSinceLogin(lastLogin);
    if (days < 0) return 'no-data';
    if (days <= 3) return 'high';
    if (days <= 7) return 'medium';
    if (days <= 14) return 'low';
    return 'churn-risk';
  }

  /** Days remaining in trial */
  getTrialDaysLeft(user: UserProfile): number {
    if (user.subscriptionStatus !== 'trial') return -1;
    return Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  /** Trial days label */
  getTrialLabel(user: UserProfile): string {
    const days = this.getTrialDaysLeft(user);
    if (days < 0 && user.subscriptionStatus !== 'trial') return '—';
    if (days <= 0) return '⚠️ Expirado';
    if (days <= 3) return `🔴 ${days}d`;
    if (days <= 7) return `🟠 ${days}d`;
    return `🟢 ${days}d`;
  }

  // ─── Export ───────────────────────────

  exportUsersCSV(): void {
    const users = this.filteredUsers();
    const headers = ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Suscripción', 'Estado', 'Creado', 'Último Acceso', 'Empresa', 'Días Trial'];
    const rows = users.map(u => [
      u.name,
      u.email || '',
      u.phone || '',
      this.getRoleLabel(u.role),
      u.subscriptionStatus || 'trial',
      u.isActive ? 'Activo' : 'Inactivo',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '',
      u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-CO') : 'Nunca',
      u.companyName || '',
      String(this.getTrialDaysLeft(u)),
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_actuaya_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('📄 Usuarios exportados a CSV');
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      user: 'Usuario',
    };
    return labels[role] || role;
  }

  getUserSubStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      trial: '⏳ Prueba 30d',
      active: '✅ Activa',
      expired: '❌ Expirada',
    };
    return labels[status || 'trial'] || '⏳ Prueba 30d';
  }

  // ─── Activation Modal Methods ──────────────

  openActivationModal(user: UserProfile): void {
    this.activationUser.set(user);
    this.activationMonths = 1;
    this.activationModal.set(true);
  }

  closeActivationModal(): void {
    this.activationModal.set(false);
    this.activationUser.set(null);
  }

  confirmActivation(indefinite: boolean = false): void {
    const user = this.activationUser();
    if (!user) return;

    const months = indefinite ? undefined : this.activationMonths;
    this.mockSubService.activateSubscription(user.id, months);
    this.refreshUsers();

    // Refresh the detail panel with updated user data
    const updatedUser = this.userService.getUserById(user.id);
    if (updatedUser) {
      this.selectedUser.set(updatedUser);
    }

    // CRITICAL: Save to server IMMEDIATELY to prevent data loss on page reload
    this.dataSyncService.saveToServer();

    this.closeActivationModal();
    const durationLabel = months ? `por ${months} mes(es)` : 'indefinidamente';
    this.showToast(`💎 Suscripción activada ${durationLabel} para ${user.name}`);
  }

  activateUserSubscription(user: UserProfile): void {
    this.openActivationModal(user);
  }

  deactivateUserSubscription(user: UserProfile): void {
    if (confirm(`¿Desactivar la suscripción de "${user.name}"? Pasará a estado "Expirada".`)) {
      this.mockSubService.deactivateSubscription(user.id);
      this.refreshUsers();

      // Refresh the detail panel with updated user data
      const updatedUser = this.userService.getUserById(user.id);
      if (updatedUser) {
        this.selectedUser.set(updatedUser);
      } else {
        this.closeUserDetail();
      }

      // CRITICAL: Save to server IMMEDIATELY
      this.dataSyncService.saveToServer();

      this.showToast('⏸️ Suscripción desactivada para ' + user.name);
    }
  }

  toggleUserActive(user: UserProfile): void {
    this.userService.toggleUserActive(user.id);
    this.refreshUsers();
    this.closeUserDetail();
    this.dataSyncService.saveToServer();
    this.showToast(user.isActive ? '🚫 Usuario desactivado' : '✅ Usuario activado');
  }

  deleteUser(user: UserProfile): void {
    if (confirm(`¿Eliminar al usuario "${user.name}" permanentemente?`)) {
      this.userService.deleteUser(user.id);
      this.refreshUsers();
      this.closeUserDetail();
      this.dataSyncService.saveToServer();
      this.showToast('🗑️ Usuario eliminado');
    }
  }

  openPasswordModal(user: UserProfile): void {
    this.editingUser.set(user);
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
    this.passwordModal.set(true);
  }

  closePasswordModal(): void {
    this.passwordModal.set(false);
    this.editingUser.set(null);
  }

  changePassword(): void {
    const user = this.editingUser();
    if (!user) return;

    if (this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }

    this.userService.updateUserPassword(user.id, this.newPassword);
    this.closePasswordModal();
    this.refreshUsers();
    this.dataSyncService.saveToServer();
    this.showToast('🔑 Contraseña actualizada');
  }

  // ─── Shared Helpers ──────────────────────

  getAvatarInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#00b894', '#0984e3', '#6c5ce7', '#e84393', '#fdcb6e', '#e17055', '#00cec9'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getRenewalHealth(date: string): RenewalHealth {
    return this.subService.calculateRenewalHealth(date);
  }

  getRenewalClass(health: RenewalHealth): string {
    if (health.isOverdue) return 'overdue';
    if (health.isCritical) return 'critical';
    if (health.isUrgent) return 'urgent';
    return 'healthy';
  }

  formatCurrency(amount: number, currency: Currency): string {
    if (currency === 'COP') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  formatDateLong(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
  }

  getStoragePercent(used: number, limit: number): number {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  }

  getStorageClass(percent: number): string {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warn';
    return '';
  }

  /** Calculate storage used by a specific user (in KB) based on localStorage keys */
  getUserStorageKB(userId: string): string {
    const keys = this.storageService.getAllKeys('um_');
    let totalBytes = 0;
    for (const key of keys) {
      const raw = this.storageService.getRaw(key);
      if (raw) {
        // Check if data belongs to this user by looking for userId reference
        // Since all users share the same localStorage, we calculate proportionally
        totalBytes += raw.length * 2; // 2 bytes per UTF-16 char
      }
    }
    // Divide evenly among users as an approximation
    const userCount = Math.max(this.userService.getAllUsers().length, 1);
    const userBytes = totalBytes / userCount;
    return (userBytes / 1024).toFixed(1);
  }

  /** Storage percent for a user (max 500KB as reference limit) */
  getUserStoragePercent(userId: string): number {
    const kb = parseFloat(this.getUserStorageKB(userId));
    const limitKB = 500; // 500 KB reference limit per user
    return Math.min((kb / limitKB) * 100, 100);
  }

  isFormValid(): boolean {
    const f = this.form();
    return !!(f.companyName?.trim() && f.contactEmail?.trim() && f.startDate && f.nextRenewalDate && f.amount > 0);
  }

  private emptyForm() {
    return {
      companyName: '',
      companyNit: '',
      contactName: '',
      contactEmail: '',
      contactWhatsapp: '',
      contactPhone: '',
      app: AppSolution.ACTUAYA,
      status: SubscriptionStatus.TRIAL,
      clientType: SubscriptionType.PERSONA,
      startDate: new Date().toISOString().split('T')[0],
      nextRenewalDate: '',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentFrequency: PaymentFrequency.MONTHLY,
      currency: 'COP' as Currency,
      notes: '',
      ambassadorName: '',
      ambassadorCommission: 0,
      storageUsedMB: 0,
      storageLimitMB: 100,
    };
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }

  // ─── New User Modal ────────────────────

  openNewUserModal(): void {
    this.newUser = { name: '', email: '', phone: '', password: '', companyName: '', role: 'user', subscriptionStatus: 'trial', occupation: '' };
    this.newUserError = '';
    this.newUserModal.set(true);
  }

  closeNewUserModal(): void {
    this.newUserModal.set(false);
  }

  saveNewUser(): void {
    const { name, email, phone, password } = this.newUser;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      this.newUserError = 'Nombre, correo y teléfono son obligatorios';
      return;
    }
    if (password.length < 6) {
      this.newUserError = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    // Check for duplicate email
    const existing = this.userService.getAllUsers().find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (existing) {
      this.newUserError = `Ya existe un usuario con el correo ${email}`;
      return;
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const profile: Partial<UserProfile> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      companyName: this.newUser.companyName.trim() || undefined,
      occupation: this.newUser.occupation.trim() || undefined,
      role: this.newUser.role as any,
      subscriptionStatus: this.newUser.subscriptionStatus as any,
      subscriptionActivatedByAdmin: this.newUser.subscriptionStatus === 'active',
      trialEndsAt: trialEnd.toISOString(),
    };

    // Create via admin method (does NOT overwrite active profile)
    this.userService.adminCreateUser(profile);
    this.closeNewUserModal();
    this.refreshUsers();
    this.dataSyncService.saveToServer();
    this.showToast(`✅ Usuario "${name}" creado exitosamente`);
  }

  // ─── CSV Import ───────────────────────

  triggerImportFile(): void {
    this.fileInput?.nativeElement?.click();
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.processCSV(text);
      // Reset input so same file can be re-imported
      input.value = '';
    };
    reader.readAsText(file);
  }

  private processCSV(text: string): void {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      this.showToast('⚠️ El archivo está vacío o no tiene datos');
      return;
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = this.parseCSVLine(lines[0], separator).map(h => h.toLowerCase().trim());

    // Map columns
    const nameIdx = headers.findIndex(h => h.includes('nombre') || h === 'name');
    const emailIdx = headers.findIndex(h => h.includes('correo') || h.includes('email') || h.includes('mail'));
    const phoneIdx = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('whatsapp') || h.includes('celular'));
    const companyIdx = headers.findIndex(h => h.includes('empresa') || h.includes('company') || h.includes('compañ'));
    const roleIdx = headers.findIndex(h => h.includes('rol') || h === 'role');
    const passwordIdx = headers.findIndex(h => h.includes('contrase') || h.includes('password') || h.includes('clave'));

    if (nameIdx < 0 || emailIdx < 0) {
      this.showToast('❌ El CSV debe tener columnas "nombre" y "correo" (o "email")');
      return;
    }

    const existingEmails = new Set(this.userService.getAllUsers().map(u => (u.email || '').toLowerCase()));
    let created = 0, skipped = 0, errors = 0;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = this.parseCSVLine(lines[i], separator);
        const name = (cols[nameIdx] || '').trim();
        const email = (cols[emailIdx] || '').trim().toLowerCase();
        const phone = phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '';
        const company = companyIdx >= 0 ? (cols[companyIdx] || '').trim() : '';
        const role = roleIdx >= 0 ? (cols[roleIdx] || 'user').trim().toLowerCase() : 'user';
        const password = passwordIdx >= 0 ? (cols[passwordIdx] || '').trim() : 'Actua2025!';

        if (!name || !email) { errors++; continue; }
        if (existingEmails.has(email)) { skipped++; continue; }

        const profile: Partial<UserProfile> = {
          name,
          email,
          phone: phone || undefined,
          password,
          companyName: company || undefined,
          role: (role === 'admin' ? 'admin' : 'user') as any,
          subscriptionStatus: 'trial' as any,
          trialEndsAt: trialEnd,
        };
        this.userService.adminCreateUser(profile);
        existingEmails.add(email);
        created++;
      } catch {
        errors++;
      }
    }

    this.refreshUsers();
    this.importResults.set({ created, skipped, errors });
  }

  /** Parse a single CSV line respecting quoted fields */
  private parseCSVLine(line: string, sep: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  }
}
