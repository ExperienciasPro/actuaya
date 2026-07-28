import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { POSService } from '../../../core/services/pos.service';
import { UserService } from '../../../core/services/user.service';
import { CashAuditEntry } from '../../../core/models/pos.model';

@Component({
  selector: 'um-pos-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pos-audit-page">
      <div class="page-header animate-fadeInUp">
        <h1>Auditoría de Caja</h1>
        <p class="header-subtitle">Control y trazabilidad de sesiones y movimientos de POS.</p>
      </div>

      <div class="filters-card animate-fadeInUp">
        <div class="filter-group">
          <label>Desde</label>
          <input type="date" [(ngModel)]="startDate" (change)="loadData()" />
        </div>
        <div class="filter-group">
          <label>Hasta</label>
          <input type="date" [(ngModel)]="endDate" (change)="loadData()" />
        </div>
        <div class="filter-group">
          <label>Empleado</label>
          <select [(ngModel)]="selectedUserId" (change)="loadData()">
            <option value="all">Todos los empleados</option>
            @for (user of users(); track user.id) {
              <option [value]="user.id">{{ user.name }}</option>
            }
          </select>
        </div>
      </div>

      <div class="kpi-grid animate-fadeInUp stagger-1">
        <div class="kpi-card">
          <span class="kpi-label">Sesiones Cerradas</span>
          <span class="kpi-value">{{ reportData().length }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Descuadre Total</span>
          <span class="kpi-value" [class.negative]="totalDifference() < 0" [class.positive]="totalDifference() > 0">
            {{ totalDifference() | currency:'COP':'symbol-narrow':'1.0-0' }}
          </span>
        </div>
      </div>

      <div class="audit-list animate-fadeInUp stagger-2">
        @if (reportData().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📁</span>
            <p>No hay sesiones de caja para los filtros seleccionados.</p>
          </div>
        } @else {
          <table class="audit-table">
            <thead>
              <tr>
                <th>Fecha/Hora Cierre</th>
                <th>Empleado</th>
                <th class="text-right">Apertura</th>
                <th class="text-right">Ventas</th>
                <th class="text-right">Esperado</th>
                <th class="text-right">Real (Cierre)</th>
                <th class="text-right">Diferencia</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of reportData(); track entry.sessionId) {
                <tr>
                  <td>{{ entry.closedAt | date:'short' }}</td>
                  <td>{{ entry.userName }}</td>
                  <td class="text-right">{{ entry.openingCash | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="text-right">{{ entry.totalSales | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="text-right">{{ entry.expectedCash | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="text-right">{{ entry.closingCash | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="text-right">
                    <span class="diff-badge" 
                          [class.ok]="entry.difference === 0"
                          [class.warn]="entry.difference !== 0 && entry.difference >= -5000 && entry.difference <= 5000"
                          [class.danger]="entry.difference < -5000 || entry.difference > 5000">
                      {{ entry.difference | currency:'COP':'symbol-narrow':'1.0-0' }}
                    </span>
                  </td>
                  <td class="notes-cell" [title]="entry.notes || ''">
                    {{ entry.notes || '-' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styleUrl: './pos-audit.scss'
})
export class PosAuditComponent {
  private posService = inject(POSService);
  private userService = inject(UserService);

  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedUserId = signal<string>('all');

  users = this.userService.allUsers;

  reportData = computed(() => {
    let data = this.posService.auditReport(this.startDate(), this.endDate());
    if (this.selectedUserId() !== 'all') {
      data = data.filter(s => s.userId === this.selectedUserId());
    }
    // Sort by most recent closing date
    return data.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  });

  totalDifference = computed(() => {
    return this.reportData().reduce((sum, s) => sum + s.difference, 0);
  });

  loadData() {
    // Computed property will automatically react to signal changes
  }

  private getDefaultStartDate(): string {
    const d = new Date();
    d.setDate(1); // Start of month
    return d.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
