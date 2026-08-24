<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

function decodeId3Text(string $data): string {
    if ($data === '') return '';
    $encoding = ord($data[0]);
    $text = substr($data, 1);
    if ($encoding === 1) {
        $text = function_exists('mb_convert_encoding')
            ? mb_convert_encoding($text, 'UTF-8', 'UTF-16')
            : (iconv('UTF-16', 'UTF-8//IGNORE', $text) ?: '');
    } elseif ($encoding === 2) {
        $text = function_exists('mb_convert_encoding')
            ? mb_convert_encoding($text, 'UTF-8', 'UTF-16BE')
            : (iconv('UTF-16BE', 'UTF-8//IGNORE', $text) ?: '');
    } elseif ($encoding === 0) {
        $text = function_exists('mb_convert_encoding')
            ? mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1')
            : (iconv('ISO-8859-1', 'UTF-8//IGNORE', $text) ?: $text);
    }
    return trim(str_replace(["\xEF\xBB\xBF", "\0"], '', $text));
}

function readId3Tags(string $path): array {
    $handle = @fopen($path, 'rb');
    if (!$handle) return [];
    $header = fread($handle, 10);
    if (strlen($header) !== 10 || substr($header, 0, 3) !== 'ID3') { fclose($handle); return []; }
    $version = ord($header[3]);
    $sizeBytes = array_values(unpack('C4', substr($header, 6, 4)));
    $tagSize = ($sizeBytes[0] << 21) | ($sizeBytes[1] << 14) | ($sizeBytes[2] << 7) | $sizeBytes[3];
    $end = 10 + $tagSize;
    $tags = [];

    while (ftell($handle) + 10 <= $end && count($tags) < 2) {
        $frameHeader = fread($handle, 10);
        $id = substr($frameHeader, 0, 4);
        if (!preg_match('/^[A-Z0-9]{4}$/', $id)) break;
        $rawSize = array_values(unpack('C4', substr($frameHeader, 4, 4)));
        $frameSize = $version === 4
            ? (($rawSize[0] << 21) | ($rawSize[1] << 14) | ($rawSize[2] << 7) | $rawSize[3])
            : (($rawSize[0] << 24) | ($rawSize[1] << 16) | ($rawSize[2] << 8) | $rawSize[3]);
        if ($frameSize <= 0 || ftell($handle) + $frameSize > $end) break;
        if ($id === 'TIT2' || $id === 'TPE1') $tags[$id] = decodeId3Text((string) fread($handle, $frameSize));
        else fseek($handle, $frameSize, SEEK_CUR);
    }
    fclose($handle);
    return $tags;
}

$musicDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'music';
if (!is_dir($musicDirectory)) {
    http_response_code(404);
    echo json_encode(['error' => 'Music directory not found']);
    exit;
}

$files = glob($musicDirectory . DIRECTORY_SEPARATOR . '*.{mp3,MP3}', GLOB_BRACE) ?: [];
natcasesort($files);
$tracks = [];

foreach ($files as $path) {
    $file = basename($path);
    $label = preg_replace('/\.mp3$/i', '', $file);
    $parts = preg_split('/\s+-\s+/', $label, 2);
    $tags = readId3Tags($path);
    $tracks[] = [
        'artist' => $tags['TPE1'] ?? (count($parts) === 2 ? trim($parts[0]) : 'Không rõ nghệ sĩ'),
        'name' => $tags['TIT2'] ?? (count($parts) === 2 ? trim($parts[1]) : trim($label)),
        'file' => $file,
    ];
}

echo json_encode($tracks, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
