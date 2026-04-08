<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Allow CORS for local development if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$allowedMethods = ['GET', 'POST'];
if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods, true)) {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$rootDir = dirname(__DIR__);
$dataDir = $rootDir . DIRECTORY_SEPARATOR . 'data';
$stateFile = $dataDir . DIRECTORY_SEPARATOR . 'state.json';

// Default initial state for Lean Manufacturing app
$defaultState = [
    'projects' => [],
    'processes' => [],
    'elements' => [],
    'timeSamples' => [],
    'tskLayouts' => []
];

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

if (!file_exists($stateFile)) {
    file_put_contents(
        $stateFile,
        json_encode(['state' => $defaultState], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function jsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readStateFile(string $stateFile, array $defaultState): array
{
    $raw = @file_get_contents($stateFile);
    if ($raw === false || trim($raw) === '') {
        return $defaultState;
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return $defaultState;
    }

    $state = $decoded['state'] ?? $decoded;
    if (!is_array($state)) {
        return $defaultState;
    }

    return array_merge($defaultState, $state);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $state = readStateFile($stateFile, $defaultState);
    jsonResponse(['ok' => true, 'state' => $state]);
}

// Handle POST request to overwrite state
$rawInput = file_get_contents('php://input');
if ($rawInput === false || trim($rawInput) === '') {
    jsonResponse(['ok' => false, 'error' => 'Request body kosong'], 400);
}

$payload = json_decode($rawInput, true);
if (!is_array($payload) || !isset($payload['state']) || !is_array($payload['state'])) {
    jsonResponse(['ok' => false, 'error' => 'Format payload tidak valid'], 400);
}

// Merge or overwrite completely
$nextState = array_merge($defaultState, $payload['state']);
$writeData = [
    'updatedAt' => gmdate('c'),
    'state' => $nextState,
];

$ok = @file_put_contents(
    $stateFile,
    json_encode($writeData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
    LOCK_EX
);

if ($ok === false) {
    jsonResponse(['ok' => false, 'error' => 'Gagal menulis file state'], 500);
}

jsonResponse(['ok' => true, 'savedAt' => gmdate('c')]);
