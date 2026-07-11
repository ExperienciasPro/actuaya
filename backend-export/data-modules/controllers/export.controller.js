const Suscriptor = require('../models/suscriptor.model');
const Admision = require('../models/admision.model');
const Gestor = require('../models/gestor.model');
const Test = require('../models/test.model');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Utilidad para escapar y formatear valores en CSV
const formatCsvValue = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    return `"${str}"`;
};

const crypto = require('crypto');

/**
 * Guarda un data:image/... base64 como archivo PNG en /uploads/signatures/
 * Retorna la ruta relativa del archivo guardado.
 */
const saveBase64AsImage = (base64DataUri, req) => {
    try {
        // Extraer la parte base64 pura
        const matches = base64DataUri.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
        if (!matches) return '[Imagen no válida]';

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Crear directorio si no existe
        const sigDir = path.join(__dirname, '..', 'uploads', 'signatures');
        if (!fs.existsSync(sigDir)) {
            fs.mkdirSync(sigDir, { recursive: true });
        }

        // Generar nombre único
        const hash = crypto.createHash('md5').update(base64Data.substring(0, 200)).digest('hex').substring(0, 12);
        const fileName = `firma_${hash}.${ext}`;
        const filePath = path.join(sigDir, fileName);

        // Solo escribir si no existe (evitar duplicados)
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, buffer);
        }

        // Retornar URL completa
        const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
        return `${baseUrl}/api/uploads/signatures/${fileName}`;
    } catch (e) {
        console.error('Error guardando imagen base64:', e.message);
        return '[Error al procesar imagen]';
    }
};

exports.downloadUsers = async (req, res) => {
    try {
        const users = await Suscriptor.find().lean();
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios_inscritos.csv');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.write('\uFEFF');
        let header = "ID,Nombre,Email,Acepta Legales,Fecha Registro\n";
        res.write(header);

        users.forEach(u => {
            const row = [
                u._id,
                u.nombre,
                u.email,
                u.acepta_legales ? 'Sí' : 'No',
                u.createdAt ? new Date(u.createdAt).toISOString() : ''
            ].map(formatCsvValue).join(',');
            res.write(row + '\n');
        });

        res.end();
    } catch (error) {
        console.error('Error exportando usuarios:', error);
        res.status(500).json({ error: 'Fallo al exportar usuarios' });
    }
};

exports.downloadResults = async (req, res) => {
    try {
        const results = await Admision.find({ estado: 'Finalizado' }).lean();
        res.setHeader('Content-Disposition', 'attachment; filename=resultados_admisiones.csv');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.write('\uFEFF'); // BOM UTF-8 para Excel

        // Obtener los tests únicos referenciados y sus preguntas
        const testIds = [...new Set(results.map(r => r.testAsignado).filter(Boolean))];
        let testMap = {}; // testId -> { name, questionMap }

        for (const tid of testIds) {
            const isMongoId = /^[a-fA-F0-9]{24}$/.test(tid);
            if (isMongoId) {
                try {
                    const testDoc = await Test.findById(tid).lean();
                    if (testDoc) {
                        let qMap = {};
                        let oLabelMap = {}; // optionLabelMap per question
                        let orderedQs = []; // for positional fallback
                        if (testDoc.preguntas && Array.isArray(testDoc.preguntas)) {
                            let qNumber = 0;
                            testDoc.preguntas.forEach(p => {
                                // Filtrar preguntas de sistema
                                if (p.tipo === 'system_settings' || p.id === 'SYSTEM_SETTINGS' || p.textoPregunta === 'SYSTEM_SETTINGS') return;
                                qNumber++;
                                const qText = `${qNumber}. ${p.textoPregunta || p.label || p.pregunta || 'Pregunta'}`;

                                const possibleIds = [];
                                if (p.id) possibleIds.push(String(p.id));
                                if (p._id) possibleIds.push(String(p._id));

                                // Construir mapa de opciones
                                const oMap = {};
                                if (p.opciones && Array.isArray(p.opciones)) {
                                    p.opciones.forEach((opt, oIdx) => {
                                        const isObj = typeof opt === 'object' && opt !== null;
                                        const label = isObj ? (opt.label || opt.texto || opt.value || String(opt)) : String(opt);
                                        oMap[String(oIdx)] = label;
                                        oMap[label] = label;
                                    });
                                }

                                possibleIds.forEach(pid => {
                                    qMap[pid] = qText;
                                    if (Object.keys(oMap).length > 0) oLabelMap[pid] = oMap;
                                });

                                orderedQs.push({ qText, oMap });
                            });
                        }
                        testMap[tid] = { name: testDoc.nombre || testDoc.title || tid, questionMap: qMap, optionLabelMap: oLabelMap, orderedQuestions: orderedQs, rangosPuntaje: testDoc.rangosPuntaje || [] };
                    }
                } catch (e) { /* skip invalid ids */ }
            }
            if (!testMap[tid]) {
                testMap[tid] = { name: tid, questionMap: {}, optionLabelMap: {}, orderedQuestions: [], rangosPuntaje: [] };
            }
        }

        // Helper: resolver valor de respuesta a texto legible
        const resolveAnswerValueForTest = (testId, questionId, rawValue) => {
            if (rawValue === null || rawValue === undefined || rawValue === '') return '';
            const val = String(rawValue);
            if (val.startsWith('data:image') || val.startsWith('/api/uploads') || val.startsWith('/uploads') || val.startsWith('http')) return val;
            const test = testMap[testId];
            if (!test || !test.optionLabelMap) return val;
            const oMap = test.optionLabelMap[questionId];
            if (!oMap) return val;
            if (val.includes(',')) {
                return val.split(',').map(p => oMap[p.trim()] || p.trim()).join(', ');
            }
            if (oMap[val] !== undefined) return oMap[val];
            return val;
        };

        // Recopilar todos los IDs de preguntas encontrados en todas las respuestas
        let allQuestionIds = [];
        let seenIds = new Set();
        results.forEach(r => {
            if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                r.resultadosCompletos.forEach(ans => {
                    const qId = String(ans.questionId);
                    if (!seenIds.has(qId)) {
                        seenIds.add(qId);
                        allQuestionIds.push(qId);
                    }
                });
            }
        });        // Positional fallback for unmatched question IDs
        allQuestionIds.forEach(qId => {
            let matched = false;
            for (const tid of testIds) {
                if (testMap[tid] && testMap[tid].questionMap[qId]) { matched = true; break; }
            }
            if (!matched) {
                // Try positional matching using the first test that has orderedQuestions
                for (const tid of testIds) {
                    const test = testMap[tid];
                    if (test && test.orderedQuestions && test.orderedQuestions.length > 0) {
                        // Find position of this qId in allQuestionIds
                        const posIdx = allQuestionIds.indexOf(qId);
                        if (posIdx >= 0 && posIdx < test.orderedQuestions.length) {
                            test.questionMap[qId] = test.orderedQuestions[posIdx].qText;
                            if (Object.keys(test.orderedQuestions[posIdx].oMap).length > 0) {
                                test.optionLabelMap[qId] = test.orderedQuestions[posIdx].oMap;
                            }
                        }
                        break;
                    }
                }
            }
        });

        // Crear mapa global de etiquetas de preguntas
        const questionLabels = allQuestionIds.map(qId => {
            // Buscar en todos los tests
            for (const tid of testIds) {
                if (testMap[tid] && testMap[tid].questionMap[qId]) {
                    return testMap[tid].questionMap[qId];
                }
            }
            return `Pregunta ${qId}`;
        });

        // Detectar si hay datos demográficos reales en algún registro
        const invalidGenders = ['NR', 'No definido', 'no definido', '', 'undefined', 'null'];
        const hasGender = results.some(r => r.generoInfo && !invalidGenders.includes(r.generoInfo));
        const hasBirthYear = results.some(r => r.anioNacimientoInfo && r.anioNacimientoInfo !== 'NR' && r.anioNacimientoInfo !== '');
        const hasTime = results.some(r => r.tiempoTranscurrido && r.tiempoTranscurrido > 0);
        const hasPuntaje = results.some(r => r.puntaje && r.puntaje > 0);
        // Check if any test has rangosPuntaje configured
        const hasRangos = Object.values(testMap).some(t => t.rangosPuntaje && t.rangosPuntaje.length > 0);

        // Helper: find resultado name for a given score using the test's rangosPuntaje
        const getResultadoForTest = (testId, puntaje) => {
            if (puntaje === undefined || puntaje === null) return '';
            const test = testMap[testId];
            if (!test || !test.rangosPuntaje || test.rangosPuntaje.length === 0) return '';
            const matched = test.rangosPuntaje.find(rg => puntaje >= rg.min && puntaje <= rg.max);
            return matched ? (matched.resultadoAsociado || '') : '';
        };

        // Recopilar TODAS las claves de datosFormulario de todos los registros
        const formFieldsSet = new Set();
        results.forEach(r => {
            if (r.datosFormulario && typeof r.datosFormulario === 'object') {
                Object.keys(r.datosFormulario).forEach(key => {
                    // Excluir campos internos/técnicos
                    if (key !== '_id' && key !== '__v') {
                        formFieldsSet.add(key);
                    }
                });
            }
        });
        const formFields = Array.from(formFieldsSet);

        // Mapeo de claves de formulario a etiquetas legibles
        const formFieldLabels = formFields.map(key => {
            const labelMap = {
                nombre: 'Nombre', correo: 'Correo', email: 'Email',
                telefono: 'Teléfono', celular: 'Celular', cedula: 'Cédula',
                documento: 'Documento', identificacion: 'Identificación',
                cargo: 'Cargo', empresa: 'Empresa', area: 'Área',
                ciudad: 'Ciudad', departamento: 'Departamento', pais: 'País',
                edad: 'Edad', genero: 'Género', sexo: 'Sexo',
                nivel_educativo: 'Nivel Educativo', profesion: 'Profesión',
                experiencia: 'Experiencia', direccion: 'Dirección'
            };
            return labelMap[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1);
        });

        // Construir headers dinámicos
        let metaHeaders = ['N°', 'Candidato', 'Instrumento'];
        if (hasPuntaje) metaHeaders.push('Puntaje');
        if (hasPuntaje && hasRangos) metaHeaders.push('Resultado');
        // Insertar columnas de formulario
        if (formFields.length > 0) {
            metaHeaders.push(...formFieldLabels);
        }
        if (hasGender) metaHeaders.push('Género');
        if (hasBirthYear) metaHeaders.push('Año Nacimiento');
        if (hasTime) metaHeaders.push('Tiempo (seg)');
        metaHeaders.push('Fecha');

        let header = metaHeaders.map(h => formatCsvValue(h)).join(',') + ',' +
            questionLabels.map(ql => formatCsvValue(ql)).join(',') + "\n";
        res.write(header);

        results.forEach((r, idx) => {
            const testInfo = testMap[r.testAsignado] || { name: r.testAsignado || 'N/A' };

            let answersByQuestion = {};
            if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                r.resultadosCompletos.forEach(ans => {
                    let val = ans.value;
                    if (val && typeof val === 'string' && val.startsWith('data:image')) {
                        val = saveBase64AsImage(val, req);
                    } else if (val && typeof val === 'string' && (val.startsWith('/api/uploads') || val.startsWith('/uploads'))) {
                        val = `${req.protocol}://${req.get('host')}${val}`;
                    } else {
                        // Resolve numeric option IDs to text labels
                        val = resolveAnswerValueForTest(r.testAsignado, String(ans.questionId), val);
                    }
                    answersByQuestion[String(ans.questionId)] = val;
                });
            }

            // Resolve candidate name: prefer datosFormulario.nombre, then nombreCandidato, fallback to generic
            let candidateName = `Respuesta #${idx + 1}`;
            if (r.datosFormulario && r.datosFormulario.nombre && r.datosFormulario.nombre !== 'Evaluado') {
                candidateName = r.datosFormulario.nombre;
            } else if (r.nombreCandidato && r.nombreCandidato !== 'Evaluado' && !/^TEST-/.test(r.nombreCandidato)) {
                candidateName = r.nombreCandidato;
            }

            let metaValues = [idx + 1, candidateName, testInfo.name];
            if (hasPuntaje) metaValues.push(r.puntaje || 0);
            if (hasPuntaje && hasRangos) metaValues.push(getResultadoForTest(r.testAsignado, r.puntaje));
            // Insertar valores de formulario dinámicamente
            if (formFields.length > 0) {
                formFields.forEach(key => {
                    const val = (r.datosFormulario && r.datosFormulario[key]) || '';
                    metaValues.push(typeof val === 'object' ? JSON.stringify(val) : val);
                });
            }
            if (hasGender) metaValues.push(r.generoInfo || '');
            if (hasBirthYear) metaValues.push(r.anioNacimientoInfo || '');
            if (hasTime) metaValues.push(r.tiempoTranscurrido || 0);
            metaValues.push(r.fechaFinalizacion ? new Date(r.fechaFinalizacion).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toISOString() : ''));

            const row = [
                ...metaValues,
                ...allQuestionIds.map(qId => answersByQuestion[qId] || '')
            ].map(formatCsvValue).join(',');
            res.write(row + '\n');
        });

        res.end();
    } catch (error) {
        console.error('Error exportando resultados:', error);
        res.status(500).json({ error: 'Fallo al exportar resultados' });
    }
};

exports.downloadSurveysCSV = async (req, res) => {
    try {
        const surveyId = req.query.surveyId;
        let filter = { estado: 'Finalizado' };
        if (surveyId) {
            filter.testAsignado = surveyId;
        } else {
            filter.tokenUnico = { $regex: /^ENC-/ };
        }

        const responses = await Admision.find(filter).lean();

        // Obtener la definición del test para mapear IDs a textos de preguntas
        let questionMap = {};
        let optionLabelMap = {}; // { questionId: { '0': 'Label A', '1': 'Label B', ... } }
        let questionTypeMap = {}; // { questionId: tipo }
        let orderedQuestions = []; // For positional fallback
        let surveyName = 'Encuesta';
        let rangosPuntaje = [];
        if (surveyId) {
            const testDoc = await Test.findById(surveyId).lean();
            if (testDoc) {
                surveyName = testDoc.nombre || testDoc.title || 'Encuesta';
                rangosPuntaje = testDoc.rangosPuntaje || [];
                if (testDoc.preguntas && Array.isArray(testDoc.preguntas)) {
                    let qNumber = 0;
                    testDoc.preguntas.forEach(p => {
                        // Filtrar preguntas de sistema
                        if (p.tipo === 'system_settings' || p.id === 'SYSTEM_SETTINGS' || p.textoPregunta === 'SYSTEM_SETTINGS') return;
                        qNumber++;
                        const qText = `${qNumber}. ${p.textoPregunta || p.label || p.pregunta || 'Pregunta'}`;

                        // Build options map for this question
                        let oMap = {};
                        if (p.opciones && Array.isArray(p.opciones)) {
                            p.opciones.forEach((opt, oIdx) => {
                                const isObj = typeof opt === 'object' && opt !== null;
                                const label = isObj ? (opt.label || opt.texto || opt.value || String(opt)) : String(opt);
                                oMap[String(oIdx)] = label;
                                oMap[label] = label;
                            });
                        }

                        // Register under ALL possible ID formats
                        const possibleIds = [];
                        if (p.id) possibleIds.push(String(p.id));
                        if (p._id) possibleIds.push(String(p._id));

                        possibleIds.forEach(pid => {
                            questionMap[pid] = qText;
                            questionTypeMap[pid] = p.tipo || '';
                            if (Object.keys(oMap).length > 0) optionLabelMap[pid] = oMap;
                        });

                        // Store ordered for positional fallback
                        orderedQuestions.push({ qText, oMap, tipo: p.tipo || '' });
                    });
                }
            }
        }

        // Helper: resolver valor de respuesta a texto legible usando un option map
        const resolveWithMap = (oMap, rawValue) => {
            if (rawValue === null || rawValue === undefined || rawValue === '') return '';

            // Handle array values (some frontends store multi-select as arrays)
            if (Array.isArray(rawValue)) {
                if (oMap && Object.keys(oMap).length > 0) {
                    return rawValue.map(v => oMap[String(v)] || String(v)).join(', ');
                }
                return rawValue.join(', ');
            }

            const val = String(rawValue);

            // Si es imagen o archivo, no resolver
            if (val.startsWith('data:image') || val.startsWith('/api/uploads') || val.startsWith('/uploads') || val.startsWith('http')) {
                return val;
            }

            if (!oMap || Object.keys(oMap).length === 0) return val;

            // Multi-select (comma-separated IDs like "0,2,3")
            if (val.includes(',')) {
                const parts = val.split(',');
                const resolved = parts.map(p => oMap[p.trim()] || p.trim());
                return resolved.join(', ');
            }

            // Single value
            if (oMap[val] !== undefined) return oMap[val];

            return val;
        };

        res.setHeader('Content-Disposition', `attachment; filename=resultados_${surveyName.replace(/\s+/g, '_').substring(0, 30)}_${surveyId || 'all'}.csv`);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // BOM for Excel UTF-8 compatibility
        res.write('\uFEFF');

        // ═══════════════════════════════════════════════════════════════
        // PROTECTED SECTION — See /csv-export-protection workflow
        // BUILD CSV COLUMNS FROM TEST DEFINITION (preserves correct order)
        // DO NOT change to response-based column building!
        // ═══════════════════════════════════════════════════════════════
        // Each column = one question from the definition, with ALL possible
        // ID variants for matching against response answer records.
        let csvColumns = []; // Array of { label, ids: Set, oMap }

        if (orderedQuestions.length > 0) {
            // We have the test definition — use it as source of truth
            // orderedQuestions was built from testDoc.preguntas in order
            // But we also need the raw IDs. Let me rebuild from testDoc.
        }

        // Rebuild columns directly from testDoc for maximum ID coverage
        if (surveyId) {
            const testDoc2 = await Test.findById(surveyId).lean();
            if (testDoc2 && testDoc2.preguntas) {
                let qNum = 0;
                testDoc2.preguntas.forEach(p => {
                    if (p.tipo === 'system_settings' || p.id === 'SYSTEM_SETTINGS' || p.textoPregunta === 'SYSTEM_SETTINGS') return;
                    qNum++;
                    const qText = `${qNum}. ${p.textoPregunta || p.label || p.pregunta || 'Pregunta'}`;

                    // Collect ALL possible IDs for this question
                    const ids = new Set();
                    if (p.id) ids.add(String(p.id));
                    if (p._id) ids.add(String(p._id));

                    // Build option map
                    const oMap = {};
                    if (p.opciones && Array.isArray(p.opciones)) {
                        p.opciones.forEach((opt, oIdx) => {
                            const isObj = typeof opt === 'object' && opt !== null;
                            const label = isObj ? (opt.label || opt.texto || opt.value || String(opt)) : String(opt);
                            oMap[String(oIdx)] = label;
                            oMap[label] = label;
                        });
                    }

                    csvColumns.push({ label: qText, ids, oMap });
                });
            }
        }

        // If no test definition available, fallback to response-based columns
        if (csvColumns.length === 0) {
            let seenIds = new Set();
            responses.forEach(r => {
                if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                    r.resultadosCompletos.forEach(ans => {
                        const qId = String(ans.questionId);
                        if (!seenIds.has(qId)) {
                            seenIds.add(qId);
                            csvColumns.push({
                                label: questionMap[qId] || `Pregunta ${qId}`,
                                ids: new Set([qId]),
                                oMap: optionLabelMap[qId] || {}
                            });
                        }
                    });
                }
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // PROTECTED SECTION — See /csv-export-protection workflow
        // INTELLIGENT ID CROSS-REFERENCE
        // DO NOT remove or simplify this cross-reference logic!
        // ═══════════════════════════════════════════════════════════════
        // Problem: When a survey is re-saved, Mongoose regenerates subdocument
        // _ids. Old responses have old _ids that no longer match the definition.
        // Solution: Match unmatched response questionIds to unmatched definition
        // columns by their relative position.

        // 1. Collect ALL unique questionIds from ALL responses
        const allResponseQids = new Set();
        responses.forEach(r => {
            if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                r.resultadosCompletos.forEach(ans => {
                    allResponseQids.add(String(ans.questionId));
                });
            }
        });

        // 2. Direct ID matching: which response questionIds match which csvColumns?
        const matchedColIndices = new Set();
        const matchedRqIds = new Set();
        allResponseQids.forEach(rqId => {
            csvColumns.forEach((col, colIdx) => {
                if (col.ids.has(rqId)) {
                    matchedRqIds.add(rqId);
                    matchedColIndices.add(colIdx);
                }
            });
        });

        // 3. Find unmatched response questionIds and unmatched definition columns
        const unmatchedRqIds = [...allResponseQids].filter(id => !matchedRqIds.has(id));
        const unmatchedColIndices = csvColumns.map((_, i) => i).filter(i => !matchedColIndices.has(i));

        console.log(`[CSV Export] Total csvColumns: ${csvColumns.length}, matched: ${matchedColIndices.size}, unmatched columns: ${unmatchedColIndices.length}, unmatched response IDs: ${unmatchedRqIds.length}`);

        // 4. Position-based fallback for unmatched IDs
        // Collect unmatched response questionIds in their natural occurrence order
        if (unmatchedRqIds.length > 0 && unmatchedColIndices.length > 0) {
            const orderedUnmatchedRqIds = [];
            // Use the first response as reference for ordering
            for (const r of responses) {
                if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                    r.resultadosCompletos.forEach(ans => {
                        const qId = String(ans.questionId);
                        if (unmatchedRqIds.includes(qId) && !orderedUnmatchedRqIds.includes(qId)) {
                            orderedUnmatchedRqIds.push(qId);
                        }
                    });
                    if (orderedUnmatchedRqIds.length >= unmatchedRqIds.length) break;
                }
            }

            // Map by relative position: unmatchedRqIds[0] -> unmatchedColIndices[0], etc.
            orderedUnmatchedRqIds.forEach((rqId, i) => {
                if (i < unmatchedColIndices.length) {
                    const colIdx = unmatchedColIndices[i];
                    csvColumns[colIdx].ids.add(rqId);
                    console.log(`[CSV Export] Cross-ref: response ID "${rqId.substring(0, 20)}..." → column ${colIdx} "${csvColumns[colIdx].label.substring(0, 50)}"`);
                }
            });
        }

        // Question labels for CSV header
        const questionLabels = csvColumns.map(col => col.label);

        // Detectar si hay datos demográficos reales
        const invalidGenders = ['NR', 'No definido', 'no definido', '', 'undefined', 'null'];
        const hasGender = responses.some(r => r.generoInfo && !invalidGenders.includes(r.generoInfo));
        const hasBirthYear = responses.some(r => r.anioNacimientoInfo && r.anioNacimientoInfo !== 'NR' && r.anioNacimientoInfo !== '');
        const hasTime = responses.some(r => r.tiempoTranscurrido && r.tiempoTranscurrido > 0);
        const hasPuntaje = responses.some(r => r.puntaje !== undefined && r.puntaje !== null);
        const hasRangos = rangosPuntaje.length > 0;

        // Helper: buscar resultado final según rangos de puntaje
        const getResultadoFinal = (puntaje) => {
            if (puntaje === undefined || puntaje === null || !hasRangos) return '';
            const matched = rangosPuntaje.find(rg => puntaje >= rg.min && puntaje <= rg.max);
            return matched ? (matched.resultadoAsociado || '') : '';
        };

        // Detectar campos de formulario vinculado
        let formKeys = [];
        let formKeyLabels = {};
        const formLabelMap = {
            'nombre': 'Nombre',
            'correo': 'Correo',
            'email': 'Correo',
            'empresa': 'Empresa / Organización',
            'telefono': 'Teléfono',
            'cargo': 'Cargo',
            'cedula': 'Cédula / Documento',
            'documento': 'Cédula / Documento',
            'ciudad': 'Ciudad',
            'area': 'Área'
        };
        const formKeysSet = new Set();
        responses.forEach(r => {
            if (r.datosFormulario && typeof r.datosFormulario === 'object') {
                Object.keys(r.datosFormulario).forEach(k => {
                    if (!formKeysSet.has(k)) {
                        formKeysSet.add(k);
                        formKeys.push(k);
                        formKeyLabels[k] = formLabelMap[k.toLowerCase()] || k;
                    }
                });
            }
        });
        const hasFormData = formKeys.length > 0;
        // Also check nombreCandidato if no form data but has real names
        const hasRealNames = !hasFormData && responses.some(r => r.nombreCandidato && r.nombreCandidato !== 'Evaluado');

        // Construir headers dinámicos
        let metaHeaders = ['N°'];
        if (hasFormData) {
            formKeys.forEach(k => metaHeaders.push(formKeyLabels[k]));
        } else if (hasRealNames) {
            metaHeaders.push('Candidato');
        }
        metaHeaders.push('Instrumento');
        if (hasPuntaje) metaHeaders.push('Puntuación Total');
        if (hasPuntaje && hasRangos) metaHeaders.push('Resultado Final');
        if (hasGender) metaHeaders.push('Género');
        if (hasBirthYear) metaHeaders.push('Año Nacimiento');
        if (hasTime) metaHeaders.push('Tiempo (seg)');
        metaHeaders.push('Fecha');

        let header = metaHeaders.join(',') + ',' +
            questionLabels.map(ql => formatCsvValue(ql)).join(',') + "\n";
        res.write(header);

        responses.forEach((r, idx) => {
            // Build a lookup: questionId -> raw answer value
            const rawAnswers = {};
            if (r.resultadosCompletos && Array.isArray(r.resultadosCompletos)) {
                r.resultadosCompletos.forEach(ans => {
                    rawAnswers[String(ans.questionId)] = ans.value;
                });
            }

            let metaValues = [idx + 1];
            if (hasFormData) {
                formKeys.forEach(k => {
                    metaValues.push(r.datosFormulario ? (r.datosFormulario[k] || '') : '');
                });
            } else if (hasRealNames) {
                metaValues.push(r.nombreCandidato || '');
            }
            metaValues.push(surveyName);
            if (hasPuntaje) metaValues.push(r.puntaje !== undefined && r.puntaje !== null ? r.puntaje : '');
            if (hasPuntaje && hasRangos) metaValues.push(getResultadoFinal(r.puntaje));
            if (hasGender) metaValues.push(r.generoInfo || '');
            if (hasBirthYear) metaValues.push(r.anioNacimientoInfo || '');
            if (hasTime) metaValues.push(r.tiempoTranscurrido || 0);
            metaValues.push(r.fechaFinalizacion ? new Date(r.fechaFinalizacion).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toISOString() : ''));

            // For each CSV column, find the answer by checking ALL possible IDs
            const questionValues = csvColumns.map(col => {
                let rawVal = undefined;
                // Try each registered ID for this column
                for (const colId of col.ids) {
                    if (rawAnswers[colId] !== undefined) {
                        rawVal = rawAnswers[colId];
                        break;
                    }
                }
                if (rawVal === undefined || rawVal === null) return '';

                // Handle images/files
                if (typeof rawVal === 'string' && rawVal.startsWith('data:image')) {
                    return saveBase64AsImage(rawVal, req);
                }
                if (typeof rawVal === 'string' && (rawVal.startsWith('/api/uploads') || rawVal.startsWith('/uploads'))) {
                    return `${req.protocol}://${req.get('host')}${rawVal}`;
                }

                // Resolve option indices to text labels
                return resolveWithMap(col.oMap, rawVal);
            });

            const rowStr = [
                ...metaValues,
                ...questionValues
            ].map(formatCsvValue).join(',');

            res.write(rowStr + '\n');
        });

        res.end();
    } catch (error) {
        console.error('Error exportando resultados CSV:', error);
        res.status(500).json({ error: 'Fallo al exportar encuestas CSV' });
    }
};

exports.downloadSurveysZIP = async (req, res) => {
    try {
        const surveyId = req.query.surveyId;
        let filter = { estado: 'Finalizado' };
        if (surveyId) filter.testAsignado = surveyId;
        else filter.tokenUnico = { $regex: /^ENC-/ };

        const responses = await Admision.find(filter).lean();

        res.setHeader('Content-Disposition', `attachment; filename=archivos_encuestas_${surveyId || 'all'}.zip`);
        res.setHeader('Content-Type', 'application/zip');

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', function (err) {
            console.error('Archiver error:', err);
            res.status(500).send({ error: err.message });
        });

        archive.on('warning', function (err) {
            console.warn('Archiver warning:', err);
        });

        archive.pipe(res);

        let filesFound = 0;
        responses.forEach(r => {
            if (r.resultadosCompletos) {
                r.resultadosCompletos.forEach(ans => {
                    let val = ans.value;
                    if (val && (val.startsWith('/api/uploads') || val.startsWith('/uploads'))) {
                        let relativePath = val.replace('/api/uploads/surveys/', '');
                        relativePath = relativePath.replace('/uploads/surveys/', '');

                        const absolutePath = path.join(__dirname, '..', 'uploads', 'surveys', relativePath);
                        if (fs.existsSync(absolutePath)) {
                            archive.file(absolutePath, { name: `${r.correo || r.nombreCandidato || r._id}/${relativePath}` });
                            filesFound++;
                        }
                    }
                });
            }
        });

        if (filesFound === 0) {
            // Create an empty dummy file so zip doesn't fail
            archive.append('No files uploaded for these surveys.', { name: 'info.txt' });
        }

        await archive.finalize();

    } catch (error) {
        console.error('Error exportando resultados ZIP:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Fallo al exportar encuestas ZIP' });
        }
    }
};

exports.downloadManagers = async (req, res) => {
    try {
        const managers = await Gestor.find().lean();
        res.setHeader('Content-Disposition', 'attachment; filename=empresas_gestores.csv');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.write('\uFEFF');
        let header = "ID,Nombre,Email,Estado,Rol ID,Rol Nombre,Último Acceso,Fecha Registro\n";
        res.write(header);

        managers.forEach(g => {
            const row = [
                g._id,
                g.nombre,
                g.email,
                g.estado,
                g.role_id,
                g.rol || '',
                g.ultimoAcceso ? new Date(g.ultimoAcceso).toISOString() : '',
                g.createdAt ? new Date(g.createdAt).toISOString() : ''
            ].map(formatCsvValue).join(',');
            res.write(row + '\n');
        });

        res.end();
    } catch (error) {
        console.error('Error exportando gestores:', error);
        res.status(500).json({ error: 'Fallo al exportar gestores' });
    }
};

exports.downloadCatalog = async (req, res) => {
    try {
        // Obtenemos tests que no están marcados como borrados
        const tests = await Test.find({ isDeleted: { $ne: true } }).lean();
        res.setHeader('Content-Disposition', 'attachment; filename=catalogo_instrumentos.csv');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.write('\uFEFF');
        let header = "ID,Nombre,Tipo,Estado Publicación,Activo,Total Preguntas,Creado Por,Fecha Creación\n";
        res.write(header);

        tests.forEach(t => {
            const numPreguntas = t.preguntas ? t.preguntas.length : 0;
            const name = t.title || t.nombre;
            const type = t.tipo || 'Test';
            const row = [
                t._id,
                name,
                type,
                t.estadoPublicacion || 'Borrador',
                t.activo ? 'Sí' : 'No',
                numPreguntas,
                t.creado_por || '',
                t.createdAt ? new Date(t.createdAt).toISOString() : ''
            ].map(formatCsvValue).join(',');
            res.write(row + '\n');
        });

        res.end();
    } catch (error) {
        console.error('Error exportando catálogo:', error);
        res.status(500).json({ error: 'Fallo al exportar catálogo de instrumentos' });
    }
};

// ============================================================
// GESTIÓN DE RESPUESTAS INDIVIDUALES
// ============================================================

/**
 * GET /api/export/responses?instrumentId=OPTIONAL_ID
 * Lista todas las respuestas (registros de Admision) con datos resumidos.
 * Si se pasa instrumentId, filtra por ese instrumento.
 * NUNCA toca la colección de tests.
 */
exports.listResponses = async (req, res) => {
    try {
        const { instrumentId } = req.query;
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);
        const user_id = req.query.user_id || req.headers['user_id'] || null;
        const esUsuarioFinal = (role_id === 4 || role_id === 5);

        let filter = { estado: 'Finalizado' };
        if (instrumentId) {
            filter.testAsignado = instrumentId;
        }

        // ── Seguridad: Suscriptores solo ven respuestas a SUS instrumentos ──
        let allowedInstrumentIds = null;
        if (esUsuarioFinal && user_id) {
            // Obtener IDs de instrumentos creados por o asignados al suscriptor
            const misTests = await Test.find({
                isDeleted: { $ne: true },
                $or: [
                    { creado_por: user_id },
                    { 'colaboradores.usuarioId': user_id }
                ]
            }).select('_id').lean();

            allowedInstrumentIds = misTests.map(t => t._id.toString());

            if (allowedInstrumentIds.length === 0) {
                // El suscriptor no tiene instrumentos, retornar vacío
                return res.json({ status: 'ok', total: 0, data: [] });
            }

            // Solo ver respuestas de sus instrumentos
            filter.testAsignado = { $in: allowedInstrumentIds };
        }

        const responses = await Admision.find(filter)
            .select('_id nombreCandidato correo tokenUnico testAsignado estado puntaje generoInfo fechaFinalizacion createdAt datosFormulario')
            .sort({ fechaFinalizacion: -1, createdAt: -1 })
            .lean();

        // Enriquecer con nombre del instrumento
        const testIds = [...new Set(responses.map(r => r.testAsignado).filter(Boolean))];
        let testNames = {};
        for (const tid of testIds) {
            try {
                if (/^[a-fA-F0-9]{24}$/.test(tid)) {
                    const testDoc = await Test.findById(tid).select('nombre title tipo rangosPuntaje').lean();
                    if (testDoc) {
                        testNames[tid] = {
                            nombre: testDoc.nombre || testDoc.title || tid,
                            tipo: testDoc.tipo || 'Test',
                            rangosPuntaje: testDoc.rangosPuntaje || []
                        };
                    }
                }
            } catch (e) { /* skip */ }
            if (!testNames[tid]) {
                testNames[tid] = { nombre: tid, tipo: 'Desconocido', rangosPuntaje: [] };
            }
        }

        const enriched = responses.map((r, idx) => {
            // Resolve real candidate name
            let candidateName = `Respuesta #${idx + 1}`;
            if (r.datosFormulario && r.datosFormulario.nombre && r.datosFormulario.nombre !== 'Evaluado') {
                candidateName = r.datosFormulario.nombre;
            } else if (r.nombreCandidato && r.nombreCandidato !== 'Evaluado' && !/^TEST-/.test(r.nombreCandidato)) {
                candidateName = r.nombreCandidato;
            }

            // Compute resultado name from score ranges
            let resultado = '';
            const testInfo = testNames[r.testAsignado];
            if (testInfo && testInfo.rangosPuntaje && testInfo.rangosPuntaje.length > 0 && r.puntaje !== undefined && r.puntaje !== null) {
                const matched = testInfo.rangosPuntaje.find(rg => r.puntaje >= rg.min && r.puntaje <= rg.max);
                if (matched) resultado = matched.resultadoAsociado || '';
            }

            return {
                _id: r._id,
                numero: idx + 1,
                identificador: candidateName,
                instrumento: testNames[r.testAsignado]?.nombre || r.testAsignado || 'N/A',
                tipoInstrumento: testNames[r.testAsignado]?.tipo || 'N/A',
                instrumentoId: r.testAsignado,
                puntaje: r.puntaje || null,
                resultado: resultado,
                fecha: r.fechaFinalizacion || r.createdAt || null,
                token: r.tokenUnico || ''
            }
        });

        res.json({ status: 'ok', total: enriched.length, data: enriched });
    } catch (error) {
        console.error('Error listando respuestas:', error);
        res.status(500).json({ status: 'error', message: 'Error al listar respuestas' });
    }
};

/**
 * GET /api/export/responses-full?instrumentId=ID
 * Devuelve respuestas COMPLETAS (con resultadosCompletos) para un instrumento.
 * Usado por la exportación PDF con preguntas.
 */
exports.listResponsesFull = async (req, res) => {
    try {
        const { instrumentId } = req.query;
        if (!instrumentId) {
            return res.status(400).json({ status: 'error', message: 'Se requiere instrumentId' });
        }

        const responses = await Admision.find({
            testAsignado: instrumentId,
            estado: 'Finalizado'
        })
        .sort({ fechaFinalizacion: -1, createdAt: -1 })
        .lean();

        res.json({ status: 'ok', total: responses.length, data: responses });
    } catch (error) {
        console.error('Error listando respuestas completas:', error);
        res.status(500).json({ status: 'error', message: 'Error al listar respuestas completas' });
    }
};

/**
 * DELETE /api/export/response/:id
 * Elimina UN solo registro de respuesta (Admision) por su _id.
 * PROTECCIÓN CRÍTICA: Solo opera sobre la colección Admision.
 * NUNCA toca la colección de Tests/Encuestas/Instrumentos.
 */
exports.deleteResponse = async (req, res) => {
    try {
        const responseId = req.params.id;

        // Validar que sea un ID válido de MongoDB
        if (!responseId || !/^[a-fA-F0-9]{24}$/.test(responseId)) {
            return res.status(400).json({ status: 'error', message: 'ID de respuesta inválido.' });
        }

        // SOLO buscar y eliminar de la colección Admision (respuestas)
        // NUNCA de Test, Suscriptor, Gestor u otra colección
        const deleted = await Admision.findByIdAndDelete(responseId);

        if (!deleted) {
            return res.status(404).json({ status: 'error', message: 'No se encontró el registro de respuesta.' });
        }

        console.log(`[DELETE RESPONSE] Registro eliminado: ${responseId} (instrumento: ${deleted.testAsignado})`);

        res.json({
            status: 'ok',
            message: 'Registro de respuesta eliminado exitosamente.',
            deletedId: responseId
        });
    } catch (error) {
        console.error('Error eliminando respuesta:', error);
        res.status(500).json({ status: 'error', message: 'Error al eliminar el registro.' });
    }
};

// ============================================================
// DATA CLEANUP (LIMPIEZA DE DATOS)
// ============================================================

/**
 * GET /api/export/cleanup/analyze
 * Analiza la base de datos y devuelve conteos de registros limpiables.
 */
exports.analyzeCleanup = async (req, res) => {
    try {
        const cutoffDate = req.query.cutoffDate ? new Date(req.query.cutoffDate) : null;

        // 1. Respuestas incompletas (sin resultadosCompletos o vacíos, estado != Finalizado)
        const incomplete = await Admision.countDocuments({
            $or: [
                { estado: { $ne: 'Finalizado' } },
                { resultadosCompletos: { $exists: false } },
                { resultadosCompletos: null },
                { resultadosCompletos: { $size: 0 } }
            ]
        });

        // 2. Duplicados: mismo testAsignado + correo con multiples entradas
        const duplicateAgg = await Admision.aggregate([
            { $match: { estado: 'Finalizado' } },
            {
                $group: {
                    _id: { testAsignado: '$testAsignado', correo: '$correo' },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    fechas: { $push: '$fechaFinalizacion' }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);
        // Contar los registros que sobran (todos menos el más reciente de cada grupo)
        let duplicateCount = 0;
        duplicateAgg.forEach(group => {
            duplicateCount += (group.count - 1); // Mantener 1, eliminar el resto
        });

        // 3. Datos antiguos (antes de la fecha de corte)
        let oldDataCount = 0;
        if (cutoffDate) {
            oldDataCount = await Admision.countDocuments({
                $or: [
                    { fechaFinalizacion: { $lt: cutoffDate } },
                    { fechaFinalizacion: null, createdAt: { $lt: cutoffDate } }
                ],
                estado: 'Finalizado'
            });
        }

        // 4. Datos de prueba / Admin (candidatos con nombres genéricos)
        const testDataCount = await Admision.countDocuments({
            $or: [
                { nombreCandidato: 'Evaluado' },
                { correo: { $regex: /^TEST-/ } },
                { tokenUnico: { $regex: /^TEST-.*-test$/i } }
            ],
            estado: 'Finalizado'
        });

        res.json({
            status: 'ok',
            data: {
                incomplete: incomplete,
                duplicates: duplicateCount,
                oldData: oldDataCount,
                testData: testDataCount,
                total: incomplete + duplicateCount + oldDataCount + testDataCount
            }
        });
    } catch (error) {
        console.error('Error analizando limpieza:', error);
        res.status(500).json({ status: 'error', message: 'Error al analizar datos para limpieza.' });
    }
};

/**
 * POST /api/export/cleanup/execute
 * Ejecuta una acción de limpieza específica.
 * Body: { action: 'incomplete' | 'duplicates' | 'old-data' | 'test-data', cutoffDate?: string }
 */
exports.executeCleanup = async (req, res) => {
    try {
        const { action, cutoffDate } = req.body;
        let deletedCount = 0;

        switch (action) {
            case 'incomplete': {
                const result = await Admision.deleteMany({
                    $or: [
                        { estado: { $ne: 'Finalizado' } },
                        { resultadosCompletos: { $exists: false } },
                        { resultadosCompletos: null },
                        { resultadosCompletos: { $size: 0 } }
                    ]
                });
                deletedCount = result.deletedCount;
                console.log(`[CLEANUP] Eliminadas ${deletedCount} respuestas incompletas`);
                break;
            }

            case 'duplicates': {
                // Encontrar duplicados y eliminar todos menos el más reciente
                const dupes = await Admision.aggregate([
                    { $match: { estado: 'Finalizado' } },
                    { $sort: { fechaFinalizacion: -1, createdAt: -1 } },
                    {
                        $group: {
                            _id: { testAsignado: '$testAsignado', correo: '$correo' },
                            count: { $sum: 1 },
                            keepId: { $first: '$_id' }, // el más reciente
                            allIds: { $push: '$_id' }
                        }
                    },
                    { $match: { count: { $gt: 1 } } }
                ]);

                const idsToDelete = [];
                dupes.forEach(group => {
                    group.allIds.forEach(id => {
                        if (id.toString() !== group.keepId.toString()) {
                            idsToDelete.push(id);
                        }
                    });
                });

                if (idsToDelete.length > 0) {
                    const result = await Admision.deleteMany({ _id: { $in: idsToDelete } });
                    deletedCount = result.deletedCount;
                }
                console.log(`[CLEANUP] Eliminados ${deletedCount} registros duplicados`);
                break;
            }

            case 'old-data': {
                if (!cutoffDate) {
                    return res.status(400).json({ status: 'error', message: 'Se requiere cutoffDate para esta acción.' });
                }
                const fecha = new Date(cutoffDate);
                const result = await Admision.deleteMany({
                    $or: [
                        { fechaFinalizacion: { $lt: fecha } },
                        { fechaFinalizacion: null, createdAt: { $lt: fecha } }
                    ],
                    estado: 'Finalizado'
                });
                deletedCount = result.deletedCount;
                console.log(`[CLEANUP] Eliminados ${deletedCount} registros anteriores a ${cutoffDate}`);
                break;
            }

            case 'test-data': {
                const result = await Admision.deleteMany({
                    $or: [
                        { nombreCandidato: 'Evaluado' },
                        { correo: { $regex: /^TEST-/ } },
                        { tokenUnico: { $regex: /^TEST-.*-test$/i } }
                    ],
                    estado: 'Finalizado'
                });
                deletedCount = result.deletedCount;
                console.log(`[CLEANUP] Eliminados ${deletedCount} registros de prueba/admin`);
                break;
            }

            default:
                return res.status(400).json({ status: 'error', message: `Acción desconocida: ${action}` });
        }

        res.json({
            status: 'ok',
            message: `Limpieza completada. ${deletedCount} registro(s) eliminado(s).`,
            deletedCount
        });
    } catch (error) {
        console.error('Error ejecutando limpieza:', error);
        res.status(500).json({ status: 'error', message: 'Error al ejecutar la limpieza.' });
    }
};

/**
 * DELETE /api/export/cleanup/purge/:testId
 * Elimina TODAS las respuestas de un instrumento específico.
 */
exports.purgeInstrumentData = async (req, res) => {
    try {
        const { testId } = req.params;
        if (!testId) {
            return res.status(400).json({ status: 'error', message: 'Falta el ID del instrumento' });
        }

        const result = await Admision.deleteMany({ testAsignado: testId });
        const deletedCount = result.deletedCount || 0;

        console.log(`[PURGE] Eliminadas ${deletedCount} respuestas del instrumento ${testId}`);

        res.json({
            status: 'ok',
            message: `Se eliminaron ${deletedCount} respuesta(s) del instrumento.`,
            deletedCount
        });
    } catch (error) {
        console.error('Error purgando datos del instrumento:', error);
        res.status(500).json({ status: 'error', message: 'Error al limpiar los datos del instrumento.' });
    }
};

// ============================================================
// PRO ANALYTICS (Herramientas Profesionales)
// ============================================================

/**
 * GET /api/export/pro/quality
 * Data Quality Score — Análisis de calidad del dataset.
 */
exports.dataQualityScore = async (req, res) => {
    try {
        const total = await Admision.countDocuments();
        const finalizados = await Admision.countDocuments({ estado: 'Finalizado' });
        const conPuntaje = await Admision.countDocuments({ estado: 'Finalizado', puntaje: { $gt: 0 } });
        const conTiempo = await Admision.countDocuments({ estado: 'Finalizado', tiempoTranscurrido: { $gt: 0 } });

        // Tasa de completitud
        const tasaCompletitud = total > 0 ? Math.round((finalizados / total) * 100) : 0;

        // Tiempo promedio (en segundos)
        const tiempoAgg = await Admision.aggregate([
            { $match: { estado: 'Finalizado', tiempoTranscurrido: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: '$tiempoTranscurrido' }, stddev: { $stdDevPop: '$tiempoTranscurrido' } } }
        ]);
        const tiempoPromedio = tiempoAgg.length > 0 ? Math.round(tiempoAgg[0].avg) : 0;
        const tiempoStdDev = tiempoAgg.length > 0 ? Math.round(tiempoAgg[0].stddev) : 0;

        // Estadísticas de puntaje
        const puntajeAgg = await Admision.aggregate([
            { $match: { estado: 'Finalizado', puntaje: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    avg: { $avg: '$puntaje' },
                    min: { $min: '$puntaje' },
                    max: { $max: '$puntaje' },
                    stddev: { $stdDevPop: '$puntaje' }
                }
            }
        ]);
        const puntajePromedio = puntajeAgg.length > 0 ? Math.round(puntajeAgg[0].avg * 10) / 10 : 0;
        const puntajeMin = puntajeAgg.length > 0 ? puntajeAgg[0].min : 0;
        const puntajeMax = puntajeAgg.length > 0 ? puntajeAgg[0].max : 0;
        const puntajeStdDev = puntajeAgg.length > 0 ? Math.round(puntajeAgg[0].stddev * 10) / 10 : 0;

        // Score de calidad global (0-100)
        const s1 = tasaCompletitud; // completitud
        const s2 = conTiempo > 0 ? Math.min(100, Math.round((conTiempo / Math.max(finalizados, 1)) * 100)) : 0; // tiene tiempo
        const s3 = puntajeStdDev > 5 ? 100 : Math.round(puntajeStdDev * 20); // distribución puntajes (más variación = mejor instrumento)
        const s4 = conPuntaje > 0 ? Math.min(100, Math.round((conPuntaje / Math.max(finalizados, 1)) * 100)) : 0;
        const scoreGlobal = Math.round((s1 * 0.35) + (s2 * 0.15) + (s3 * 0.25) + (s4 * 0.25));

        res.json({
            status: 'ok',
            data: {
                total,
                finalizados,
                tasaCompletitud,
                tiempoPromedio,
                tiempoStdDev,
                registrosConTiempo: conTiempo,
                puntajePromedio,
                puntajeMin,
                puntajeMax,
                puntajeStdDev,
                registrosConPuntaje: conPuntaje,
                scoreGlobal
            }
        });
    } catch (error) {
        console.error('Error calculando calidad:', error);
        res.status(500).json({ status: 'error', message: 'Error al calcular score de calidad.' });
    }
};

/**
 * GET /api/export/pro/anomalies
 * Detección de anomalías en las respuestas.
 */
exports.detectAnomalies = async (req, res) => {
    try {
        // Calcular estadísticas base
        const stats = await Admision.aggregate([
            { $match: { estado: 'Finalizado' } },
            {
                $group: {
                    _id: null,
                    avgPuntaje: { $avg: '$puntaje' },
                    stdPuntaje: { $stdDevPop: '$puntaje' },
                    avgTiempo: { $avg: '$tiempoTranscurrido' },
                    stdTiempo: { $stdDevPop: '$tiempoTranscurrido' }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({ status: 'ok', data: { rapidas: [], outliers: [], totalAnomalias: 0 } });
        }

        const { avgPuntaje, stdPuntaje, avgTiempo, stdTiempo } = stats[0];

        // 1. Respuestas sospechosamente rápidas (< 30% del tiempo promedio)
        const umbralRapido = avgTiempo > 0 ? Math.round(avgTiempo * 0.3) : 0;
        let rapidas = [];
        if (umbralRapido > 0) {
            rapidas = await Admision.find({
                estado: 'Finalizado',
                tiempoTranscurrido: { $gt: 0, $lt: umbralRapido }
            })
                .select('_id nombreCandidato correo testAsignado puntaje tiempoTranscurrido fechaFinalizacion')
                .sort({ tiempoTranscurrido: 1 })
                .limit(50)
                .lean();
        }

        // 2. Outliers estadísticos (puntaje ±2σ del promedio)
        const lower = avgPuntaje - (2 * (stdPuntaje || 0));
        const upper = avgPuntaje + (2 * (stdPuntaje || 0));
        let outliers = [];
        if (stdPuntaje > 0) {
            outliers = await Admision.find({
                estado: 'Finalizado',
                puntaje: { $exists: true },
                $or: [
                    { puntaje: { $lt: lower } },
                    { puntaje: { $gt: upper } }
                ]
            })
                .select('_id nombreCandidato correo testAsignado puntaje tiempoTranscurrido fechaFinalizacion')
                .sort({ puntaje: 1 })
                .limit(50)
                .lean();
        }

        res.json({
            status: 'ok',
            data: {
                rapidas: rapidas.map(r => ({
                    id: r._id,
                    nombre: r.nombreCandidato,
                    correo: r.correo,
                    test: r.testAsignado,
                    puntaje: r.puntaje,
                    tiempo: r.tiempoTranscurrido,
                    fecha: r.fechaFinalizacion
                })),
                outliers: outliers.map(r => ({
                    id: r._id,
                    nombre: r.nombreCandidato,
                    correo: r.correo,
                    test: r.testAsignado,
                    puntaje: r.puntaje,
                    tiempo: r.tiempoTranscurrido,
                    fecha: r.fechaFinalizacion
                })),
                stats: {
                    avgPuntaje: Math.round((avgPuntaje || 0) * 10) / 10,
                    stdPuntaje: Math.round((stdPuntaje || 0) * 10) / 10,
                    avgTiempo: Math.round(avgTiempo || 0),
                    stdTiempo: Math.round(stdTiempo || 0),
                    umbralRapido,
                    rangoNormal: { min: Math.round(lower), max: Math.round(upper) }
                },
                totalAnomalias: rapidas.length + outliers.length
            }
        });
    } catch (error) {
        console.error('Error detectando anomalías:', error);
        res.status(500).json({ status: 'error', message: 'Error al detectar anomalías.' });
    }
};

/**
 * GET /api/export/pro/trends
 * Series temporales de respuestas y puntajes.
 */
exports.getTrends = async (req, res) => {
    try {
        // Respuestas por semana (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const porSemana = await Admision.aggregate([
            {
                $match: {
                    estado: 'Finalizado', $or: [
                        { fechaFinalizacion: { $gte: sixMonthsAgo } },
                        { createdAt: { $gte: sixMonthsAgo } }
                    ]
                }
            },
            { $addFields: { fechaEfectiva: { $ifNull: ['$fechaFinalizacion', '$createdAt'] } } },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: '$fechaEfectiva' },
                        week: { $isoWeek: '$fechaEfectiva' }
                    },
                    count: { $sum: 1 },
                    avgPuntaje: { $avg: '$puntaje' }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } }
        ]);

        // Respuestas por mes (último año)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const porMes = await Admision.aggregate([
            {
                $match: {
                    estado: 'Finalizado', $or: [
                        { fechaFinalizacion: { $gte: oneYearAgo } },
                        { createdAt: { $gte: oneYearAgo } }
                    ]
                }
            },
            { $addFields: { fechaEfectiva: { $ifNull: ['$fechaFinalizacion', '$createdAt'] } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$fechaEfectiva' },
                        month: { $month: '$fechaEfectiva' }
                    },
                    count: { $sum: 1 },
                    avgPuntaje: { $avg: '$puntaje' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Distribución de puntajes (histograma con 10 buckets)
        const histograma = await Admision.aggregate([
            { $match: { estado: 'Finalizado', puntaje: { $gte: 0 } } },
            {
                $bucket: {
                    groupBy: '$puntaje',
                    boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
                    default: 'Otro',
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        res.json({
            status: 'ok',
            data: {
                porSemana: porSemana.map(s => ({
                    label: `S${s._id.week}/${s._id.year}`,
                    count: s.count,
                    avgPuntaje: Math.round((s.avgPuntaje || 0) * 10) / 10
                })),
                porMes: porMes.map(m => ({
                    label: `${meses[m._id.month - 1]} ${m._id.year}`,
                    count: m.count,
                    avgPuntaje: Math.round((m.avgPuntaje || 0) * 10) / 10
                })),
                histograma: histograma.filter(h => h._id !== 'Otro').map(h => ({
                    rango: `${h._id}-${h._id + 9}`,
                    count: h.count
                }))
            }
        });
    } catch (error) {
        console.error('Error calculando tendencias:', error);
        res.status(500).json({ status: 'error', message: 'Error al calcular tendencias.' });
    }
};

/**
 * GET /api/export/pro/storage
 * Estadísticas de almacenamiento por colección.
 */
exports.getStorageStats = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        const collections = ['admisions', 'tests', 'baterias', 'encuestas', 'bitacoras', 'entrenamientos', 'users'];
        const stats = [];

        for (const colName of collections) {
            try {
                const col = db.collection(colName);
                const count = await col.countDocuments();
                // Estimar tamaño: obtener un documento sample y multiplicar
                const sample = await col.findOne();
                const sampleSize = sample ? Buffer.byteLength(JSON.stringify(sample)) : 0;
                const estimatedBytes = sampleSize * count;

                stats.push({
                    collection: colName,
                    count,
                    estimatedBytes,
                    estimatedMB: Math.round((estimatedBytes / 1048576) * 100) / 100
                });
            } catch (e) {
                stats.push({ collection: colName, count: 0, estimatedBytes: 0, estimatedMB: 0 });
            }
        }

        const totalRecords = stats.reduce((s, c) => s + c.count, 0);
        const totalMB = stats.reduce((s, c) => s + c.estimatedMB, 0);

        res.json({
            status: 'ok',
            data: {
                collections: stats,
                totalRecords,
                totalMB: Math.round(totalMB * 100) / 100
            }
        });
    } catch (error) {
        console.error('Error obteniendo storage:', error);
        res.status(500).json({ status: 'error', message: 'Error al obtener estadísticas de almacenamiento.' });
    }
};

/**
 * GET /api/export/pro/export-json
 * Exporta todos los datos finalizados como JSON descargable.
 */
exports.exportJSON = async (req, res) => {
    try {
        const responses = await Admision.find({ estado: 'Finalizado' })
            .select('-__v')
            .sort({ fechaFinalizacion: -1 })
            .lean();

        const exportData = {
            exportDate: new Date().toISOString(),
            platform: 'Testea Pro',
            totalRecords: responses.length,
            records: responses
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=testea_export_${new Date().toISOString().slice(0, 10)}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Error exportando JSON:', error);
        res.status(500).json({ status: 'error', message: 'Error al exportar JSON.' });
    }
};
