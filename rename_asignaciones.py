import re

ts_path = "src/app/features/desktop/asignaciones/asignaciones.ts"
scss_path = "src/app/features/desktop/asignaciones/asignaciones.scss"

with open(ts_path, 'r') as f:
    ts = f.read()

# Models
ts = ts.replace("import { ClinicaService } from '../../../core/services/clinica.service';", "import { AsignacionesService } from '../../../core/services/asignaciones.service';")
ts = ts.replace("import {\n  Patient, Appointment, ClinicalNote, ClinicalHistory,\n  APPOINTMENT_TYPES, NOTE_TYPES, STATUS_CONFIG, RISK_LEVELS,\n  WEEKDAYS, WEEKDAYS_SHORT, AppointmentType, AppointmentStatus, NoteType,\n  RedFlag, RedFlagType, RED_FLAG_TYPES, NoteTemplate, DEFAULT_NOTE_TEMPLATES\n} from '../../../core/models/clinica.model';", "import {\n  Technician, Assignment, ASSIGNMENT_TYPES, STATUS_CONFIG, WEEKDAYS, WEEKDAYS_SHORT, AssignmentType, AssignmentStatus\n} from '../../../core/models/asignaciones.model';")

# Replace components
ts = ts.replace("@Component({\n  selector: 'app-clinica',", "@Component({\n  selector: 'app-asignaciones',")
ts = ts.replace("styleUrl: 'clinica.scss',", "styleUrl: 'asignaciones.scss',")
ts = ts.replace("class ClinicaComponent", "class AsignacionesComponent")
ts = ts.replace("clinicaService", "asignacionesService")
ts = ts.replace("ClinicaService", "AsignacionesService")

# Module names
ts = ts.replace("Módulo Clínica", "Módulo Asignaciones")
ts = ts.replace("Gestión de pacientes, citas e historias clínicas", "Asignación de órdenes a técnicos")

# Tab names
ts = ts.replace("type MainTab = 'agenda' | 'pacientes' | 'expediente' | 'config';", "type MainTab = 'agenda' | 'tecnicos' | 'config';")
ts = ts.replace("'pacientes'", "'tecnicos'")
ts = ts.replace("Pacientes", "Técnicos")
ts = ts.replace("patientSearch", "technicianSearch")
ts = ts.replace("Patient", "Technician")
ts = ts.replace("patient", "technician")
ts = ts.replace("PatientName", "TechnicianName")
ts = ts.replace("patientName", "technicianName")

# Appointments to Assignments
ts = ts.replace("Appointment", "Assignment")
ts = ts.replace("appointment", "assignment")
ts = ts.replace("APPOINTMENT_TYPES", "ASSIGNMENT_TYPES")
ts = ts.replace("Appt", "Asg")
ts = ts.replace("appt", "asg")
ts = ts.replace("citasHoy", "asignacionesHoy")
ts = ts.replace("Citas Hoy", "Asignac. Hoy")
ts = ts.replace("primeraVezHoy", "tecnicosActivos")
ts = ts.replace("Primera Vez", "Técnicos")
ts = ts.replace("ingresosMes", "completadasHoy")
ts = ts.replace("Ingresos Mes", "Completadas")
ts = ts.replace("proxCita", "proxAsignacion")
ts = ts.replace("proximaCita", "proximaAsignacion")

# Delete expediente references in template
ts = re.sub(r'<!-- ═══════ TAB: EXPEDIENTE ═══════ -->.*?</div>\s*<!-- ═══════ TAB: CONFIG ═══════ -->', '<!-- ═══════ TAB: CONFIG ═══════ -->', ts, flags=re.DOTALL)
ts = re.sub(r'<button class="tab-btn" \[class\.active\]="activeTab\(\) === \'expediente\'".*?</button>', '', ts, flags=re.DOTALL)
ts = re.sub(r'openExpediente\(.*?\).*?}', '', ts, flags=re.DOTALL)
ts = re.sub(r'type ExpTab = .*?;', '', ts, flags=re.DOTALL)
ts = re.sub(r'expTab = .*?;', '', ts, flags=re.DOTALL)

with open(ts_path, 'w') as f:
    f.write(ts)

with open(scss_path, 'r') as f:
    scss = f.read()
    
scss = scss.replace("clinica", "asignaciones")
scss = scss.replace("patient", "technician")
scss = scss.replace("appt", "asg")

with open(scss_path, 'w') as f:
    f.write(scss)
