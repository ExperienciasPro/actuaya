<?php
/**
 * UnaMeta — API de Recordatorios Móviles
 * 
 * n8n envía recordatorios diarios aquí (ej: 7am).
 * El Coach Móvil los lee cuando el usuario abre la app.
 *
 * Endpoints:
 *   GET  /api/reminders.php?user=ID       → Recordatorios pendientes del usuario
 *   POST /api/reminders.php               → n8n envía nuevos recordatorios
 *   GET  /api/reminders.php?action=ack&id=X&user=ID → Marca un recordatorio como leído
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('API_KEY', 'um-n8n-2026-secret');
define('DATA_DIR', __DIR__ . '/reminders_data/');

// Crear directorio si no existe
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

function getUserFile(string $userId): string {
    // Sanitize user ID for filename safety
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '', $userId);
    return DATA_DIR . $safe . '.json';
}

function readUserReminders(string $userId): array {
    $file = getUserFile($userId);
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveUserReminders(string $userId, array $reminders): void {
    file_put_contents(getUserFile($userId), json_encode($reminders, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function validateApiKey(): bool {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['key'] ?? '');
    return $key === API_KEY;
}

// ═══════════════════════════════════════
//  GET — Leer recordatorios del usuario
// ═══════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = $_GET['user'] ?? '';
    $action = $_GET['action'] ?? 'read';

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta parámetro user']);
        exit;
    }

    // Marcar como leído
    if ($action === 'ack') {
        $reminderId = $_GET['id'] ?? '';
        $reminders = readUserReminders($userId);
        $reminders = array_map(function($r) use ($reminderId) {
            if ($r['id'] === $reminderId) $r['read'] = true;
            return $r;
        }, $reminders);
        saveUserReminders($userId, $reminders);
        echo json_encode(['success' => true]);
        exit;
    }

    // Leer: devolver solo no leídos, de las últimas 48 horas
    $reminders = readUserReminders($userId);
    $cutoff = time() - (48 * 3600); // últimas 48h
    $pending = array_values(array_filter($reminders, function($r) use ($cutoff) {
        return !($r['read'] ?? false) && strtotime($r['createdAt'] ?? '2000-01-01') >= $cutoff;
    }));

    echo json_encode($pending);
    exit;
}

// ═══════════════════════════════════════
//  POST — n8n envía recordatorios
// ═══════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateApiKey()) {
        http_response_code(403);
        echo json_encode(['error' => 'API Key inválida']);
        exit;
    }

    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);

    if (!$payload) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON inválido']);
        exit;
    }

    // Soporta envío individual o batch
    $items = isset($payload[0]) ? $payload : [$payload];
    $count = 0;

    foreach ($items as $item) {
        $userId = $item['userId'] ?? $item['user'] ?? '';
        if (!$userId) continue;

        $reminder = [
            'id' => $item['id'] ?? uniqid('rem-'),
            'type' => $item['type'] ?? 'general',        // task, goal, radar, general
            'title' => $item['title'] ?? 'Recordatorio',
            'message' => $item['message'] ?? '',
            'icon' => $item['icon'] ?? '🔔',
            'priority' => $item['priority'] ?? 'normal',  // low, normal, high
            'createdAt' => $item['createdAt'] ?? date('c'),
            'read' => false,
        ];

        $reminders = readUserReminders($userId);
        array_unshift($reminders, $reminder);
        // Mantener máximo 100 recordatorios por usuario
        $reminders = array_slice($reminders, 0, 100);
        saveUserReminders($userId, $reminders);
        $count++;
    }

    echo json_encode([
        'success' => true,
        'message' => "$count recordatorio(s) guardado(s).",
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
