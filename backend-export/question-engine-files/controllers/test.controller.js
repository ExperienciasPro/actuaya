const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { XMLParser } = require('fast-xml-parser');
const TestMongo = require('../models/test.model');

const parseXML = (filename) => {
    const filePath = path.join(__dirname, '..', 'xml', filename);
    if (!fs.existsSync(filePath)) return null;
    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    return parser.parse(xmlData);
};

exports.getRawAll = async (req, res) => {
    try {
        const query = { isDeleted: false };
        if (req.query.tipo) {
            query.tipo = req.query.tipo;
        } else {
            // By default exclude 'Encuesta' if we just want Tests/Simuladores, 
            // but the prompt implies we want raw data by tab. The route handles this.
            query.$and = [
                { tipo: { $not: /encuesta/i } },
                { type: { $not: /encuesta/i } }
            ];
        }

        // ── Filtro de seguridad: Suscriptores solo ven sus propios instrumentos ──
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);
        const user_id = req.query.user_id || req.headers['user_id'] || null;
        const esUsuarioFinal = (role_id === 4 || role_id === 5);

        if (esUsuarioFinal && user_id) {
            query.$or = [
                { creado_por: user_id },
                { 'colaboradores.usuarioId': user_id }
            ];
        }

        const rawTests = await TestMongo.find(query).populate('creado_por', 'nombre').lean();

        const safeData = rawTests.map(t => ({
            id: t._id,
            nombre: t.nombre || t.title,
            descripcion: t.descripcion || t.description || 'Sin descripción',
            tipo: t.tipo || t.type || 'Test',
            estado: t.estadoPublicacion || (t.activo ? 'Publicado' : 'Borrador'),
            creado_por: t.creado_por ? t.creado_por.nombre : 'Sistema',
            fechaAlta: t.createdAt
        }));

        res.status(200).json({ status: 'ok', data: safeData });
    } catch (e) {
        console.error('Error in getRawAll:', e);
        res.status(500).json({ status: 'error', message: 'Error interno obteniendo raw data' });
    }
};

exports.createTest = async (req, res) => {
    try {
        const { title, description, type, formularioCaptura } = req.body;
        const newTest = new TestMongo({
            title,
            description,
            type,
            formularioCaptura,
            activo: true,
            isDeleted: false
        });
        await newTest.save();
        res.status(201).json({ status: 'ok', data: newTest, message: 'Test creado exitosamente' });
    } catch (error) {
        console.error('Error creating test originando MongoDB:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al crear test' });
    }
};

exports.updateTest = async (req, res) => {
    try {
        const testId = req.params.id;

        // Allowed fields to update from steps 2, 3 and 4
        // The client might send full data or partial data
        const updateData = { ...req.body };

        // Map fields for legacy frontend support & schema consistency
        if (updateData.nombre !== undefined) updateData.title = updateData.nombre;
        if (updateData.descripcion !== undefined) updateData.description = updateData.descripcion;
        if (updateData.imageUrl !== undefined) updateData.imagenCabecera = updateData.imageUrl;
        if (updateData.type !== undefined) updateData.tipo = updateData.type;
        if (updateData.rutas !== undefined) updateData.metodosEntrega = updateData.rutas;

        // Ensure color mapping
        if (updateData.color !== undefined) updateData.themeColor = updateData.color;
        if (updateData.themeColor === undefined && updateData.color) updateData.themeColor = updateData.color;

        console.log(`[UPDATE TEST] Updating presentationMode to: ${updateData.presentationMode}`);

        // ORDEN ABSOLUTA: AÑADIR EXPRESAMENTE AL ACTUALIZAR
        const currentColor = req.body.color || req.body.themeColor || updateData.themeColor;
        const currentMode = req.body.presentationMode || updateData.presentationMode;

        const updatedTest = await TestMongo.findByIdAndUpdate(
            testId,
            {
                $set: {
                    ...updateData,
                    themeColor: currentColor,
                    color: currentColor,
                    presentationMode: currentMode
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedTest) {
            return res.status(404).json({ status: 'error', message: 'Test no encontrado' });
        }

        res.json({ status: 'ok', data: updatedTest, message: 'Test actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando test en MongoDB:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar test' });
    }
};

exports.deleteTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const isMongoId = /^[a-fA-F0-9]{24}$/.test(testId);

        if (!isMongoId) {
            return res.json({ status: 'ok', message: 'Test eliminado exitosamente' });
        }

        // ── PROTECTED: Subscriber permission check ──
        // Subscribers can only remove their own access (unshare),
        // NOT delete the instrument itself. Only the creator or
        // admin users can delete instruments.
        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || 0);
        const user_id = req.query.user_id || req.headers['user_id'] || null;
        const esUsuarioFinal = (role_id === 4 || role_id === 5);

        const test = await TestMongo.findById(testId);
        if (!test) {
            return res.status(404).json({ status: 'error', message: 'Test no encontrado' });
        }

        if (esUsuarioFinal && user_id) {
            const creadorId = test.creado_por ? test.creado_por.toString() : null;
            const esCreador = creadorId === user_id;

            if (!esCreador) {
                // Subscriber is NOT the creator — only remove their collaboration
                const colabIndex = (test.colaboradores || []).findIndex(
                    c => c.usuarioId && c.usuarioId.toString() === user_id
                );
                if (colabIndex > -1) {
                    test.colaboradores.splice(colabIndex, 1);
                    await test.save();
                    return res.json({
                        status: 'ok',
                        message: 'Acceso removido. El instrumento sigue disponible para su creador.',
                        action: 'unshared'
                    });
                }
                // Not creator, not collaborator — deny deletion
                return res.status(403).json({
                    status: 'error',
                    message: 'No tienes permiso para eliminar este instrumento. Solo el creador puede hacerlo.'
                });
            }
            // Subscriber IS the creator — allow full deletion of their own instruments
            await TestMongo.findByIdAndDelete(testId);
            return res.json({ status: 'ok', message: 'Instrumento eliminado exitosamente.', action: 'deleted' });
        }

        // Admin or Super Admin — allow full deletion
        await TestMongo.findByIdAndDelete(testId);
        res.json({ status: 'ok', message: 'Test eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando test en MongoDB:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar test' });
    }
};

exports.shareTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const { usuarioId, permiso } = req.body;

        if (!usuarioId) {
            return res.status(400).json({ status: 'error', message: 'Falta el ID del usuario' });
        }

        const test = await TestMongo.findById(testId);
        if (!test) {
            return res.status(404).json({ status: 'error', message: 'Test no encontrado' });
        }

        if (!test.colaboradores) {
            test.colaboradores = [];
        }

        const index = test.colaboradores.findIndex(c => c.usuarioId && c.usuarioId.toString() === usuarioId);
        if (index === -1) {
            test.colaboradores.push({ usuarioId, permiso: permiso || 'editar' });
        } else {
            test.colaboradores[index].permiso = permiso || 'editar';
        }

        await test.save();
        res.json({ status: 'ok', message: 'Instrumento compartido exitosamente' });
    } catch (error) {
        console.error('Error compartiendo test en MongoDB:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al compartir test' });
    }
};

exports.unshareTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const { usuarioId } = req.body;

        if (!usuarioId) {
            return res.status(400).json({ status: 'error', message: 'Falta el ID del usuario' });
        }

        const test = await TestMongo.findById(testId);
        if (!test) {
            return res.status(404).json({ status: 'error', message: 'Test no encontrado' });
        }

        // Normalize the ID to a plain string for comparison
        const targetId = typeof usuarioId === 'object' ? (usuarioId._id || usuarioId).toString() : String(usuarioId);

        const beforeCount = (test.colaboradores || []).length;
        if (test.colaboradores && test.colaboradores.length > 0) {
            test.colaboradores = test.colaboradores.filter(c => {
                if (!c.usuarioId) return true; // keep entries without userId
                const colabId = c.usuarioId.toString();
                return colabId !== targetId;
            });
            await test.save();
        }
        const afterCount = (test.colaboradores || []).length;
        console.log(`[Unshare] Test ${testId}: removed user ${targetId}. Colaboradores: ${beforeCount} → ${afterCount}`);

        res.json({ status: 'ok', message: 'Acceso retirado exitosamente' });
    } catch (error) {
        console.error('Error retirando acceso de test en MongoDB:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al retirar acceso' });
    }
};

exports.getTestList = async (req, res) => {
    try {
        const testsData = parseXML('003a.xml');
        if (!testsData || !testsData.pruebas || !testsData.pruebas.prueba) {
            return res.json({ status: 'ok', data: [] });
        }

        const testsArray = Array.isArray(testsData.pruebas.prueba) ? testsData.pruebas.prueba : [testsData.pruebas.prueba];

        // Define an array of colors to dynamically assign colorClass
        const colors = ['bg-blue', 'bg-navy', 'bg-teal', 'bg-orange', 'bg-gray'];
        let colorIdx = 0;

        const mappedTests = testsArray.map((t, index) => {
            const hasImage = fs.existsSync(path.join(__dirname, '..', '..', 'src', 'assets', 'fotos', `p${t.aa}.png`));
            const assignedColor = colors[colorIdx % colors.length];
            colorIdx++;

            return {
                id: String(t.aa || ''),
                title: t.ac ? String(t.ac).replace(/#br#/gi, ' ') : 'Sin título',
                description: t.ad ? String(t.ad).substring(0, 180) + '...' : '',
                status: String(t.ab || '1'),
                questionsCount: `${t.ag || 0} Preguntas`,
                imageUrl: hasImage ? `assets/fotos/p${t.aa}.png` : `assets/img/default-test.jpg`,
                colorClass: assignedColor
            };
        });

        const role_id = parseInt(req.query.role_id || req.headers['role_id'] || req.headers['authorization'] || 0);
        const user_id = req.query.user_id || req.headers['user_id'] || null;
        const esUsuarioFinal = (role_id === 4 || role_id === 5);

        // Si es Suscriptor, solo mostrar tests XML de legacy si NO es suscriptor
        if (esUsuarioFinal) {
            // Limpiar tests XML — Suscriptor solo ve lo que creó en MongoDB
            mappedTests.length = 0;
        }

        // DB Tests
        let dbTests = [];
        try {
            let mongoFilter = { isDeleted: { $ne: true } };
            if (req.query.tipo) {
                mongoFilter.tipo = { $regex: new RegExp(req.query.tipo, 'i') };
            } else {
                mongoFilter.tipo = { $not: /encuesta/i };
            }

            // Filtro por creador para Suscriptor
            if (esUsuarioFinal && user_id) {
                mongoFilter.$or = [
                    { creado_por: user_id },
                    { 'colaboradores.usuarioId': user_id }
                ];
            }

            const mgTests = await TestMongo.find(mongoFilter)
                .sort({ orden: 1, createdAt: -1 })
                .populate('creado_por', 'nombre')
                .populate('colaboradores.usuarioId', 'nombre email')
                .lean();
                
            dbTests = mgTests.map(mt => ({
                id: mt._id.toString(),
                title: mt.title || mt.nombre || 'Sin título',
                description: mt.description || mt.descripcion || '',
                type: mt.tipo || mt.type || 'Test Individual',
                formularioCaptura: mt.formularioVinculado || mt.formularioCaptura || '',
                status: mt.activo ? '1' : '0',
                activo: mt.activo,
                orden: mt.orden || 0,
                isDeleted: mt.isDeleted,
                deletedAt: mt.deletedAt,
                questionsCount: `${mt.preguntas ? mt.preguntas.length : 0} Preguntas`,
                imageUrl: mt.imagenCabecera || mt.imageUrl || `assets/img/default-test.jpg`,
                colorClass: mt.colorClass || 'bg-teal', // You can dynamically assign if desired
                isCustom: true,
                estadoPublicacion: mt.estadoPublicacion || 'Publicado',
                // Nombre del creador visible para todos los usuarios
                autor_nombre: mt.creado_por ? mt.creado_por.nombre : null,
                creado_por_id: mt.creado_por ? mt.creado_por._id : null,
                colaboradores: mt.colaboradores || []
            }));
        } catch (e) {
            console.error('Error al cargar tests de MongoDB:', e);
        }

        // SIMULADORES MOCK DATA
        const mockCasos = [
            {
                id: 'sim_mock_01',
                title: 'Resolución de Quejas Nivel 2',
                description: 'Evalúa tus habilidades en atención al cliente ante situaciones de alta tensión.',
                type: 'Simulador de Decisiones',
                formularioCaptura: '',
                status: '1',
                activo: true,
                orden: 0,
                isDeleted: false,
                deletedAt: null,
                questionsCount: '5 Etapas',
                imageUrl: 'assets/img/default-test.jpg',
                colorClass: 'bg-navy',
                isCustom: true,
                estadoPublicacion: 'Publicado',
                autor_nombre: 'Testea Pro'
            },
            {
                id: 'sim_mock_02',
                title: 'Manejo de Crisis de Relaciones Públicas',
                description: 'Toma el control de la empresa ante un escándalo mediático.',
                type: 'Simulador de Decisiones',
                formularioCaptura: '',
                status: '1',
                activo: true,
                orden: 0,
                isDeleted: false,
                deletedAt: null,
                questionsCount: '8 Etapas',
                imageUrl: 'assets/img/default-test.jpg',
                colorClass: 'bg-orange',
                isCustom: true,
                estadoPublicacion: 'Publicado',
                autor_nombre: 'Testea Pro'
            },
            {
                id: 'sim_mock_03',
                title: 'Negociación B2B Corporate',
                description: 'Cierra el trato del año balanceando márgenes y relaciones a largo plazo.',
                type: 'simulador de decisiones',
                formularioCaptura: '',
                status: '1',
                activo: true,
                orden: 0,
                isDeleted: false,
                deletedAt: null,
                questionsCount: '4 Etapas',
                imageUrl: 'assets/img/default-test.jpg',
                colorClass: 'bg-teal',
                isCustom: true,
                estadoPublicacion: 'Publicado',
                autor_nombre: 'Testea Pro'
            }
        ];

        // Si se filtró por tipo, solo devolver los de MongoDB (XML y mocks no tienen tipo)
        if (req.query.tipo) {
            res.json({ status: 'ok', data: dbTests });
        } else if (esUsuarioFinal) {
            // Suscriptor: solo ve sus propios instrumentos de MongoDB, sin mocks ni XML
            res.json({ status: 'ok', data: dbTests });
        } else {
            res.json({ status: 'ok', data: [...dbTests, ...mappedTests, ...mockCasos] });
        }
    } catch (error) {
        console.error('Error fetching test list:', error);
        res.status(500).json({ status: 'error', message: 'Error interno leyendo pruebas.' });
    }
};


exports.getTestStartData = async (req, res) => {
    const testId = req.params.id;

    try {
        // Consultar primero en la nueva colección de MongoDB
        if (testId.length === 24) { // Basic check for mongoose hex format
            const mongoTest = await TestMongo.findById(testId).lean();
            if (mongoTest) {
                const info = {
                    id: mongoTest._id,
                    estado: '1',
                    titulo: mongoTest.title || mongoTest.nombre,
                    descripcion: mongoTest.descripcion || mongoTest.description || '',
                    introduccion: mongoTest.introduccion || '',
                    estadoPublicacion: mongoTest.estadoPublicacion || (mongoTest.activo ? 'Publicado' : 'Borrador'),
                    themeColor: mongoTest.themeColor || '#3B82F6',
                    color: mongoTest.themeColor || '#3B82F6',
                    presentationMode: mongoTest.presentationMode || 'card',
                    tipo: mongoTest.tipo || 'Test',
                    companyLogoUrl: mongoTest.companyLogoUrl || null,
                    allowNavButtons: mongoTest.allowNavButtons !== false,
                    animationStyle: mongoTest.animationStyle || null,
                    tiempoLimiteActivo: mongoTest.tiempoLimiteActivo || false,
                    tiempoLimiteMinutos: mongoTest.tiempoLimiteMinutos || 0,
                    mostrarReloj: mongoTest.mostrarReloj !== false,
                    formularioActivo: mongoTest.formularioActivo || false,
                    formularioMomento: mongoTest.formularioMomento || 'inicio',
                    formularioVinculado: mongoTest.formularioVinculado || null,
                    requierePin: mongoTest.requierePin || false,
                    imagenCabecera: mongoTest.imagenCabecera || null,
                    plantillaSeleccionada: mongoTest.plantillaSeleccionada || 'theme-default',
                    pantallaFinalSeleccionada: mongoTest.pantallaFinalSeleccionada || 'theme-corporate',
                    pantallaFinal: mongoTest.pantallaFinal || {},
                    evaluaTiempo: mongoTest.evaluaTiempo || false,
                    pesoTiempo: mongoTest.pesoTiempo || 0,
                    rangosPuntaje: mongoTest.rangosPuntaje || [],
                    metodosEntrega: mongoTest.metodosEntrega || []
                };

                console.log(`[GET TEST START DATA] Loaded ${info.id}. presentationMode in DB is: ${mongoTest.presentationMode}. Returning: ${info.presentationMode}`);

                return res.json({
                    status: 'ok',
                    mensaje: 'Flujo de backend activo y preguntas leídas de MongoDB',
                    datos: {
                        info: info,
                        total_preguntas: mongoTest.preguntas ? mongoTest.preguntas.length : 0,
                        preguntas: (mongoTest.preguntas || []).map((q, qIndex) => ({
                            id: q.id || (q._id ? q._id.toString() : qIndex.toString()),
                            typeId: q.tipo || '1',
                            tipo: q.tipo || '',
                            inputType: q.inputType || undefined,
                            label: q.label || q.textoPregunta || '',
                            orden: qIndex.toString(),
                            text: q.textoPregunta || '',
                            descripcion: q.descripcion || '',
                            obligatoria: q.obligatoria !== undefined ? q.obligatoria : true,
                            options: (q.opciones || []).map((opt, oIndex) => {
                                const isObj = typeof opt === 'object' && opt !== null;
                                return {
                                    id: oIndex.toString(),
                                    order: oIndex.toString(),
                                    label: isObj ? (opt.label || opt.texto || '') : String(opt),
                                    value: isObj ? (opt.puntaje || opt.value || 0) : ((q.respuestasCorrectas || []).includes(opt) ? (q.puntaje || 1) : 0),
                                    correcta: isObj ? (opt.correcta || false) : (q.respuestasCorrectas || []).includes(opt)
                                };
                            }),
                            conditionalLogic: q.conditionalLogic || q.reglasCondicionales || []
                        }))
                    }
                });
            }
        }
    } catch (e) {
        console.error('Test no encontrado en MongoDB, buscando en Legacy XML', e);
    }

    // 1. Obtener la metadata del test desde 003a.xml
    const testsData = parseXML('003a.xml');
    let testInfo = null;

    if (testsData && testsData.pruebas && testsData.pruebas.prueba) {
        const testsList = Array.isArray(testsData.pruebas.prueba) ? testsData.pruebas.prueba : [testsData.pruebas.prueba];
        const found = testsList.find(t => String(t.aa) === String(testId));

        if (found) {
            testInfo = {
                id: found.aa,
                estado: found.ab,
                titulo: found.ac ? String(found.ac).replace(/#br#/gi, '<br>') : 'Sin título',
                descripcion: found.ad ? String(found.ad).replace(/#br#/gi, '<br>') : '',
                introduccion: found.ai ? String(found.ai).replace(/#br#/gi, '<br>') : ''
            };
        }
    }

    // 2. Obtener las preguntas relacionadas a este test desde 004a.xml
    const questionsData = parseXML('004a.xml');
    let questionsList = [];

    // 3. Obtener las opciones desde 005a.xml (respuestas)
    const optionsData = parseXML('005a.xml');
    let allOptions = [];
    if (optionsData && optionsData.respuestas && optionsData.respuestas.respuesta) {
        allOptions = Array.isArray(optionsData.respuestas.respuesta) ? optionsData.respuestas.respuesta : [optionsData.respuestas.respuesta];
    }

    if (questionsData && questionsData.preguntas && questionsData.preguntas.pregunta) {
        const allQuestions = Array.isArray(questionsData.preguntas.pregunta) ? questionsData.preguntas.pregunta : [questionsData.preguntas.pregunta];

        // Filtramos preguntas que correspondan al ID del test (etiqueta <ac> según la correlación relacional de Testea)
        questionsList = allQuestions
            .filter(q => String(q.ac) === String(testId))
            .map(q => {
                const qOptions = allOptions
                    .filter(opt => String(opt.ab) === String(q.aa))
                    .sort((a, b) => parseInt(a.ad || 0) - parseInt(b.ad || 0))
                    .map(opt => ({
                        id: String(opt.aa),
                        order: opt.ad,
                        label: opt.ae ? String(opt.ae).replace(/#br#/gi, '<br>') : '',
                        value: opt.af
                    }));

                return {
                    id: String(q.aa),
                    typeId: String(q.af), // Para que angular coincida
                    orden: q.ae,
                    text: q.ad ? String(q.ad).replace(/#br#/gi, '<br>') : '',
                    options: qOptions
                };
            })
            .sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
    }

    if (!testInfo && questionsList.length === 0) {
        return res.status(404).json({ error: 'Test no encontrado o vacío', id: testId });
    }

    // ... (resto del getTestStartData original)
    res.json({
        status: 'ok',
        mensaje: 'Flujo de backend activo y preguntas leídas del motor XML heredado',
        datos: {
            info: testInfo,
            total_preguntas: questionsList.length,
            preguntas: questionsList
        }
    });
};

exports.createTestSession = (req, res) => {
    const { testId, gender, birthYear } = req.body;

    // Aquí simulamos el flujo de start.php donde se creaban cookies / sesiones
    // En el futuro esto puede insertarse en una Base de Datos SQL/NoSQL
    const date = new Date();

    // Objeto de sesión simulado
    const sessionData = {
        testId: testId,
        gender: gender,
        birthYear: birthYear,
        startTime: date.getTime(),
        startDate: date.toISOString()
    };

    // Podemos devolver la cookie en los headers o enviar el JSON para el front-end
    res.cookie(`cookie_testea_genero`, gender, { maxAge: 2538000 });
    res.cookie(`cookie_testea_birthanio`, birthYear, { maxAge: 2538000 });
    res.cookie(`cookie_testea_${testId}_hora_inicio`, date.getHours(), { maxAge: 2538000 });

    res.json({
        status: 'ok',
        message: 'Sesión demográfica iniciada correctamente',
        session: sessionData
    });
};

exports.submitTest = async (req, res) => {
    const testId = req.params.id;
    const payload = req.body;

    console.log(`[TEST-ENGINE] Recibiendo sumisión del test: ${testId}`);

    try {
        const Admision = require('../models/admision.model');
        const TestModel = require('../models/test.model');

        // Obtener la definición del test para calcular puntaje
        let testDoc = null;
        const isMongoId = /^[a-fA-F0-9]{24}$/.test(testId);
        if (isMongoId) {
            testDoc = await TestModel.findById(testId).lean();
        }

        // Calcular puntaje real sumando los puntajes de las opciones elegidas
        let totalScore = 0;
        let maxPossibleScore = 0;
        let totalCorrect = 0;
        let totalGraded = 0;
        let totalAnswered = 0;
        const answers = payload.assessmentState || [];

        if (testDoc && testDoc.preguntas && Array.isArray(testDoc.preguntas)) {
            testDoc.preguntas.forEach((pregunta, qIndex) => {
                const qId = String(pregunta.id || pregunta._id || qIndex);
                const userAnswer = answers.find(a => String(a.questionId) === qId);

                if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
                    // Calculate max possible for this question
                    const optionScores = pregunta.opciones.map(o => {
                        if (typeof o === 'object' && o !== null) {
                            return Number(o.puntaje || o.value || 0);
                        }
                        return 0;
                    });
                    const maxForQuestion = Math.max(...optionScores, 0);
                    maxPossibleScore += maxForQuestion;

                    if (userAnswer) {
                        totalAnswered++;
                        const selectedIdx = parseInt(String(userAnswer.value), 10);

                        // Try by index first (frontend sends option index: "0", "1", "2")
                        if (!isNaN(selectedIdx) && selectedIdx >= 0 && selectedIdx < pregunta.opciones.length) {
                            const selectedOpt = pregunta.opciones[selectedIdx];
                            if (typeof selectedOpt === 'object' && selectedOpt !== null) {
                                totalScore += Number(selectedOpt.puntaje || selectedOpt.value || 0);
                                // Also count correct answers
                                if (selectedOpt.correcta || selectedOpt.esCorrecta) {
                                    totalCorrect++;
                                }
                            }
                        } else {
                            // Fallback: match by label/texto
                            const matchedOpt = pregunta.opciones.find(o => {
                                if (typeof o === 'object') {
                                    return String(o.texto || o.label || '') === String(userAnswer.value);
                                }
                                return String(o) === String(userAnswer.value);
                            });
                            if (matchedOpt && typeof matchedOpt === 'object') {
                                totalScore += Number(matchedOpt.puntaje || matchedOpt.value || 0);
                                if (matchedOpt.correcta || matchedOpt.esCorrecta) {
                                    totalCorrect++;
                                }
                            }
                        }

                        // Count graded questions (those with at least one option with score > 0)
                        if (maxForQuestion > 0) {
                            totalGraded++;
                        }
                    }
                }
            });
        }

        // Calculate percentage: if using puntaje system, use sum-based; otherwise ratio-based
        const score = maxPossibleScore > 0
            ? Math.round((totalScore / maxPossibleScore) * 100)
            : (totalGraded > 0 ? Math.round((totalCorrect / totalGraded) * 100) : 0);

        // Match against rangosPuntaje to get result title and description
        let resultTitle = '';
        let resultDescription = '';
        if (testDoc && testDoc.rangosPuntaje && Array.isArray(testDoc.rangosPuntaje)) {
            const matchedRange = testDoc.rangosPuntaje.find(r =>
                score >= (r.min || 0) && score <= (r.max || 100)
            );
            if (matchedRange) {
                resultTitle = matchedRange.resultadoAsociado || '';
                resultDescription = matchedRange.descripcionResultado || '';
            }
        }

        const demographics = payload.demographics || {};
        const tokenUnico = `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Solo guardar demographics si realmente se proporcionaron (filtrar defaults)
        const invalidGenders = ['NR', 'No definido', 'no definido', '', 'undefined', 'null'];
        const invalidYears = ['NR', '', 'undefined', 'null'];
        const genderVal = (demographics.gender && !invalidGenders.includes(demographics.gender)) ? demographics.gender : undefined;
        const birthYearVal = (demographics.birthYear && !invalidYears.includes(String(demographics.birthYear))) ? demographics.birthYear : undefined;

        // Capturar datos del formulario vinculado si fueron proporcionados
        const formData = payload.datosFormulario || null;
        const candidatoNombre = (formData && formData.nombre) ? formData.nombre : 'Evaluado';
        const candidatoCorreo = (formData && formData.correo) ? formData.correo : tokenUnico;

        // Guardar en BD
        const entry = new Admision({
            nombreCandidato: candidatoNombre,
            correo: candidatoCorreo,
            tokenUnico: tokenUnico,
            testAsignado: testId,
            estado: 'Finalizado',
            puntaje: score,
            resultadosCompletos: answers,
            generoInfo: genderVal,
            anioNacimientoInfo: birthYearVal,
            fechaFinalizacion: new Date(),
            tiempoTranscurrido: payload.metadata ? payload.metadata.timeSpentSeconds : 0,
            datosFormulario: formData
        });

        await entry.save();
        console.log(`[TEST-ENGINE] Resultado guardado: ${entry._id}, Puntaje: ${score}/100 (${totalScore}/${maxPossibleScore} pts, ${totalCorrect}/${totalGraded} correctas)`);

        // ═══════════════════════════════════════════════════════════════════
        // HOOK POST-EVALUACIÓN: Generar plan de entrenamiento automático
        // Fire-and-forget: no bloquea la respuesta al candidato
        // ═══════════════════════════════════════════════════════════════════
        try {
            const entrenamientoCtrl = require('./entrenamiento.controller');
            entrenamientoCtrl.autoAssignInternal(entry._id.toString())
                .then(plan => {
                    console.log(`[HOOK POST-EVAL] ✅ Plan de entrenamiento generado automáticamente: ${plan._id} (${plan.sprints.length} sprints) para ${plan.candidatoNombre}`);
                })
                .catch(hookErr => {
                    // No romper el flujo principal si falla la auto-asignación
                    console.warn(`[HOOK POST-EVAL] ⚠️ No se pudo generar plan automático para admisión ${entry._id}:`, hookErr.message);
                });
        } catch (hookSetupErr) {
            console.warn('[HOOK POST-EVAL] ⚠️ Error al configurar hook:', hookSetupErr.message);
        }

        res.json({
            success: true,
            message: resultTitle || 'Respuestas consolidadas satisfactoriamente.',
            data: {
                submissionIdentifier: `TESTEA-${testId}-${entry._id}`,
                safeScoreReportedLocally: score,
                totalScore,
                maxPossibleScore,
                totalCorrect,
                totalGraded,
                resultTitle,
                resultDescription,
                resultId: entry._id,
                formularioActivo: testDoc ? (testDoc.formularioActivo || false) : false,
                formularioMomento: testDoc ? (testDoc.formularioMomento || 'inicio') : 'inicio'
            }
        });
    } catch (error) {
        console.error('[TEST-ENGINE] Error guardando resultado:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando la evaluación.',
            error: error.message
        });
    }
};

// POST /api/tests/complete
exports.createFullTest = async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.nombre) {
            return res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
        }

        const buildData = {
            // 1. Datos Generales
            nombre: payload.nombre,
            descripcion: payload.descripcion,
            tipo: payload.tipo || payload.type,
            formularioVinculado: payload.formularioVinculado,
            configuracion_arbol: payload.configuracion_arbol,
            requierePin: payload.requierePin,
            imagenCabecera: payload.imageUrl || payload.imagenCabecera,
            themeColor: payload.color || payload.themeColor || '#3B82F6',
            presentationMode: payload.presentationMode || 'card',

            // 2. Preguntas
            preguntas: (payload.preguntas || []).map(p => ({
                ...p,
                reglasCondicionales: p.conditionalLogic || []
            })),

            // 3. Plantilla/Visual
            plantillaSeleccionada: payload.plantillaSeleccionada || 'theme-default',
            pantallaFinalSeleccionada: payload.pantallaFinalSeleccionada || 'theme-corporate',
            backgroundTemplate: payload.backgroundTemplate || 'default',
            customBackgroundUrl: payload.customBackgroundUrl || null,
            backgroundOpacity: payload.backgroundOpacity ?? 100,
            backgroundBlur: payload.backgroundBlur ?? 0,

            // 4. Resultados y Métodos
            evaluaTiempo: payload.evaluaTiempo,
            pesoTiempo: payload.pesoTiempo,
            rangosPuntaje: payload.rangosPuntaje || [],
            metodosEntrega: payload.metodosEntrega || [],

            // 5. Estado Interno y Legacy
            estadoPublicacion: payload.estadoPublicacion || 'Publicado',
            title: payload.nombre,
            description: payload.descripcion,
            activo: true,
            isDeleted: false,

            // 6. Logo de empresa
            companyLogoUrl: payload.companyLogoUrl || null,

            // 7. Navigation buttons
            allowNavButtons: payload.allowNavButtons !== false,

            // 8. Animation style
            animationStyle: payload.animationStyle || 'fade',

            // 9. Formulario de datos (Paso 4)
            formularioActivo: payload.formularioActivo || false,
            formularioMomento: payload.formularioMomento || 'inicio',

            // 10. Tiempo límite
            tiempoLimiteActivo: payload.tiempoLimiteActivo || false,
            tiempoLimiteMinutos: payload.tiempoLimiteMinutos || 30,
            mostrarReloj: payload.mostrarReloj !== false,

            // 11. Pantalla Final
            pantallaFinal: payload.pantallaFinal || {}
        };

        console.log(`[CREATE FULL TEST] Saving presentationMode as: ${buildData.presentationMode}`);

        const isMongoId = payload.id && /^[a-fA-F0-9]{24}$/.test(payload.id);

        let savedTest;
        if (isMongoId) {
            // ORDEN ABSOLUTA: AÑADIR explícitamente color y modo para update
            const updateSet = {
                ...buildData,
                themeColor: payload.color || payload.themeColor || buildData.themeColor,
                color: payload.color || payload.themeColor || buildData.themeColor,
                presentationMode: payload.presentationMode || buildData.presentationMode,
                allowNavButtons: payload.allowNavButtons !== false,
                animationStyle: payload.animationStyle || buildData.animationStyle
            };

            // Operación Mongoose UPDATE pura (descartando upsert preventivo para no mutar ids)
            savedTest = await TestMongo.findByIdAndUpdate(
                payload.id,
                { $set: updateSet },
                { new: true, runValidators: true }
            );

            if (!savedTest) {
                return res.status(404).json({
                    status: 'error',
                    message: `Edición denegada: No se halló ningún Test con ID ${payload.id}`
                });
            }
        } else {
            // Inserción regular atómica
            // Registrar el creador del test (solo si es ObjectId válido)
            const creador_id = req.query.user_id || req.headers['user_id'] || null;
            if (creador_id && /^[a-fA-F0-9]{24}$/.test(creador_id)) {
                buildData.creado_por = creador_id;
            }
            const newTest = new TestMongo(buildData);
            savedTest = await newTest.save();
        }

        res.status(201).json({
            status: 'ok',
            data: { _id: savedTest._id },
            message: isMongoId ? 'Instrumento actualizado exitosamente.' : 'Test y estructura completa insertados exitosamente.'
        });
    } catch (error) {
        console.error('Error [DB GUARDADO/EDICIÓN] al procesar data completa del test:', error);

        // Defensive Programming & Regresión status 500
        let statusCode = 500;
        let detailedErrorMsg = error.message || 'Error interno inesperado guardando estructura de prueba.';

        if (error.name === 'ValidationError') {
            statusCode = 400;
            const errorsArray = Object.values(error.errors || {}).map(err => err.message);
            detailedErrorMsg = `Faltan campos requeridos o hay datos inválidos: ${errorsArray.join(', ')}`;
        } else if (error.code === 11000) {
            statusCode = 409;
            detailedErrorMsg = `Fallo de índice duplicado (Restricción Unique): Múltiples tests con el mismo identificador.`;
        }

        try {
            // Log fallback fail-safe (sin tronar el backend)
            require('fs').writeFileSync(__dirname + '/last_error.log', detailedErrorMsg + '\\n\\n' + error.stack);
        } catch (e) {
            console.error('No se pudo escribir el log local');
        }

        return res.status(statusCode).json({
            status: 'error',
            message: detailedErrorMsg
        });
    }
};

// 3. POST /api/tests/parse-questions
exports.parseQuestionsText = async (req, res) => {
    try {
        let { text, isEncoded } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ status: 'error', message: 'Falta el texto a procesar' });
        }

        // Si viene codificado en Base64 desde el frontend, lo decodificamos
        if (isEncoded) {
            text = Buffer.from(text, 'base64').toString('utf8');
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const questions = [];
        let currentQuestion = null;

        // Regex patterns for question detection (multiple formats)
        // "1. ¿Qué es...?", "¿Cómo...?", "Pregunta 1:", "Pregunta 1.", "1) ...", "1- ..."
        const questionPatterns = [
            /^Pregunta\s+\d+[\.:]\s*(.*)/i,       // "Pregunta 1: texto" or "Pregunta 1. texto"
            /^(\d+[\.\-\)]\s*)(.*)/,                // "1. texto", "1) texto", "1- texto"
            /^¿(.*)/                                 // "¿Cómo...?"
        ];

        // Regex patterns for option detection (multiple formats)
        // "A. texto", "a) texto", "A- texto", "A. (Puntaje: 5) texto", "- texto"
        const optionRegex = /^([a-z][\.\-\)\:]\s*)(.*)/i;
        const dashOptionRegex = /^[-•]\s+(.*)/;

        // Score extraction from option text: "(Puntaje: 5)", "(5 puntos)", "(Valor: 3)"
        const scoreInOptionRegex = /\(\s*(?:Puntaje|Valor|Puntos|Score|P)\s*[:=]?\s*(\d+)\s*\)/i;

        function isQuestionLine(line) {
            // Don't treat A-E starting lines as questions (they're options)
            if (optionRegex.test(line)) return false;

            for (const pattern of questionPatterns) {
                if (pattern.test(line)) return true;
            }
            // Also match lines that contain a question mark and start with a number
            if (/^\d+/.test(line) && line.includes('?')) return true;

            return false;
        }

        function extractQuestionText(line) {
            // Try "Pregunta N: texto" first
            const preguntaMatch = line.match(/^Pregunta\s+\d+[\.:]\s*(.*)/i);
            if (preguntaMatch) return preguntaMatch[1].trim();

            // Try "N. texto" or "N) texto"
            const numberedMatch = line.match(/^\d+[\.\-\)]\s*(.*)/);
            if (numberedMatch) return numberedMatch[1].trim();

            // "¿texto"
            if (line.startsWith('¿')) return line;

            return line;
        }

        function extractOptionData(line) {
            let optText = '';
            let score = 0;
            let isCorrect = false;

            // Match letter-prefixed options
            const letterMatch = line.match(optionRegex);
            const dashMatch = line.match(dashOptionRegex);

            if (letterMatch) {
                optText = letterMatch[2].trim();
            } else if (dashMatch) {
                optText = dashMatch[1].trim();
            } else {
                optText = line.trim();
            }

            // Extract score from "(Puntaje: N)" pattern
            const scoreMatch = optText.match(scoreInOptionRegex);
            if (scoreMatch) {
                score = parseInt(scoreMatch[1], 10);
                optText = optText.replace(scoreInOptionRegex, '').trim();
            }

            // Detect correct answer markers
            if (/\(correcta\)|\(x\)|\[x\]|\*$/i.test(optText)) {
                isCorrect = true;
                optText = optText.replace(/\(correcta\)|\(x\)|\[x\]|\*$/ig, '').trim();
            }

            return { text: optText, score, isCorrect };
        }

        for (const line of lines) {
            if (isQuestionLine(line)) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    textoPregunta: extractQuestionText(line),
                    opciones: [],
                    respuestasCorrectas: [],
                    puntaje: 1,
                    _scores: [] // Internal: track per-option scores
                };
            } else if ((optionRegex.test(line) || dashOptionRegex.test(line)) && currentQuestion) {
                const optData = extractOptionData(line);
                currentQuestion.opciones.push(optData.text);
                currentQuestion._scores.push(optData.score);
                if (optData.isCorrect) {
                    currentQuestion.respuestasCorrectas.push(optData.text);
                }
                // Use highest score found in options as the question's base score
                if (optData.score > currentQuestion.puntaje) {
                    currentQuestion.puntaje = optData.score;
                }
            } else if (currentQuestion) {
                // Allows specifying Score mid-text like "Puntaje: 5"
                const scoreMatch = line.match(/^(?:puntaje|valor)\s*[:=]\s*(\d+)$/i);
                if (scoreMatch) {
                    currentQuestion.puntaje = parseInt(scoreMatch[1], 10);
                } else if (!line.match(/^(respuestas|opciones)/i)) {
                    // Append multiline questions
                    currentQuestion.textoPregunta += '\n' + line;
                }
            }
        }

        if (currentQuestion) {
            questions.push(currentQuestion);
        }

        // Clean up internal tracking and build final output
        const finalQuestions = questions.map(q => {
            const result = {
                textoPregunta: q.textoPregunta,
                opciones: q.opciones,
                respuestasCorrectas: q.respuestasCorrectas,
                puntaje: q.puntaje
            };

            // If we have per-option scores, convert opciones to objects with scores
            if (q._scores && q._scores.some(s => s > 0)) {
                result.opciones = q.opciones.map((opt, i) => ({
                    texto: opt,
                    puntaje: q._scores[i] || 0,
                    correcta: q.respuestasCorrectas.includes(opt)
                }));
                // In this case opciones are objects, adjust respuestasCorrectas
                result.respuestasCorrectas = q.respuestasCorrectas;
            }

            return result;
        });

        if (finalQuestions.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No se encontraron preguntas bajo el formato esperado.' });
        }

        res.status(200).json({
            status: 'ok',
            data: finalQuestions,
            message: `Parseo exitoso, ${finalQuestions.length} preguntas extraídas.`
        });

    } catch (error) {
        console.error('Error al parsear texto de preguntas:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al parsear el texto' });
    }
};

// PATCH /api/test/reorder
exports.reorderTests = async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ status: 'error', message: 'Formato inválido. Se esperaba un array de IDs.' });
        }

        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { orden: index } }
            }
        }));

        if (bulkOps.length > 0) {
            await TestMongo.bulkWrite(bulkOps);
        }

        return res.json({ status: 'ok', message: 'Orden actualizado exitosamente' });
    } catch (error) {
        console.error('Error reordenando tests:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno al actualizar el orden' });
    }
};
