import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EducationService, EDUCATION_EXPENSE_CATEGORIES } from '../../../../core/services/education.service';
import { CurrencyInputDirective } from '../../../../shared/directives/currency-input.directive';

@Component({
  selector: 'um-education-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, RouterLink, CurrencyInputDirective],
  template: `
    @if (program()) {
      <div class="admin-page">
        <div class="page-header animate-fadeInUp">
          <div>
            <a routerLink="/d/admin/education" class="back-link">← Volver a Proyectos Educativos</a>
            <h1>{{ program()?.name }}</h1>
            <p class="subtitle">{{ program()?.description || 'Sin descripción' }}</p>
          </div>
          <div class="header-totals">
            <div class="total-badge green">
              <span class="total-label">Ingresos</span>
              <span class="total-value">\${{ stats()?.income | number:'1.0-0' }}</span>
            </div>
            <div class="total-badge red">
              <span class="total-label">Gastos</span>
              <span class="total-value">\${{ stats()?.expense | number:'1.0-0' }}</span>
            </div>
            <div class="total-badge" [class.positive]="profit() >= 0" [class.negative]="profit() < 0">
              <span class="total-label">Rentabilidad</span>
              <span class="total-value">\${{ profit() | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <div class="tabs animate-fadeInUp stagger-1">
          <button [class.active]="activeTab === 'income'" (click)="activeTab = 'income'">Ingresos</button>
          <button [class.active]="activeTab === 'expenses'" (click)="activeTab = 'expenses'">Gastos</button>
        </div>

        <!-- INCOME TAB -->
        @if (activeTab === 'income') {
          <div class="tab-content animate-fadeInUp stagger-2">
            <div class="form-card">
              <h3>Registrar Ingreso</h3>
              <form class="inline-form" (ngSubmit)="addIncome()">
                <div class="form-field">
                  <label>Tipo de Ingreso</label>
                  <select [(ngModel)]="newIncType" name="incType" required>
                    <option value="per_person">Inscripción por persona</option>
                    <option value="global">Pago global (Organización)</option>
                  </select>
                </div>
                
                @if (newIncType === 'per_person') {
                  <div class="form-field" style="max-width: 100px;">
                    <label>No. Inscritos</label>
                    <input type="number" [(ngModel)]="newIncAttendees" name="attendees" placeholder="Ej. 1" min="1" />
                  </div>
                }

                <div class="form-field">
                  <label>Monto Total (COP)</label>
                  <input umCurrencyInput [(ngModel)]="newIncAmount" name="incAmount" placeholder="0" required />
                </div>

                <div class="form-field flex-2">
                  <label>Descripción (Opcional)</label>
                  <input type="text" [(ngModel)]="newIncDesc" name="incDesc" placeholder="Detalles del ingreso..." />
                </div>

                <div class="form-field" style="max-width: 150px;">
                  <label>Fecha</label>
                  <input type="date" [(ngModel)]="newIncDate" name="incDate" required />
                </div>

                <button type="submit" class="btn-add" [disabled]="!canSubmitIncome">+ Agregar</button>
              </form>
            </div>

            <div class="table-wrap">
              @if (incomes().length) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Inscritos</th>
                      <th class="right">Monto Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (inc of incomes(); track inc.id) {
                      <tr>
                        <td>{{ inc.date | date:'dd/MM/yyyy' }}</td>
                        <td>
                          <span class="type-tag" [class]="inc.type">
                            {{ inc.type === 'per_person' ? 'Por Persona' : 'Global' }}
                          </span>
                        </td>
                        <td>{{ inc.description || '—' }}</td>
                        <td>{{ inc.attendeesCount || '—' }}</td>
                        <td class="right mono positive">\${{ inc.amount | number:'1.0-0' }}</td>
                        <td class="actions-cell">
                          <button class="btn-delete" (click)="educationService.deleteIncome(inc.id)">✕</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="empty">No hay ingresos registrados para este programa.</div>
              }
            </div>
          </div>
        }

        <!-- EXPENSES TAB -->
        @if (activeTab === 'expenses') {
          <div class="tab-content animate-fadeInUp stagger-2">
            <div class="form-card">
              <h3>Registrar Gasto</h3>
              <form class="inline-form" (ngSubmit)="addExpense()">
                <div class="form-field">
                  <label>Categoría</label>
                  <select [(ngModel)]="newExpCategory" name="expCat" required>
                    <option value="">Seleccionar...</option>
                    @for (cat of expCategories; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>

                <div class="form-field">
                  <label>Monto Total (COP)</label>
                  <input umCurrencyInput [(ngModel)]="newExpAmount" name="expAmount" placeholder="0" required />
                </div>

                <div class="form-field flex-2">
                  <label>Descripción</label>
                  <input type="text" [(ngModel)]="newExpDesc" name="expDesc" placeholder="Concepto del gasto..." required />
                </div>

                <div class="form-field" style="max-width: 150px;">
                  <label>Fecha</label>
                  <input type="date" [(ngModel)]="newExpDate" name="expDate" required />
                </div>

                <button type="submit" class="btn-add red-btn" [disabled]="!canSubmitExpense">+ Agregar</button>
              </form>
            </div>

            <div class="table-wrap">
              @if (expenses().length) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th class="right">Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (exp of expenses(); track exp.id) {
                      <tr>
                        <td>{{ exp.date | date:'dd/MM/yyyy' }}</td>
                        <td><span class="type-tag tag-expense">{{ exp.category }}</span></td>
                        <td>{{ exp.description }}</td>
                        <td class="right mono negative">\${{ exp.amount | number:'1.0-0' }}</td>
                        <td class="actions-cell">
                          <button class="btn-delete" (click)="educationService.deleteExpense(exp.id)">✕</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="empty">No hay gastos registrados para este programa.</div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="admin-page">
        <div class="empty">Cargando o programa no encontrado...</div>
      </div>
    }
  `,
  styleUrl: 'education-detail.scss'
})
export class EducationDetailComponent implements OnInit {
  educationService = inject(EducationService);
  route = inject(ActivatedRoute);

  programId = '';
  activeTab: 'income' | 'expenses' = 'income';
  expCategories = EDUCATION_EXPENSE_CATEGORIES;

  // Income form
  newIncType: 'per_person' | 'global' = 'per_person';
  newIncAmount: number | null = null;
  newIncAttendees: number | null = 1;
  newIncDesc = '';
  newIncDate = new Date().toISOString().substring(0, 10);

  // Expense form
  newExpCategory = '';
  newExpAmount: number | null = null;
  newExpDesc = '';
  newExpDate = new Date().toISOString().substring(0, 10);

  program = computed(() => this.educationService.programs().find(p => p.id === this.programId));
  stats = computed(() => this.educationService.programStats().get(this.programId));
  profit = computed(() => (this.stats()?.income || 0) - (this.stats()?.expense || 0));

  incomes = computed(() => this.educationService.incomes().filter(i => i.programId === this.programId).sort((a, b) => b.date.localeCompare(a.date)));
  expenses = computed(() => this.educationService.expenses().filter(e => e.programId === this.programId).sort((a, b) => b.date.localeCompare(a.date)));

  ngOnInit() {
    this.programId = this.route.snapshot.paramMap.get('id') || '';
  }

  get canSubmitIncome() {
    return this.newIncAmount && this.newIncAmount > 0 && this.newIncDate;
  }

  get canSubmitExpense() {
    return this.newExpCategory && this.newExpAmount && this.newExpAmount > 0 && this.newExpDesc && this.newExpDate;
  }

  addIncome() {
    if (!this.canSubmitIncome) return;
    this.educationService.addIncome({
      programId: this.programId,
      type: this.newIncType,
      amount: this.newIncAmount!,
      attendeesCount: this.newIncType === 'per_person' ? this.newIncAttendees || 1 : undefined,
      description: this.newIncDesc.trim(),
      date: this.newIncDate
    });
    this.newIncAmount = null;
    this.newIncDesc = '';
    this.newIncAttendees = 1;
  }

  addExpense() {
    if (!this.canSubmitExpense) return;
    this.educationService.addExpense({
      programId: this.programId,
      category: this.newExpCategory,
      amount: this.newExpAmount!,
      description: this.newExpDesc.trim(),
      date: this.newExpDate
    });
    this.newExpCategory = '';
    this.newExpAmount = null;
    this.newExpDesc = '';
  }
}
