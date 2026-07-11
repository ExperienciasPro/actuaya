<?php
/**
 * UnaMeta — API de Licitaciones (Puente n8n → Frontend)
 * 
 * Este micro-endpoint recibe y sirve los datos de licitaciones.
 * n8n envía los resultados aquí cada lunes a las 8am.
 * El frontend Angular los lee cuando el usuario abre el módulo.
 *
 * Endpoints:
 *   GET  /api/licitaciones.php              → Devuelve todos los batches guardados
 *   POST /api/licitaciones.php              → Recibe un nuevo batch de n8n
 *   GET  /api/licitaciones.php?action=clear → Borra todos los datos
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

// Pre-flight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Configuración ───
// Clave secreta para proteger el endpoint de escritura (cámbiala en producción)
define('API_KEY', 'um-n8n-2026-secret');
// Archivo donde se persisten los datos
define('DATA_FILE', __DIR__ . '/licitaciones_data.json');

// Inicializar archivo si no existe
if (!file_exists(DATA_FILE)) {
    file_put_contents(DATA_FILE, json_encode(['batches' => []], JSON_PRETTY_PRINT));
}

// ─── Leer datos existentes ───
function readData(): array {
    $content = file_get_contents(DATA_FILE);
    $data = json_decode($content, true);
    return is_array($data) ? $data : ['batches' => []];
}

// ─── Guardar datos ───
function saveData(array $data): void {
    file_put_contents(DATA_FILE, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// ─── Validar API Key ───
function validateApiKey(): bool {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['key'] ?? '');
    return $key === API_KEY;
}

// ═══════════════════════════════════════
//  GET — Devolver licitaciones al frontend
// ═══════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'read';

    if ($action === 'clear') {
        if (!validateApiKey()) {
            http_response_code(403);
            echo json_encode(['error' => 'API Key inválida']);
            exit;
        }
        saveData(['batches' => []]);
        echo json_encode(['success' => true, 'message' => 'Datos borrados']);
        exit;
    }

    // Lectura normal — devuelve todos los batches
    $data = readData();
    echo json_encode($data['batches']);
    exit;
}

// ═══════════════════════════════════════
//  POST — Recibir batch desde n8n
// ═══════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validar API Key
    if (!validateApiKey()) {
        http_response_code(403);
        echo json_encode(['error' => 'API Key inválida. Envía el header X-API-Key.']);
        exit;
    }

    // Leer body
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);

    if (!$payload) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON inválido en el body']);
        exit;
    }

    // Normalizar: si viene un array plano de licitaciones, lo empaquetamos
    if (isset($payload[0]) && !isset($payload['resultados'])) {
        $payload = [
            'id' => uniqid('batch-'),
            'fechaBusqueda' => date('c'),
            'semana' => 'Semana ' . date('W') . ' - ' . date('Y'),
            'query' => 'Búsqueda automática n8n + Gemini',
            'resultados' => $payload,
            'totalResultados' => count($payload),
        ];
    }

    // Asegurar campos mínimos del batch
    if (!isset($payload['id'])) $payload['id'] = uniqid('batch-');
    if (!isset($payload['fechaBusqueda'])) $payload['fechaBusqueda'] = date('c');
    if (!isset($payload['semana'])) $payload['semana'] = 'Semana ' . date('W') . ' - ' . date('Y');
    if (!isset($payload['totalResultados'])) $payload['totalResultados'] = count($payload['resultados'] ?? []);

    // Guardar
    $data = readData();
    // Agregar al inicio (más reciente primero), máximo 52 semanas (1 año)
    array_unshift($data['batches'], $payload);
    $data['batches'] = array_slice($data['batches'], 0, 52);
    saveData($data);

    echo json_encode([
        'success' => true,
        'message' => $payload['totalResultados'] . ' licitaciones guardadas.',
        'batchId' => $payload['id'],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
