import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EducationService, EDUCATION_PROGRAM_TYPES, EducationalProgram } from '../../core/services/education.service';
import { UserService } from '../../core/services/user.service';
import { Title } from '@angular/platform-browser';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'um-education-report',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, BaseChartDirective],
  template: `
    <div class="public-report-layout">
      <!-- Decorator elements for premium look -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      
      <div class="container animate-fadeInUp">
        <header class="report-header glass-panel">
          <div class="brand">
            @if (companyLogo()) {
              <img [src]="companyLogo()" alt="Company Logo" class="brand-logo" />
            } @else {
              <span class="brand-icon">🎓</span>
            }
            <div class="brand-text">
              <h1>Proyectos Educativos</h1>
              <p>Reporte Financiero</p>
            </div>
          </div>
          <div class="header-controls">
            <div class="year-selector">
              <label>Año de análisis</label>
              <select [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event * 1)">
                @for (year of availableYears(); track year) {
                  <option [value]="year">{{ year }}</option>
                }
              </select>
            </div>
          </div>
        </header>

        <section class="kpi-section">
          <div class="kpi-card glass-panel highlight">
            <div class="kpi-label">Rentabilidad Neta</div>
            <div class="kpi-value" [class.profit]="yearlyStats().netProfit >= 0" [class.loss]="yearlyStats().netProfit < 0">
              \${{ yearlyStats().netProfit | number:'1.0-0' }}
            </div>
          </div>
          <div class="kpi-card glass-panel">
            <div class="kpi-label">Ingresos Totales ({{ selectedYear() }})</div>
            <div class="kpi-value">\${{ yearlyStats().totalIncome | number:'1.0-0' }}</div>
          </div>
          <div class="kpi-card glass-panel">
            <div class="kpi-label">Gastos Totales ({{ selectedYear() }})</div>
            <div class="kpi-value">\${{ yearlyStats().totalExpense | number:'1.0-0' }}</div>
          </div>
          <div class="kpi-card glass-panel">
            <div class="kpi-label">Inscritos Totales</div>
            <div class="kpi-value">{{ yearlyStats().totalAttendees }}</div>
          </div>
          <div class="kpi-card glass-panel">
            <div class="kpi-label">Programas Realizados</div>
            <div class="kpi-value">{{ yearlyStats().programs.length }}</div>
          </div>
        </section>

        <!-- Charts Section -->
        <section class="charts-section">
          <div class="chart-card glass-panel">
            <h3 class="chart-title">Programas más rentables</h3>
            <div class="chart-container">
              <canvas baseChart
                [data]="profitChartData()"
                [options]="profitChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>
          <div class="chart-card glass-panel">
            <h3 class="chart-title">Inscripciones globales por mes</h3>
            <div class="chart-container">
              <canvas baseChart
                [data]="attendeesChartData()"
                [options]="attendeesChartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>
        </section>

        <section class="programs-section">
          <h2 class="section-title">Desempeño por Programa</h2>
          
          <div class="programs-grid">
            @for (prog of yearlyStats().programs; track prog.id) {
              <div class="program-card glass-panel animate-fadeInUp" [style.animation-delay]="'0.' + ($index * 1) + 's'">
                <div class="card-header">
                  <div>
                    <span class="badge" [class.tag-course]="prog.type === 'course'" [class.tag-workshop]="prog.type === 'workshop'" [class.tag-diploma]="prog.type === 'diploma'">
                      {{ getTypeLabel(prog.type) }}
                    </span>
                    <span class="status-badge" [class.completed]="prog.status === 'completed'">
                      {{ prog.status === 'active' ? 'Activo' : 'Finalizado' }}
                    </span>
                  </div>
                </div>
                
                <h3 class="program-title">{{ prog.name }}</h3>
                @if (prog.description) {
                  <p class="program-desc">{{ prog.description }}</p>
                }
                
                <div class="program-stats">
                  <div class="stat-item">
                    <span class="sl">Ingresos</span>
                    <span class="sv">\${{ prog.income | number:'1.0-0' }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="sl">Gastos</span>
                    <span class="sv">\${{ prog.expense | number:'1.0-0' }}</span>
                  </div>
                  <div class="stat-item highlight-stat">
                    <span class="sl">Ganancia</span>
                    <span class="sv" [class.profit]="prog.profit >= 0" [class.loss]="prog.profit < 0">
                      \${{ prog.profit | number:'1.0-0' }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="sl">Inscritos</span>
                    <span class="sv">{{ prog.attendees }}</span>
                  </div>
                </div>
              </div>
            }
            @if (yearlyStats().programs.length === 0) {
              <div class="empty-state glass-panel">
                <span class="empty-icon">📊</span>
                <p>No hay datos financieros registrados para el año {{ selectedYear() }}.</p>
              </div>
            }
          </div>
        </section>
        
        <footer class="report-footer">
          <p>Reporte Financiero de Proyectos Educativos generado automáticamente.</p>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './education-report.scss'
})
export class EducationReportComponent implements OnInit {
  educationService = inject(EducationService);
  userService = inject(UserService);
  titleService = inject(Title);
  
  selectedYear = signal<number>(new Date().getFullYear());
  companyLogo = computed(() => this.userService.profile()?.companyLogo);

  // Common chart options for a dark theme
  commonChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#94a3b8',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: { 
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: { 
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  profitChartOptions: ChartConfiguration<'bar'>['options'] = {
    ...this.commonChartOptions,
    scales: {
      ...this.commonChartOptions.scales,
      y: {
        ...this.commonChartOptions.scales?.['y'],
        ticks: {
          ...this.commonChartOptions.scales?.['y']?.ticks,
          callback: (value: any) => '$' + value
        }
      }
    }
  };

  attendeesChartOptions: ChartConfiguration<'line'>['options'] = {
    ...this.commonChartOptions,
    scales: {
      ...this.commonChartOptions.scales,
      y: {
        ...this.commonChartOptions.scales?.['y'],
        beginAtZero: true,
        ticks: {
          ...this.commonChartOptions.scales?.['y']?.ticks,
          stepSize: 1
        }
      }
    },
    plugins: {
      ...this.commonChartOptions.plugins,
      tooltip: {
        ...this.commonChartOptions.plugins?.tooltip,
        callbacks: {
          label: (context) => context.parsed.y + ' inscritos'
        }
      }
    }
  };

  ngOnInit() {
    this.titleService.setTitle('Reporte Financiero | Proyectos Educativos');
    
    // Auto-select most recent year if current year has no data but other years do
    const years = this.availableYears();
    if (years.length > 0 && !years.includes(this.selectedYear())) {
      this.selectedYear.set(Math.max(...years));
    }
  }

  getTypeLabel(type: string): string {
    return EDUCATION_PROGRAM_TYPES.find(t => t.value === type)?.label || type;
  }

  availableYears = computed(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear); // Always include current year
    
    this.educationService.incomes().forEach(i => {
      if (i.date) years.add(new Date(i.date).getFullYear());
    });
    this.educationService.expenses().forEach(e => {
      if (e.date) years.add(new Date(e.date).getFullYear());
    });
    
    return Array.from(years).sort((a, b) => b - a); // Descending
  });

  yearlyStats = computed(() => {
    const year = this.selectedYear();
    
    const incomes = this.educationService.incomes().filter(i => new Date(i.date).getFullYear() === year);
    const expenses = this.educationService.expenses().filter(e => new Date(e.date).getFullYear() === year);
    
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpense;
    
    let totalAttendees = 0;
    const programData = new Map<string, { income: number; expense: number; attendees: number }>();
    
    incomes.forEach(i => {
      if (!programData.has(i.programId)) programData.set(i.programId, { income: 0, expense: 0, attendees: 0 });
      const pd = programData.get(i.programId)!;
      pd.income += i.amount;
      const att = Number(i.attendeesCount) || 0;
      pd.attendees += att;
      totalAttendees += att;
    });
    
    expenses.forEach(e => {
      if (!programData.has(e.programId)) programData.set(e.programId, { income: 0, expense: 0, attendees: 0 });
      programData.get(e.programId)!.expense += e.amount;
    });
    
    const programs: any[] = [];
    
    // We only show programs that have incomes or expenses in this year OR were created in this year
    this.educationService.programs().forEach(p => {
      const createdYear = new Date(p.createdAt).getFullYear();
      const pd = programData.get(p.id);
      
      if (pd || createdYear === year) {
        programs.push({
          ...p,
          income: pd?.income || 0,
          expense: pd?.expense || 0,
          profit: (pd?.income || 0) - (pd?.expense || 0),
          attendees: pd?.attendees || 0
        });
      }
    });
    
    // Sort programs by profit descending
    programs.sort((a, b) => b.profit - a.profit);
    
    // Calculate monthly attendees for the line chart
    const monthlyAttendees = new Array(12).fill(0);
    incomes.forEach(i => {
      const att = Number(i.attendeesCount) || 0;
      if (att > 0 && i.date) {
        const month = new Date(i.date).getMonth(); // 0-11
        monthlyAttendees[month] += att;
      }
    });

    return {
      totalIncome,
      totalExpense,
      netProfit,
      totalAttendees,
      programs,
      monthlyAttendees
    };
  });

  profitChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const stats = this.yearlyStats();
    // Top 5 profitable programs
    const topPrograms = [...stats.programs].filter(p => p.profit > 0).slice(0, 5);
    
    return {
      labels: topPrograms.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name),
      datasets: [
        {
          data: topPrograms.map(p => p.profit),
          backgroundColor: 'rgba(56, 189, 248, 0.6)',
          borderColor: 'rgba(56, 189, 248, 1)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };
  });

  attendeesChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const stats = this.yearlyStats();
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [
        {
          data: stats.monthlyAttendees,
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(139, 92, 246, 1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  });
}
