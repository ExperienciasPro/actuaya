<?php
/**
 * UnaMeta — API de Datos Persistentes
 * Almacena datos como archivos JSON en el servidor.
 * 
 * Endpoints:
 *   GET  /api/data.php?key=subscriptions    → Lee datos de una clave
 *   POST /api/data.php?key=subscriptions    → Guarda datos de una clave (body = JSON)
 *   GET  /api/data.php?key=_bulk            → Lee TODOS los datos
 *   POST /api/data.php?key=_bulk            → Guarda TODOS los datos (body = { key: data, ... })
 * 
 * Los archivos se guardan en ./data/{key}.json
 */

// ─── CORS ────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Config ──────────────────────────────────
$DATA_DIR = __DIR__ . '/data';
$AUTH_TOKEN = 'um_api_2026'; // Token simple de autenticación

// Crear directorio de datos si no existe
if (!is_dir($DATA_DIR)) {
    mkdir($DATA_DIR, 0755, true);
}

// ─── Validación ──────────────────────────────
$key = $_GET['key'] ?? null;

if (!$key) {
    http_response_code(400);
    echo json_encode(['error' => 'Parámetro "key" es requerido']);
    exit;
}

// Validar que la clave sea segura (solo alfanuméricos, guiones bajos y guiones)
if ($key !== '_bulk' && !preg_match('/^[a-zA-Z0-9_-]+$/', $key)) {
    http_response_code(400);
    echo json_encode(['error' => 'Clave no válida']);
    exit;
}

// Verificar token (cabecera X-Auth-Token)
$token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
if ($token !== $AUTH_TOKEN) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

// ═══════════════════════════════════════════════
// BULK: Leer/Escribir TODOS los datos de una vez
// ═══════════════════════════════════════════════
if ($key === '_bulk') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Leer todos los archivos JSON
        $allData = [];
        $files = glob($DATA_DIR . '/*.json');
        foreach ($files as $file) {
            $name = basename($file, '.json');
            // Excluir backups
            if (strpos($name, '.backup') !== false) continue;
            $content = file_get_contents($file);
            $decoded = json_decode($content);
            if ($decoded !== null) {
                $allData[$name] = $decoded;
            }
        }
        echo json_encode($allData);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = file_get_contents('php://input');
        $allData = json_decode($body, true);

        if (!is_array($allData)) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON no válido, se espera un objeto']);
            exit;
        }

        $saved = [];
        foreach ($allData as $dataKey => $dataValue) {
            // Validar clave segura
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $dataKey)) continue;

            $filePath = $DATA_DIR . '/' . $dataKey . '.json';

            // Backup
            if (file_exists($filePath)) {
                copy($filePath, $DATA_DIR . '/' . $dataKey . '.backup.json');
            }

            $written = file_put_contents($filePath, json_encode($dataValue), LOCK_EX);
            if ($written !== false) {
                $saved[] = $dataKey;
            }
        }

        echo json_encode([
            'ok' => true,
            'savedKeys' => $saved,
            'count' => count($saved),
            'savedAt' => date('c'),
        ]);
        exit;
    }
}

// ═══════════════════════════════════════════════
// Clave individual
// ═══════════════════════════════════════════════
$filePath = $DATA_DIR . '/' . $key . '.json';

// ─── GET: Leer datos ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        echo $content;
    } else {
        echo json_encode([]);
    }
    exit;
}

// ─── POST: Guardar datos ─────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    
    // Validar que sea JSON válido
    $decoded = json_decode($body);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON no válido: ' . json_last_error_msg()]);
        exit;
    }
    
    // Crear backup antes de sobreescribir
    if (file_exists($filePath)) {
        $backupPath = $DATA_DIR . '/' . $key . '.backup.json';
        copy($filePath, $backupPath);
    }
    
    // Guardar
    $written = file_put_contents($filePath, $body, LOCK_EX);
    
    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo escribir el archivo']);
        exit;
    }
    
    echo json_encode([
        'ok' => true,
        'key' => $key,
        'size' => $written,
        'savedAt' => date('c'),
    ]);
    exit;
}

// Método no soportado
http_response_code(405);
echo json_encode(['error' => 'Método no soportado']);
