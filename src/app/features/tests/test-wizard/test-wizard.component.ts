import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TestsDataService } from '../../../shared/tests-data.service';
import { AvatarUtils } from '../../../shared/utils/avatar.utils';
import { AdminFormulariosComponent } from '../../admin-formularios/admin-formularios.component';
// XLSX is loaded dynamically via import() to reduce initial bundle size (~420KB)

@Component({
  selector: 'app-test-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule, AdminFormulariosComponent],
  templateUrl: './test-wizard.component.html',
  styleUrl: './test-wizard.component.css'
})
export class TestWizardComponent implements OnInit {
  private readonly DRAFT_KEY = 'testWizardDraft';
  private draftTimer: any = null;
  @ViewChild(AdminFormulariosComponent) formComponent?: AdminFormulariosComponent;
  wizardForm!: FormGroup;
  currentStep = 1;
  totalSteps = 9;
  stepLabels = ['General', 'Preguntas', 'Revisión', 'Formulario', 'Diseño', 'Resultados', 'Pantalla Final'];
  testId: string | null = null;
  currentAvatarUrl: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  importMode: 'text' | 'file' = 'text';

  // Opciones de Colores predeterminados (Igual a Encuestas)
  predefinedColors = ['var(--accent)', 'var(--accent)', 'var(--accent)', '#EF4444', 'var(--accent)', '#1E293B'];

  // Variables para carga XLSX
  selectedFile: File | null = null;
  fileError: string | null = null;

  textoParaParsear: string = '';
  isParsing: boolean = false;
  isSaving: boolean = false;
  errorMessage: string | null = null;

  showPreviewModal: boolean = false;
  showShareModal: boolean = false;
  currentSurveyUrl: string = '';
  previewQuestionIndex: number = 0;

  // Paso 4: Formulario
  formularioActivo: boolean = false;
  formularioMomento: 'inicio' | 'final' = 'inicio';

  // Paso 7: Pantalla Final
  pantallaFinal = {
    titulo: '¡Evaluación completada!',
    subtitulo: 'Gracias por tu tiempo y dedicación',
    mensaje: 'Hemos registrado todas tus respuestas. Tu participación es muy valiosa para nosotros. El equipo evaluador revisará tu perfil y los resultados estarán disponibles en breve.',
    mostrarPuntaje: true,
    mostrarBotonCompartir: false,
    mostrarDescargarPDF: true,
    mostrarBotonCTA: false,
    ctaTexto: 'Visitar sitio web',
    ctaUrl: '',
    templateResultado: 'testea-default'
  };

  plantillas = [
    { id: 'theme-default', nombre: 'Por Defecto', imagen: '/assets/img/default.jpg' },
    { id: 'theme-corporate', nombre: 'Corporativa', imagen: '/assets/img/corporate.jpg' },
    { id: 'theme-elegant', nombre: 'Moderna', imagen: '/assets/img/elegant.jpg' },
    { id: 'theme-playful', nombre: 'Infantil', imagen: '/assets/img/playful.jpg' },
    { id: 'theme-vibrant', nombre: 'Juvenil', imagen: '/assets/img/vibrant.jpg' },
    { id: 'theme-ultraminimal', nombre: 'Minimalista', imagen: '/assets/img/minimal.jpg' }
  ];

  plantillasFinales = [
    { id: 'theme-default', nombre: 'Por Defecto' },
    { id: 'theme-corporate', nombre: 'Corporativa' },
    { id: 'theme-elegant', nombre: 'Moderna' },
    { id: 'theme-playful', nombre: 'Infantil' },
    { id: 'theme-vibrant', nombre: 'Juvenil' },
    { id: 'theme-ultraminimal', nombre: 'Minimalista' }
  ];

  metodosDisponibles = ['PDF', 'Link', 'Email', 'CertificadoQR', 'Graficos'];

  constructor(private fb: FormBuilder, private testsService: TestsDataService, private route: ActivatedRoute, private router: Router, private http: HttpClient) { }

  @HostListener('window:beforeunload')
  onBeforeUnload() {
    // Guardar inmediatamente antes de que la página se recargue (F5)
    if (!this.testId) {
      this.saveDraftNow();
    }
  }

  private saveDraftNow() {
    try {
      const draft = {
        currentStep: this.currentStep,
        formValue: this.wizardForm.getRawValue(),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Error guardando borrador en beforeunload', e);
    }
  }

  ngOnInit() {
    this.wizardForm = this.fb.group({
      // Tarjeta 1
      generales: this.fb.group({
        nombre: ['', Validators.required],
        descripcion: [''],
        tipo: ['Test Individual'],
        formularioVinculado: [''],
        requierePin: [false],
        imageUrl: ['']
      }),

      // Tarjeta 2
      preguntasGroup: this.fb.group({
        textoPlano: [''],
        preguntasArray: this.fb.array([])
      }),

      // Tarjeta 3 (Paso 5)
      plantilla: this.fb.group({
        themeColor: ['var(--accent)'],
        themeId: ['theme-default'], // Retenido como retrocompatibilidad si es necesario
        themeFinalId: ['theme-corporate'],
        presentationMode: ['card'],
        backgroundTemplate: ['default'],
        customBackgroundUrl: [null],
        customBackgroundColor: ['var(--accent)'],
        backgroundOpacity: [100],
        backgroundBlur: [0],
        animationStyle: ['fade'],
        companyLogoUrl: [null],
        allowNavButtons: [true],
        tiempoLimiteActivo: [false],
        tiempoLimiteMinutos: [30],
        mostrarReloj: [true]
      }),

      // Tarjeta 4
      resultados: this.fb.group({
        evaluaTiempo: [false],
        pesoTiempo: [0],
        rangosPuntaje: this.fb.array([this.crearRango()]),
        metodosEntrega: [[]],
        metodosConfig: this.fb.group({
          pdfCarga: [''],
          linkUrl: [''],
          emailPlantilla: [''],
          qrCarga: [''],
          graficosConfig: ['Radar']
        })
      })
    });

    // Suscripción a cambios para autogenerar Avatar (DiceBear) solo con el nombre
    this.generales.get('nombre')!.valueChanges.subscribe(nombre => {
      const seedStr = (nombre || '').trim();
      if (seedStr) {
        this.currentAvatarUrl = this.generateDiceBearUrl(seedStr);
      } else {
        // Fallback default
        this.currentAvatarUrl = AvatarUtils.getDiceBearUrl('Felix', 'instrument');
      }
    });

    // Forzar trigger inicial (opcional si queremos que agarre los fields vacios o precargados)
    this.generales.get('nombre')!.updateValueAndValidity({ emitEvent: true });

    this.testId = this.route.snapshot.paramMap.get('id');
    if (this.testId) {
      this.loadTestData();
    } else {
      // Limpiar cualquier borrador anterior para comenzar un test nuevo limpio
      this.clearDraft();
    }

    // Auto-guardar borrador en localStorage cada 2 segundos con debounce
    this.wizardForm.valueChanges.subscribe(() => {
      this.scheduleDraftSave();
    });
  }

  // --- DRAFT PERSISTENCE (localStorage) ---
  private scheduleDraftSave() {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.saveDraft(), 2000);
  }

  private saveDraft() {
    // No guardar si estamos editando un test existente
    if (this.testId) return;
    try {
      const draft = {
        currentStep: this.currentStep,
        formValue: this.wizardForm.getRawValue(),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Error guardando borrador en localStorage', e);
    }
  }

  private restoreDraft() {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return;

      const draft = JSON.parse(raw);
      if (!draft || !draft.formValue) return;

      // Verificar que el borrador no sea muy viejo (máx 24h)
      const savedAt = new Date(draft.savedAt);
      const hoursOld = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        this.clearDraft();
        return;
      }

      const fv = draft.formValue;

      // Restaurar generales
      if (fv.generales) {
        this.generales.patchValue(fv.generales);
      }

      // Restaurar preguntas
      if (fv.preguntasGroup?.preguntasArray?.length > 0) {
        while (this.preguntasArray.length > 0) this.preguntasArray.removeAt(0);
        fv.preguntasGroup.preguntasArray.forEach((q: any) => {
          const preguntaGroup = this.fb.group({
            textoPregunta: [q.textoPregunta || ''],
            opciones: this.fb.array([])
          });
          const opcionesArray = preguntaGroup.get('opciones') as FormArray;
          if (q.opciones?.length > 0) {
            q.opciones.forEach((opt: any) => {
              opcionesArray.push(this.fb.group({
                texto: [opt.texto || ''],
                puntaje: [opt.puntaje || 0]
              }));
            });
          }
          this.preguntasArray.push(preguntaGroup);
        });
      }

      // Restaurar plantilla
      if (fv.plantilla) {
        this.plantilla.patchValue(fv.plantilla);
      }

      // Restaurar resultados (rangos y métodos)
      if (fv.resultados) {
        if (fv.resultados.rangosPuntaje?.length > 0) {
          while (this.rangosPuntaje.length > 0) this.rangosPuntaje.removeAt(0);
          fv.resultados.rangosPuntaje.forEach((r: any) => {
            this.rangosPuntaje.push(this.fb.group({
              min: [r.min || 0],
              max: [r.max || 0],
              etiqueta: [r.etiqueta || ''],
              mensaje: [r.mensaje || '']
            }));
          });
        }
        this.resultados.patchValue({
          evaluaTiempo: fv.resultados.evaluaTiempo || false,
          pesoTiempo: fv.resultados.pesoTiempo || 0,
          metodosEntrega: fv.resultados.metodosEntrega || [],
          metodosConfig: fv.resultados.metodosConfig || {}
        });
      }

      // Restaurar paso actual
      this.currentStep = draft.currentStep || 1;

    } catch (e) {
      console.warn('Error restaurando borrador:', e);
      this.clearDraft();
    }
  }

  clearDraft() {
    localStorage.removeItem(this.DRAFT_KEY);
  }

  loadTestData() {
    this.http.get<any>(`/api/test/${this.testId}`).subscribe({
      next: (res) => {
        if (res.status === 'ok' && res.datos) {
          this.populateForm(res.datos);
        }
      },
      error: (err) => console.error('Error loading test data', err)
    });
  }

  populateForm(datos: any) {
    if (datos.info) {
      this.generales.patchValue({
        nombre: datos.info.titulo || '',
        descripcion: datos.info.introduccion || datos.info.descripcion || '',
        tipo: datos.info.tipo || 'Test Individual',
        formularioVinculado: datos.info.formularioVinculado || '',
        requierePin: datos.info.requierePin || false,
        imageUrl: datos.info.imagenCabecera || '',
      });

      // Restaurar formulario
      if (datos.info.formularioActivo) {
        this.formularioActivo = true;
        this.formularioMomento = datos.info.formularioMomento || 'inicio';
      }

      // Restaurar configuración de plantilla
      this.plantilla.patchValue({
        themeColor: datos.info.themeColor || datos.info.color || 'var(--accent)',
        presentationMode: datos.info.presentationMode || 'card',
        backgroundTemplate: datos.info.backgroundTemplate || 'default',
        customBackgroundUrl: datos.info.customBackgroundUrl || null,
        backgroundOpacity: datos.info.backgroundOpacity ?? 100,
        backgroundBlur: datos.info.backgroundBlur ?? 0,
        animationStyle: datos.info.animationStyle || 'fade',
        companyLogoUrl: datos.info.companyLogoUrl || null,
        allowNavButtons: datos.info.allowNavButtons !== false,
        tiempoLimiteActivo: datos.info.tiempoLimiteActivo || false,
        tiempoLimiteMinutos: datos.info.tiempoLimiteMinutos || 30,
        mostrarReloj: datos.info.mostrarReloj !== false,
      });

      // Restaurar resultados
      this.resultados.patchValue({
        evaluaTiempo: datos.info.evaluaTiempo || false,
        pesoTiempo: datos.info.pesoTiempo || 0,
        metodosEntrega: datos.info.metodosEntrega || [],
      });

      // Restaurar rangos de puntaje
      if (datos.info.rangosPuntaje && datos.info.rangosPuntaje.length > 0) {
        while (this.rangosPuntaje.length > 0) this.rangosPuntaje.removeAt(0);
        datos.info.rangosPuntaje.forEach((r: any) => {
          this.rangosPuntaje.push(this.fb.group({
            min: [r.min || 0],
            max: [r.max || 100],
            resultadoAsociado: [r.resultadoAsociado || ''],
            descripcionResultado: [r.descripcionResultado || '']
          }));
        });
      }
    }

    // Clear existing questions
    while (this.preguntasArray.length !== 0) {
      this.preguntasArray.removeAt(0);
    }

    if (datos.preguntas && datos.preguntas.length > 0) {
      datos.preguntas.forEach((q: any) => {
        const preguntaGroup = this.fb.group({
          textoPregunta: [q.text || '', Validators.required],
          opciones: this.fb.array([])
        });
        const opcionesArray = preguntaGroup.get('opciones') as FormArray;

        if (q.options && q.options.length > 0) {
          q.options.forEach((opt: any) => {
            opcionesArray.push(this.fb.group({
              texto: [opt.label || ''],
              puntaje: [opt.value || 0]
            }));
          });
        }

        this.preguntasArray.push(preguntaGroup);
      });
    }
  }


  generateDiceBearUrl(seed: string): string {
    return AvatarUtils.getDiceBearUrl(seed, 'instrument');
  }

  getLiveBackgroundStyle(): string {
    const bgTemplate = this.plantilla.get('backgroundTemplate')?.value || 'default';
    const customUrl = this.plantilla.get('customBackgroundUrl')?.value;

    // Match values used in HTML: 'default', 'grid', 'dots', 'waves', 'color', 'custom-image'
    if (bgTemplate === 'dots') return 'radial-gradient(#cbd5e1 2px, #f8fafc 2px) 0 0 / 20px 20px';
    if (bgTemplate === 'grid') return 'linear-gradient(#e2e8f0 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, #e2e8f0 1px, transparent 1px) 0 0 / 20px 20px #f8fafc';
    if (bgTemplate === 'waves') return 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #ffffff 10px, #ffffff 20px)';
    if (bgTemplate === 'color') {
      // Use customBackgroundColor as solid background
      return this.plantilla.get('customBackgroundColor')?.value || 'var(--accent)';
    }
    if (bgTemplate === 'custom-image' && customUrl) return `url(${customUrl})`;
    if (bgTemplate === 'image' && customUrl) return `url(${customUrl})`;

    // Legacy support (for old data)
    if (bgTemplate === 'texture-dots') return 'radial-gradient(#cbd5e1 2px, #f8fafc 2px) 0 0 / 20px 20px';
    if (bgTemplate === 'texture-lines') return 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #ffffff 10px, #ffffff 20px)';
    if (bgTemplate === 'gradient-soft') return 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)';
    if (bgTemplate === 'texture-grid') return 'linear-gradient(#e2e8f0 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, #e2e8f0 1px, transparent 1px) 0 0 / 20px 20px #f8fafc';

    if (bgTemplate && bgTemplate.startsWith('#')) return bgTemplate;
    return '#f8fafc';
  }

  // --- GETTERS
  get generales() { return this.wizardForm.get('generales') as FormGroup; }
  get preguntasGroup() { return this.wizardForm.get('preguntasGroup') as FormGroup; }
  get preguntasArray() { return this.preguntasGroup.get('preguntasArray') as FormArray; }
  get plantilla() { return this.wizardForm.get('plantilla') as FormGroup; }
  get resultados() { return this.wizardForm.get('resultados') as FormGroup; }
  get rangosPuntaje() { return this.resultados.get('rangosPuntaje') as FormArray; }
  get themeSeleccionado() { return this.plantilla.get('themeId')?.value; }
  get themeFinalSeleccionado() { return this.plantilla.get('themeFinalId')?.value; }

  getOpcionesArray(preguntaIndex: number): FormArray {
    return this.preguntasArray.at(preguntaIndex).get('opciones') as FormArray;
  }

  dropPregunta(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.preguntasArray.controls, event.previousIndex, event.currentIndex);
    this.preguntasArray.updateValueAndValidity();
  }

  dropOpcion(event: CdkDragDrop<any[]>, preguntaIndex: number) {
    const opcionesArray = this.getOpcionesArray(preguntaIndex);
    moveItemInArray(opcionesArray.controls, event.previousIndex, event.currentIndex);
    opcionesArray.updateValueAndValidity();
  }

  getPreviewQuestions() {
    if (this.preguntasArray.length === 0) {
      return [
        {
          textoPregunta: '¿Ejemplo de pregunta introductoria para el candidato?',
          opciones: ['Opción de respuesta A', 'Opción de respuesta B']
        },
        {
          textoPregunta: '¿Cómo evalúas tu desempeño bajo presión?',
          opciones: ['Excelente', 'Necesito mejorar']
        }
      ];
    }
    return this.preguntasArray.value.map((q: any) => ({
      ...q,
      opciones: q.opciones.map((op: any) => op.texto)
    })).slice(0, 2);
  }

  // --- MANEJO DE PASOS
  nextStep() {

    // Solo validamos la tarjeta/paso en el que el usuario se encuentra actualmente

    if (this.currentStep === 1) {
      if (this.generales.invalid) {
        this.generales.markAllAsTouched();
        // Permite avanzar
      }
    } else if (this.currentStep === 2) {
      if (this.preguntasGroup.invalid) {
        this.preguntasGroup.markAllAsTouched();
      }
      // Si hay texto plano nuevo en el textarea, re-parsear (incluso si ya hay preguntas previas)
      const text = this.preguntasGroup.get('textoPlano')?.value;
      if (text && text.trim() !== '') {
        this.autoGenerarPreguntas(true);
        return; // autoGenerarPreguntas ya avanza a step 3
      }
      // Si hay archivo seleccionado, procesarlo primero
      if (this.importMode === 'file' && this.selectedFile) {
        this.processFileAndGenerate();
        return;
      }
      // Si no hay texto nuevo pero sí preguntas existentes, avanzar directamente
      if (this.preguntasArray.length > 0) {
        this.currentStep = 3;
        this.saveDraft();
        return;
      }
    } else if (this.currentStep === 3) {
      if (this.preguntasArray.invalid) {
        this.preguntasArray.markAllAsTouched();
        // Permite avanzar
      }
    } else if (this.currentStep === 4) {
      if (this.formComponent && this.formComponent.formularioSeleccionado) {
        this.wizardForm.get('generales.formularioVinculado')?.setValue(this.formComponent.formularioSeleccionado.id);
      }
    } else if (this.currentStep === 5) {
      if (this.plantilla.invalid) {
        this.plantilla.markAllAsTouched();
        // Permite avanzar
      }
    } else if (this.currentStep === 6) {
      if (this.resultados.invalid) {
        this.resultados.markAllAsTouched();
        // Permite avanzar
      }
    } else if (this.currentStep === 7) {
      // Step 7 is confirmation/resumen, no extra validation before submitting.
    }

    // Si llegamos aqui superó las validaciones del paso actual
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.saveDraft();
      // Auto-guardar en backend al avanzar de paso
      this.autoGuardarProgreso();
    }
  }

  /** Auto-guarda progreso en backend silenciosamente */
  private autoGuardarProgreso() {
    if (this.isSaving) return;
    if (this.testId) {
      this.guardarCambiosTest(true);
    } else if (this.generales.get('nombre')?.value) {
      this.submitFullTest(true, true);
    }
  }

  setStep(stepNumber: number) {
    this.currentStep = stepNumber;
    this.saveDraft();
  }

  getTotalOpciones(): number {
    return this.preguntasArray.controls.reduce((acc: number, q: any) => {
      const opciones = q.get('opciones') as FormArray;
      return acc + (opciones ? opciones.length : 0);
    }, 0);
  }

  getTotalPuntajeMax(): number {
    return this.preguntasArray.controls.reduce((acc: number, q: any) => {
      const opciones = q.get('opciones') as FormArray;
      if (!opciones) return acc;
      const maxPuntaje = opciones.controls.reduce((max: number, op: any) => {
        const p = op.get('puntaje')?.value || 0;
        return p > max ? p : max;
      }, 0);
      return acc + maxPuntaje;
    }, 0);
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.saveDraft();
    }
  }

  submitFullTest(isDraft: boolean = false, silent: boolean = false) {

    // Si es "Publicación" exige todos los campos completados, si es "Borrador" evito el bloqueo duro.
    if (this.wizardForm.invalid && !isDraft) {
      this.wizardForm.markAllAsTouched();
      alert('Revisa los campos requeridos antes de publicar.');
      return;
    }

    this.isSaving = true;

    this.errorMessage = null;

    // Recolectamos TODA la estructura acumulada en memoria (Memory State)
    const finalData = {
      ...this.wizardForm.value.generales,
      id: this.testId, // Para migraciones UPSERT Backend
      imageUrl: this.currentAvatarUrl,
      preguntas: this.preguntasArray.value,
      plantillaSeleccionada: this.themeSeleccionado,
      pantallaFinalSeleccionada: this.themeSeleccionado, // Usa el mismo theme
      rangosPuntaje: this.rangosPuntaje.value,
      metodosEntrega: this.resultados.value.metodosEntrega,
      metodosConfig: this.resultados.value.metodosConfig,
      estadoPublicacion: isDraft ? 'Borrador' : 'Publicado',
      themeColor: this.plantilla.get('themeColor')?.value || 'var(--accent)',
      color: this.plantilla.get('themeColor')?.value || 'var(--accent)',
      presentationMode: this.plantilla.get('presentationMode')?.value || 'card',
      backgroundTemplate: this.plantilla.get('backgroundTemplate')?.value || 'default',
      customBackgroundUrl: this.plantilla.get('customBackgroundUrl')?.value || null,
      backgroundOpacity: this.plantilla.get('backgroundOpacity')?.value || 100,
      backgroundBlur: this.plantilla.get('backgroundBlur')?.value || 0,
      animationStyle: this.plantilla.get('animationStyle')?.value || 'fade',
      companyLogoUrl: this.plantilla.get('companyLogoUrl')?.value || null,
      allowNavButtons: this.plantilla.get('allowNavButtons')?.value !== false,
      tiempoLimiteActivo: this.plantilla.get('tiempoLimiteActivo')?.value || false,
      tiempoLimiteMinutos: this.plantilla.get('tiempoLimiteMinutos')?.value || 30,
      mostrarReloj: this.plantilla.get('mostrarReloj')?.value !== false,
      formularioActivo: this.formularioActivo,
      formularioMomento: this.formularioMomento,
      pantallaFinal: this.pantallaFinal
    };

    // Determinamos si el ID es de formato MongoDB (24 caracteres hex) o un XML antiguo
    const isMongoId = this.testId && /^[a-fA-F0-9]{24}$/.test(this.testId);

    // Si estamos editando un test nativo de MongoDB, actualizamos
    if (isMongoId) {
      this.testsService.actualizarTest(this.testId!, finalData).subscribe({
        next: (res) => {
          this.isSaving = false;
          if (silent) return; // Auto-save silencioso: no navegar ni limpiar
          this.clearDraft();

          if (isDraft) {
            // Borrador: quedarse en el editor
          } else {
            this.showPreviewModal = false;
            this.currentSurveyUrl = window.location.origin + '/test-access/' + this.testId;
            this.showShareModal = true;
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Error general al editar test. Intenta nuevamente.';
          console.error('Submit (Edit) Error:', err);
          this.isSaving = false;
        }
      });
    } else {
      // Si es nuevo O si estamos editando un archivo heredado (XML),
      // creamos un nuevo test (migración al vuelo hacia MongoDB).
      this.testsService.createFullTest(finalData).subscribe({
        next: (res) => {
          if (res.data && res.data._id) {
            this.testId = res.data._id; // Recuperarmos el ID definitivo generado
          }
          this.isSaving = false;
          if (silent) return; // Auto-save silencioso: no navegar ni limpiar
          this.clearDraft();

          if (isDraft) {
            // Borrador: quedarse en el editor
          } else {
            this.showPreviewModal = false;
            this.currentSurveyUrl = window.location.origin + '/test-access/' + this.testId;
            this.showShareModal = true;
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Error general al publicar test. Intenta nuevamente.';
          console.error('Submit (Complete) Error:', err);
          this.isSaving = false;
        }
      });
    }
  }

  guardarCambiosTest(silent: boolean = false) {
    if (!this.testId) return;

    this.isSaving = true;
    this.errorMessage = null;

    // Recolectamos el state
    const finalData = {
      ...this.wizardForm.value.generales,
      id: this.testId, // Para asegurarnos de upsert con MongoDB
      imageUrl: this.currentAvatarUrl,
      preguntas: this.preguntasArray.value,
      plantillaSeleccionada: this.themeSeleccionado,
      pantallaFinalSeleccionada: this.themeSeleccionado,
      evaluaTiempo: this.resultados.value.evaluaTiempo,
      rangosPuntaje: this.rangosPuntaje.value,
      metodosEntrega: this.resultados.value.metodosEntrega,
      metodosConfig: this.resultados.value.metodosConfig,
      themeColor: this.plantilla.get('themeColor')?.value || 'var(--accent)',
      color: this.plantilla.get('themeColor')?.value || 'var(--accent)',
      presentationMode: this.plantilla.get('presentationMode')?.value || 'card',
      backgroundTemplate: this.plantilla.get('backgroundTemplate')?.value || 'default',
      customBackgroundUrl: this.plantilla.get('customBackgroundUrl')?.value || null,
      backgroundOpacity: this.plantilla.get('backgroundOpacity')?.value || 100,
      backgroundBlur: this.plantilla.get('backgroundBlur')?.value || 0,
      animationStyle: this.plantilla.get('animationStyle')?.value || 'fade',
      companyLogoUrl: this.plantilla.get('companyLogoUrl')?.value || null,
      allowNavButtons: this.plantilla.get('allowNavButtons')?.value !== false,
      tiempoLimiteActivo: this.plantilla.get('tiempoLimiteActivo')?.value || false,
      tiempoLimiteMinutos: this.plantilla.get('tiempoLimiteMinutos')?.value || 30,
      mostrarReloj: this.plantilla.get('mostrarReloj')?.value !== false,
      formularioActivo: this.formularioActivo,
      formularioMomento: this.formularioMomento,
      pantallaFinal: this.pantallaFinal
    };

    const isMongoId = this.testId && /^[a-fA-F0-9]{24}$/.test(this.testId);

    if (isMongoId) {
      this.testsService.actualizarTest(this.testId, finalData).subscribe({
        next: (res) => {
          this.isSaving = false;
          if (silent) return;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Error al guardar cambios. Reintenta en unos instantes.';
          console.error('Partial Save (Edit) Error:', err);
          this.isSaving = false;
        }
      });
    } else {
      // Como el test no existía en MongoDB, forzamos su creación como Borrador 
      // al guardar "parcialmente" para que las siguientes ediciones ya no fallen
      finalData.estadoPublicacion = 'Borrador';
      this.testsService.createFullTest(finalData).subscribe({
        next: (res) => {
          if (res.data && res.data._id) {
            this.testId = res.data._id; // Enlazar al nuevo ID para futuras actualizaciones
          }
          this.isSaving = false;
          if (silent) return;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Error al guardar cambios. Reintenta en unos instantes.';
          console.error('Partial Save (Migrate) Error:', err);
          this.isSaving = false;
        }
      });
    }
  }

  // --- MÉTODOS DE ARCHIVO
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  handleFile(file: File) {
    this.fileError = null;
    this.selectedFile = null;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      this.fileError = 'Formato no válido. Usa .xlsx o .csv';
      return;
    }

    this.selectedFile = file;
  }

  processFileAndGenerate() {
    if (this.importMode === 'text') {
      this.autoGenerarPreguntas(true);
      return;
    }

    if (!this.selectedFile) {
      this.fileError = "Selecciona o arrastra un archivo primero.";
      return;
    }

    this.fileError = null;
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("El archivo no contiene hojas visibles.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!json || json.length === 0) {
          this.fileError = "El archivo está vacío. Por favor, incluye al menos una fila válida.";
          return;
        }

        let extractedText = '';
        let questionNumber = 0;
        json.forEach(row => {
          let tipoRaw = row['Tipo de Pregunta'] || row['tipo'] || row['Tipo'] || '';
          let pregunta = row['Pregunta'] || row['pregunta'] || row['Título'] || row['titulo'] || '';
          let opcionesRaw = row['Opciones'] || row['opciones'] || '';

          if (pregunta) {
            questionNumber++;
            extractedText += `${questionNumber}. ${pregunta}\n`;
            if (opcionesRaw) {
              const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              String(opcionesRaw).split(',').forEach((o, idx) => {
                const letter = letters[idx] || String.fromCharCode(65 + idx);
                extractedText += `${letter}. ${o.trim()}\n`;
              });
            }
            extractedText += '\n';
          }
        });

        if (extractedText.trim() === '') {
          this.fileError = "No se detectaron columnas con 'Pregunta' ni 'Opciones'. Usa la plantilla de ejemplo.";
          return;
        }

        // Auto-fill textbox implicitly and run AI parser
        this.preguntasGroup.get('textoPlano')?.setValue(extractedText.trim());
        this.autoGenerarPreguntas(true);

      } catch (error) {
        console.error("Error procesando archivo Excel:", error);
        this.fileError = "El archivo está corrupto o tiene formato incorrecto. Sube un .xlsx válido.";
      }
    };
    reader.onerror = () => {
      this.fileError = "El navegador no pudo leer el archivo.";
    };
    reader.readAsArrayBuffer(this.selectedFile);
  }

  async downloadTemplate() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { 'Tipo de Pregunta': 'opcion_multiple', 'Pregunta': '¿Qué te parece el entorno de trabajo?', 'Opciones': 'Muy bueno, Bueno, Regular, Malo' },
      { 'Tipo de Pregunta': 'texto', 'Pregunta': '¿Cuál consideras que es nuestro mayor fuerte?', 'Opciones': '' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_pruebas.xlsx");
  }

  // --- PARSEO DE PREGUNTAS (Tarjeta 2)
  autoGenerarPreguntas(continueToNext: boolean = false) {
    const text = this.preguntasGroup.get('textoPlano')?.value;
    if (!text || text.trim() === '') {
      alert("Pega texto o selecciona un archivo primero para poder autogenerar.");
      return;
    }

    this.isParsing = true;

    // Defer heavy work to next tick so Angular renders the loading overlay first
    setTimeout(() => {
      try {
        const parsed = this.parseTextToQuestions(text);

        if (parsed.length === 0) {
          this.isParsing = false;
          alert("No se pudieron detectar preguntas en el texto. Asegúrate de que cada pregunta tenga un número o 'Pregunta N:' y las opciones comiencen con A., B., etc.");
          return;
        }

        this.preguntasArray.clear();

        parsed.forEach((q: any) => {
          const opcionesFormArray = this.fb.array(
            q.opciones.map((op: any) => {
              const isObj = typeof op === 'object' && op !== null;
              const texto = isObj ? (op.texto || '') : String(op);
              const puntaje = isObj ? (op.puntaje || 0) : 0;
              const correcta = isObj ? (op.correcta || false) : false;

              return this.fb.group({
                texto: [texto, Validators.required],
                correcta: [correcta],
                puntaje: [puntaje]
              });
            })
          );

          this.preguntasArray.push(this.fb.group({
            textoPregunta: [q.textoPregunta, Validators.required],
            opciones: opcionesFormArray
          }));
        });

        this.isParsing = false;
        this.currentStep = 3;

      } catch (e) {
        console.error("Error en parser local:", e);
        this.isParsing = false;
        alert("Error procesando el texto. Verifica que el formato sea correcto.");
      }
    }, 100);
  }

  /**
   * Parser local de texto plano a preguntas estructuradas.
   * Soporta: "Pregunta N:", "N. texto", "N) texto", "¿texto?",
   * Opciones: "A. texto", "a) texto", "- texto",
   * Puntajes: "(Puntaje: 5)", "(P: 3)", "(Valor: 2)"
   */
  private parseTextToQuestions(text: string): any[] {
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const questions: any[] = [];
    let currentQuestion: any = null;

    const optionRegex = /^([a-z])[\.)\-:]\s*(.*)/i;
    const dashOptionRegex = /^[-\u2022]\s+(.*)/;
    const scoreInOptionRegex = /\(\s*(?:Puntaje|Valor|Puntos|Score|P)\s*[:=]?\s*(\d+)\s*\)/i;

    const isQuestionLine = (line: string): boolean => {
      if (optionRegex.test(line)) return false;
      if (dashOptionRegex.test(line)) return false;
      if (/^Pregunta\s+\d+[\.:]/i.test(line)) return true;
      if (/^\d+[\.)\-]\s+/.test(line)) return true;
      if (line.startsWith('\u00bf')) return true;
      return false;
    };

    const extractQuestionText = (line: string): string => {
      let match = line.match(/^Pregunta\s+\d+[\.:]+\s*(.*)/i);
      if (match) return match[1].trim();
      match = line.match(/^\d+[\.)\-]\s+(.*)/);
      if (match) return match[1].trim();
      return line;
    };

    for (const line of lines) {
      // Determine if line is a question — but with smart continuation logic
      let lineIsQuestion = false;
      if (optionRegex.test(line) || dashOptionRegex.test(line)) {
        lineIsQuestion = false;
      } else if (/^Pregunta\s+\d+[\.:]/i.test(line)) {
        lineIsQuestion = true;
      } else if (/^\d+[\.\)\-]\s+/.test(line)) {
        lineIsQuestion = true;
      } else if (line.startsWith('\u00bf')) {
        // ¿ only starts a NEW question if there's no current question,
        // or if the current question already has options (meaning it's complete)
        lineIsQuestion = !currentQuestion || currentQuestion.opciones.length > 0;
      }

      if (lineIsQuestion) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          textoPregunta: extractQuestionText(line),
          opciones: [] as any[],
          respuestasCorrectas: [] as string[],
          puntaje: 1
        };
      } else if ((optionRegex.test(line) || dashOptionRegex.test(line)) && currentQuestion) {
        let optText = '';
        const letterMatch = line.match(optionRegex);
        const dashMatch = line.match(dashOptionRegex);
        if (letterMatch) optText = letterMatch[2].trim();
        else if (dashMatch) optText = dashMatch[1].trim();

        let score = 0;
        let isCorrect = false;

        const scoreMatch = optText.match(scoreInOptionRegex);
        if (scoreMatch) {
          score = parseInt(scoreMatch[1], 10);
          optText = optText.replace(scoreInOptionRegex, '').trim();
        }

        if (/\(correcta\)|\(x\)|\[x\]|\*$/i.test(optText)) {
          isCorrect = true;
          optText = optText.replace(/\(correcta\)|\(x\)|\[x\]|\*$/ig, '').trim();
        }

        currentQuestion.opciones.push({ texto: optText, puntaje: score, correcta: isCorrect });
        if (isCorrect) currentQuestion.respuestasCorrectas.push(optText);
        if (score > currentQuestion.puntaje) currentQuestion.puntaje = score;

      } else if (currentQuestion) {
        const scoreLineMatch = line.match(/^(?:puntaje|valor)\s*[:=]\s*(\d+)$/i);
        if (scoreLineMatch) {
          currentQuestion.puntaje = parseInt(scoreLineMatch[1], 10);
        } else if (!/^(respuestas|opciones)/i.test(line)) {
          // Si ya hay opciones, la línea suelta es continuación de la última opción
          if (currentQuestion.opciones.length > 0) {
            const lastOpt = currentQuestion.opciones[currentQuestion.opciones.length - 1];
            // Verificar si la línea contiene un puntaje suelto como "(Puntaje: 5)"
            const inlineScore = line.match(scoreInOptionRegex);
            if (inlineScore) {
              const score = parseInt(inlineScore[1], 10);
              lastOpt.puntaje = score;
              const cleanedText = line.replace(scoreInOptionRegex, '').trim();
              if (cleanedText) lastOpt.texto += ' ' + cleanedText;
              if (score > currentQuestion.puntaje) currentQuestion.puntaje = score;
            } else {
              lastOpt.texto += ' ' + line;
            }
          } else {
            // Si no hay opciones aún, es continuación de la pregunta
            currentQuestion.textoPregunta += '\n' + line;
          }
        }
      }
    }

    if (currentQuestion) questions.push(currentQuestion);
    return questions;
  }

  agregarOpcionPregunta(preguntaIndex: number) {
    const opcionesArray = this.getOpcionesArray(preguntaIndex);
    opcionesArray.push(this.fb.group({
      texto: ['Nueva Opción', Validators.required],
      correcta: [false],
      puntaje: [0]
    }));
  }

  removerOpcion(preguntaIdx: number, opcionIdx: number) {
    this.getOpcionesArray(preguntaIdx).removeAt(opcionIdx);
  }

  removerPregunta(i: number) {
    this.preguntasArray.removeAt(i);
  }

  // --- RANGOS Y METODOS (Tarjeta 4)
  crearRango(): FormGroup {
    return this.fb.group({
      min: [0, Validators.required],
      max: [100, Validators.required],
      resultadoAsociado: ['', Validators.required],
      descripcionResultado: ['']
    });
  }

  agregarRango() {
    this.rangosPuntaje.insert(0, this.crearRango());
  }

  removerRango(i: number) {
    this.rangosPuntaje.removeAt(i);
  }

  toggleMetodo(metodo: string) {
    const ctrl = this.resultados.get('metodosEntrega');
    let current: string[] = ctrl?.value || [];
    if (current.includes(metodo)) {
      current = current.filter(m => m !== metodo);
    } else {
      current.push(metodo);
    }
    ctrl?.setValue(current);
  }

  // --- EVENTOS MODALES APROBACIÓN TRES PASOS ---
  abrirPrevisualizacion() {
    this.previewQuestionIndex = 0;
    this.showPreviewModal = true;
  }

  cerrarPrevisualizacion() {
    this.showPreviewModal = false;
  }

  cerrarShareModal() {
    this.showShareModal = false;
    this.router.navigate(['/admin-home/tests']);
  }

  copiarEnlaceModal() {
    navigator.clipboard.writeText(this.currentSurveyUrl).then(() => {
      alert('¡Enlace copiado al portapapeles!');
    });
  }

  // Fallback for HTML template step 8
  previsualizarTest() {
    window.open(`/test-access/${this.testId}`, '_blank');
  }

  // --- MÉTODOS DE IMAGEN DE FONDO PERSONALIZADA
  triggerBackgroundUpload(bgFileInput: HTMLInputElement) {
    bgFileInput.click();
  }

  onBackgroundSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const maxSizeKB = 500;
      if (file.size > maxSizeKB * 1024) {
        alert(`La imagen de fondo excede el límite de ${maxSizeKB}KB. Tu archivo pesa ${Math.round(file.size / 1024)}KB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.plantilla.patchValue({
          backgroundTemplate: 'custom-image',
          customBackgroundUrl: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const maxSizeKB = 200;
      if (file.size > maxSizeKB * 1024) {
        alert(`El logo excede el límite de ${maxSizeKB}KB. Tu archivo pesa ${Math.round(file.size / 1024)}KB. Usa una imagen más liviana (PNG optimizado).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.plantilla.patchValue({
          companyLogoUrl: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeCompanyLogo() {
    this.plantilla.patchValue({ companyLogoUrl: null });
  }

  compartirTest() {
    const link = `${window.location.origin}/test-access/${this.testId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("Enlace copiado al portapapeles: " + link);
    });
  }
}
