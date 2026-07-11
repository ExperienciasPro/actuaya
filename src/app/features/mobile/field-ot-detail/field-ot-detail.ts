import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { WorkOrderService } from '../../../core/services/work-order.service';
import { InventoryService } from '../../../core/services/inventory.service';
import {
  WorkOrder,
  OtStatus,
  OtEvidence,
  OtSparePart,
  OT_STATUS_LABELS,
  OT_STATUS_ICONS,
  OT_STATUS_COLORS,
} from '../../../core/models/work-order.model';

@Component({
  selector: 'um-field-ot-detail',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './field-ot-detail.html',
  styleUrl: './field-ot-detail.scss',
})
export class FieldOtDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  otSvc = inject(WorkOrderService);
  invSvc = inject(InventoryService);
  Math = Math; // Expose Math for template

  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;

  // ─── State ───
  ot = signal<WorkOrder | null>(null);
  findings = signal('');
  pauseReason = signal('');
  showPauseModal = signal(false);
  showPartsModal = signal(false);
  showSignaturePad = signal(false);
  signatureDataUrl = signal<string | null>(null);
  isRecordingSpeech = signal(false);
  currentEvidenceType = signal<'photo_before' | 'photo_after' | 'video'>('photo_before');

  // ─── Spare Parts scanner ───
  scanSku = signal('');
  scanResult = signal<{ name: string; sku: string; cost: number } | null>(null);
  partQty = signal(1);

  // ─── Canvas state ───
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private hasSignature = false;

  // ─── Speech Recognition ───
  private recognition: any = null;

  // ─── Computed ───
  evidence = computed(() => {
    const id = this.ot()?.id;
    return id ? this.otSvc.getEvidence(id) : [];
  });

  evidenceCount = computed(() => {
    const id = this.ot()?.id;
    return id ? this.otSvc.getEvidenceCount(id) : { before: 0, after: 0, video: 0 };
  });

  spareParts = computed(() => {
    const id = this.ot()?.id;
    return id ? this.otSvc.getSpareParts(id) : [];
  });

  partsTotalCost = computed(() => {
    const id = this.ot()?.id;
    return id ? this.otSvc.getPartsTotalCost(id) : 0;
  });

  canComplete = computed(() => {
    const id = this.ot()?.id;
    if (!id) return false;
    return this.otSvc.hasRequiredEvidence(id);
  });

  statusLabel = computed(() => {
    const s = this.ot()?.status;
    return s ? OT_STATUS_LABELS[s] : '';
  });

  statusIcon = computed(() => {
    const s = this.ot()?.status;
    return s ? OT_STATUS_ICONS[s] : '';
  });

  statusColor = computed(() => {
    const s = this.ot()?.status;
    return s ? OT_STATUS_COLORS[s] : '#999';
  });

  // ─── Mock inventory for barcode scanner ───
  mockInventoryDB = [
    { sku: 'AC-001', name: 'Capacitor 25μF 450V', cost: 45000 },
    { sku: 'AC-002', name: 'Compresor 12000 BTU', cost: 380000 },
    { sku: 'AC-003', name: 'Filtro HEPA recambio', cost: 28000 },
    { sku: 'EL-010', name: 'Cable THW #12 (metro)', cost: 3200 },
    { sku: 'EL-011', name: 'Breaker 20A', cost: 18500 },
    { sku: 'PL-020', name: 'Tubo PVC 1/2" (metro)', cost: 5600 },
    { sku: 'PL-021', name: 'Válvula de bola 1/2"', cost: 12000 },
    { sku: 'HV-030', name: 'Motor ventilador 1/4 HP', cost: 165000 },
    { sku: 'HV-031', name: 'Termostato digital', cost: 95000 },
    { sku: 'GE-040', name: 'Silicona industrial 280ml', cost: 8500 },
  ];

  // ─── Lifecycle ───

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const order = this.otSvc.getById(id);
      if (order) {
        this.ot.set(order);
        const cd = this.otSvc.getCompletionData(id);
        if (cd.findings) this.findings.set(cd.findings);
        if (cd.signatureDataUrl) this.signatureDataUrl.set(cd.signatureDataUrl);
      } else {
        this.router.navigate(['/m/ot']);
      }
    }

    // Setup speech recognition
    if (isPlatformBrowser(this.platformId)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-MX';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          // Append to existing findings
          const current = this.findings();
          const cleaned = current.endsWith(' ') ? current : current + ' ';
          this.findings.set(cleaned + transcript);
        };

        this.recognition.onend = () => {
          this.isRecordingSpeech.set(false);
          this.saveFindings();
        };

        this.recognition.onerror = () => {
          this.isRecordingSpeech.set(false);
        };
      }
    }
  }

  ngAfterViewInit(): void {
    // Signature canvas will be initialized when shown
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
  }

  // ─── Navigation Actions ───

  goBack(): void {
    this.router.navigate(['/m/ot']);
  }

  // ─── State Transitions ───

  async advanceState(): Promise<void> {
    const order = this.ot();
    if (!order) return;

    const transitions: Record<string, OtStatus> = {
      asignada: 'en_camino',
      en_camino: 'en_ejecucion',
      en_ejecucion: 'completada',
      en_pausa: 'en_ejecucion',
    };

    const next = transitions[order.status];
    if (!next) return;

    // If going to completada, need evidence check
    if (next === 'completada' && !this.canComplete()) {
      alert('⚠️ Debes adjuntar mín. 1 foto "Antes", 1 foto "Después" y 1 video antes de completar.');
      return;
    }

    const ok = await this.otSvc.transition(order.id, next);
    if (ok) {
      const updated = this.otSvc.getById(order.id);
      if (updated) this.ot.set(updated);
    }
  }

  async requestPause(): Promise<void> {
    this.showPauseModal.set(true);
  }

  async confirmPause(): Promise<void> {
    const order = this.ot();
    if (!order || !this.pauseReason().trim()) return;

    const ok = await this.otSvc.transition(order.id, 'en_pausa', this.pauseReason().trim());
    if (ok) {
      const updated = this.otSvc.getById(order.id);
      if (updated) this.ot.set(updated);
      this.showPauseModal.set(false);
      this.pauseReason.set('');
    }
  }

  getAdvanceLabel(): string {
    const s = this.ot()?.status;
    const labels: Record<string, string> = {
      asignada: '🚗 Iniciar Camino',
      en_camino: '🔧 Llegar al Sitio',
      en_ejecucion: '✅ Completar Trabajo',
      en_pausa: '▶️ Reanudar Trabajo',
    };
    return s ? (labels[s] || '') : '';
  }

  canAdvance(): boolean {
    const s = this.ot()?.status;
    if (!s) return false;
    if (s === 'en_ejecucion') return this.canComplete();
    return ['asignada', 'en_camino', 'en_pausa'].includes(s);
  }

  isWorkInProgress(): boolean {
    const s = this.ot()?.status;
    return s === 'en_ejecucion' || s === 'en_pausa';
  }

  // ─── Evidence Management ───

  triggerFileInput(type: 'photo_before' | 'photo_after' | 'video'): void {
    this.currentEvidenceType.set(type);
    if (type === 'video') {
      this.videoInput?.nativeElement.click();
    } else {
      this.fileInput?.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.ot()) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const evidence: OtEvidence = {
        id: crypto.randomUUID(),
        type: this.currentEvidenceType(),
        dataUrl: reader.result as string,
        filename: file.name,
        timestamp: new Date().toISOString(),
      };
      this.otSvc.addEvidence(this.ot()!.id, evidence);
    };
    reader.readAsDataURL(file);
    input.value = ''; // Reset for re-selection
  }

  removeEvidence(evidenceId: string): void {
    const id = this.ot()?.id;
    if (id) this.otSvc.removeEvidence(id, evidenceId);
  }

  getEvidenceLabel(type: string): string {
    const labels: Record<string, string> = {
      photo_before: '📸 Antes',
      photo_after: '📸 Después',
      video: '🎥 Video',
    };
    return labels[type] || type;
  }

  // ─── Spare Parts (Barcode Scanner) ───

  openPartsModal(): void {
    this.showPartsModal.set(true);
    this.scanSku.set('');
    this.scanResult.set(null);
    this.partQty.set(1);
  }

  simulateScan(): void {
    // Simulate barcode camera scan — pick a random SKU
    const items = this.mockInventoryDB;
    const random = items[Math.floor(Math.random() * items.length)];
    this.scanSku.set(random.sku);
    this.lookupSku();
  }

  lookupSku(): void {
    const sku = this.scanSku().trim().toUpperCase();
    if (!sku) {
      this.scanResult.set(null);
      return;
    }

    // Check mock DB first, then real inventory
    const mockItem = this.mockInventoryDB.find(i => i.sku.toUpperCase() === sku);
    if (mockItem) {
      this.scanResult.set(mockItem);
      return;
    }

    // Check real inventory service
    const invProduct = this.invSvc.products().find(
      p => p.sku.toUpperCase() === sku
    );
    if (invProduct) {
      this.scanResult.set({
        sku: invProduct.sku,
        name: invProduct.name,
        cost: invProduct.costPerUnit,
      });
      return;
    }

    this.scanResult.set(null);
  }

  addPartToOt(): void {
    const result = this.scanResult();
    const order = this.ot();
    if (!result || !order) return;

    const qty = this.partQty();
    const part: OtSparePart = {
      id: crypto.randomUUID(),
      sku: result.sku,
      name: result.name,
      quantity: qty,
      unitCost: result.cost,
      totalCost: result.cost * qty,
    };

    this.otSvc.addSparePart(order.id, part);

    // Reset scanner
    this.scanSku.set('');
    this.scanResult.set(null);
    this.partQty.set(1);
  }

  removePart(partId: string): void {
    const id = this.ot()?.id;
    if (id) this.otSvc.removeSparePart(id, partId);
  }

  // ─── Signature Canvas ───

  openSignaturePad(): void {
    this.showSignaturePad.set(true);
    // Wait for canvas to render
    setTimeout(() => this.initCanvas(), 100);
  }

  private initCanvas(): void {
    if (!this.signatureCanvas) return;
    const canvas = this.signatureCanvas.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = '#1a2e35';
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      // White background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    this.hasSignature = false;
  }

  onCanvasPointerDown(e: PointerEvent): void {
    if (!this.ctx) return;
    this.isDrawing = true;
    this.hasSignature = true;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  onCanvasPointerMove(e: PointerEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.stroke();
  }

  onCanvasPointerUp(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    this.initCanvas();
    this.signatureDataUrl.set(null);
  }

  confirmSignature(): void {
    if (!this.signatureCanvas || !this.hasSignature) return;
    const dataUrl = this.signatureCanvas.nativeElement.toDataURL('image/png');
    this.signatureDataUrl.set(dataUrl);
    const id = this.ot()?.id;
    if (id) this.otSvc.setSignature(id, dataUrl);
    this.showSignaturePad.set(false);
  }

  // ─── Speech-to-Text ───

  toggleSpeech(): void {
    if (!this.recognition) {
      alert('⚠️ Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    if (this.isRecordingSpeech()) {
      this.recognition.stop();
      this.isRecordingSpeech.set(false);
    } else {
      this.recognition.start();
      this.isRecordingSpeech.set(true);
    }
  }

  saveFindings(): void {
    const id = this.ot()?.id;
    if (id) this.otSvc.setCompletionFindings(id, this.findings());
  }

  // ─── Helpers ───

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }
}
