<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

$downloadDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Download';
if (!is_dir($downloadDirectory)) {
    http_response_code(404);
    echo json_encode(['error' => 'Download directory not found']);
    exit;
}

$entries = scandir($downloadDirectory) ?: [];
$files = [];

foreach ($entries as $entry) {
    if ($entry === '.' || $entry === '..' || str_starts_with($entry, '.')) continue;
    $path = $downloadDirectory . DIRECTORY_SEPARATOR . $entry;
    if (!is_file($path) || !is_readable($path)) continue;

    $extension = strtolower((string) pathinfo($entry, PATHINFO_EXTENSION));
    $files[] = [
        'name' => $entry,
        'size' => filesize($path) ?: 0,
        'extension' => $extension,
        'url' => '/Download/' . rawurlencode($entry),
    ];
}

usort($files, static fn(array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));
echo json_encode($files, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
