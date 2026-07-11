import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicaService } from '../../../core/services/clinica.service';
import { RED_FLAG_TYPES } from '../../../core/models/clinica.model';

@Component({
  selector: 'app-clinica-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clinica-analytics.ts.html',  // I will write this inline instead
  styleUrls: ['./clinica-analytics.scss']
})
export class ClinicaAnalyticsComponent {
  clinicaService = inject(ClinicaService);

  readonly heatmapMonths = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  readonly heatmapDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  analyticsReadiness = computed(() => {
    const patients = this.clinicaService.patients().length;
    const appts = this.clinicaService.appointments().length;
    const notes = this.clinicaService.notes().length;
    const pScore = Math.min(patients / 15, 1) * 30;
    const aScore = Math.min(appts / 100, 1) * 35;
    const nScore = Math.min(notes / 50, 1) * 35;
    return Math.round(pScore + aScore + nScore);
  });

  analyticsKPIs = computed(() => {
    const patients = this.clinicaService.patients();
    const appts = this.clinicaService.appointments();
    const now = new Date();

    const ages = patients.filter(p => p.birthDate).map(p => {
      const b = new Date(p.birthDate);
      return Math.floor((now.getTime() - b.getTime()) / (365.25 * 86400000));
    });
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

    const total = appts.length;
    const attended = appts.filter(a => a.status === 'completada').length;
    const adherence = total > 0 ? Math.round((attended / total) * 100) : 0;

    const byPatient: Record<string, number> = {};
    appts.filter(a => a.status === 'completada').forEach(a => {
      byPatient[a.patientId] = (byPatient[a.patientId] || 0) + 1;
    });
    const patientIds = Object.keys(byPatient);
    const avgSessions = patientIds.length ? Math.round(patientIds.reduce((s, id) => s + byPatient[id], 0) / patientIds.length) : 0;

    const crisisCount = appts.filter(a => a.type === 'crisis').length;

    const durations = patients.filter(p => p.createdAt).map(p => {
      return Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86400000);
    });
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return [
      { icon: '👥', label: 'Total Pacientes', value: patients.length, bg: 'rgba(var(--accent-rgb, 14, 165, 233), 0.12)' },
      { icon: '🎂', label: 'Edad Promedio', value: avgAge ? avgAge + ' años' : '—', bg: 'rgba(139,92,246,0.12)' },
      { icon: '✅', label: 'Tasa de Adherencia', value: adherence + '%', bg: 'rgba(16,185,129,0.12)' },
      { icon: '🔄', label: 'Sesiones Prom./Paciente', value: avgSessions || '—', bg: 'rgba(245,158,11,0.12)' },
      { icon: '🚨', label: 'Citas de Crisis', value: crisisCount, bg: 'rgba(239,68,68,0.12)' },
      { icon: '📅', label: 'Duración Prom. Tratamiento', value: avgDuration ? avgDuration + 'd' : '—', bg: 'rgba(var(--accent-rgb, 6, 182, 212), 0.12)' },
    ];
  });

  crisisHeatmapData = computed(() => {
    const appts = this.clinicaService.appointments();
    const grid: number[][] = Array.from({ length: 12 }, () => Array(7).fill(0));
    appts.filter(a => a.type === 'crisis').forEach(a => {
      const d = new Date(a.date);
      const month = d.getMonth();
      let dow = d.getDay() - 1;
      if (dow < 0) dow = 6;
      grid[month][dow]++;
    });
    return grid;
  });

  getHeatmapColor(value: number): string {
    if (value === 0) return 'rgba(var(--accent-rgb, 14, 165, 233), 0.04)';
    if (value === 1) return 'rgba(var(--accent-rgb, 14, 165, 233), 0.15)';
    if (value === 2) return 'rgba(var(--accent-rgb, 14, 165, 233), 0.3)';
    if (value === 3) return 'rgba(var(--accent-rgb, 14, 165, 233), 0.5)';
    if (value <= 5) return 'rgba(var(--accent-rgb, 14, 165, 233), 0.7)';
    return 'var(--accent)';
  }

  topDiagnoses = computed(() => {
    const patients = this.clinicaService.patients();
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      try {
        const raw = localStorage.getItem('um_clinica_histories');
        const histories: any[] = raw ? JSON.parse(raw) : [];
        const hist = histories.find((h: any) => h.patientId === p.id);
        if (hist?.diagnosis) {
          const diag = hist.diagnosis.trim();
          if (diag) counts[diag] = (counts[diag] || 0) + 1;
        }
      } catch {}
    });
    const max = Math.max(...Object.values(counts), 1);
    const colors = ['var(--accent)','var(--accent)','var(--accent)','var(--accent)','#ef4444','#ec4899','var(--accent)'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count], i) => ({ name, count, pct: (count / max) * 100, color: colors[i % colors.length] }));
  });

  getEvalCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      depresion: '🌧️', ansiedad: '⚡', cognitivo: '🧠',
      personalidad: '🎭', funcionalidad: '🔋', riesgo: '⚠️',
      infantojuvenil: '🧒', otro: '📋'
    };
    return map[cat] || '📋';
  }

  topInstruments = computed(() => {
    const patients = this.clinicaService.patients();
    const counts: Record<string, { name: string; category: string; count: number }> = {};
    patients.forEach(p => {
      try {
        const raw = localStorage.getItem(`clinica_evals_${p.id}`);
        const evals: any[] = raw ? JSON.parse(raw) : [];
        evals.forEach((ev: any) => {
          if (!counts[ev.instrumentId]) {
            counts[ev.instrumentId] = { name: ev.instrumentName || ev.instrumentId, category: ev.category || 'otro', count: 0 };
          }
          counts[ev.instrumentId].count++;
        });
      } catch {}
    });
    const items = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 7);
    const max = Math.max(...items.map(i => i.count), 1);
    const colors = ['var(--accent)','var(--accent)','var(--accent)','var(--accent)','#ec4899','#22c55e','#64748b'];
    return items.map((item, i) => ({ ...item, pct: (item.count / max) * 100, color: colors[i % colors.length] }));
  });

  adherenceByType = computed(() => {
    const appts = this.clinicaService.appointments();
    const types = ['primera-vez','seguimiento','evaluacion','crisis','familiar','pareja','grupal'];
    const labels: Record<string, string> = {
      'primera-vez': 'Primera Vez', seguimiento: 'Seguimiento', evaluacion: 'Evaluación',
      crisis: 'Crisis', familiar: 'Familiar', pareja: 'Pareja', grupal: 'Grupal',
    };
    const colors: Record<string, string> = {
      'primera-vez': 'var(--accent)', seguimiento: '#51B6A5', evaluacion: 'var(--accent)',
      crisis: '#ef4444', familiar: 'var(--accent)', pareja: '#ec4899', grupal: 'var(--accent)',
    };
    return types.map(type => {
      const ofType = appts.filter(a => a.type === type);
      const attended = ofType.filter(a => a.status === 'completada').length;
      const rate = ofType.length > 0 ? Math.round((attended / ofType.length) * 100) : 0;
      return { type, label: labels[type] || type, color: colors[type] || '#94a3b8', rate, total: ofType.length };
    }).filter(a => a.total > 0);
  });

  alertDistribution = computed(() => {
    const patients = this.clinicaService.patients();
    const counts: Record<string, { count: number; icon: string; label: string }> = {};
    const flagTypes = RED_FLAG_TYPES;
    flagTypes.forEach(ft => { counts[ft.value] = { count: 0, icon: ft.icon, label: ft.label }; });
    patients.forEach(p => {
      try {
        const raw = localStorage.getItem('um_clinica_histories');
        const histories: any[] = raw ? JSON.parse(raw) : [];
        const hist = histories.find((h: any) => h.patientId === p.id);
        if (hist?.redFlags && Array.isArray(hist.redFlags)) {
          hist.redFlags.forEach((rf: any) => {
            if (counts[rf.type]) counts[rf.type].count++;
          });
        }
      } catch {}
    });
    const items = Object.values(counts).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
    const max = Math.max(...items.map(i => i.count), 1);
    return items.map(item => ({ ...item, pct: (item.count / max) * 100 }));
  });
}
