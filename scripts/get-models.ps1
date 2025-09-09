$DEST = "public/models"
$BASE = "https://justadudewhohacks.github.io/face-api.js/models"

# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $DEST | Out-Null

$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1.bin",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1.bin",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1.bin",
    "face_recognition_model-shard2.bin"
)

Write-Host "🤖 Downloading face-api.js models..." -ForegroundColor Cyan

foreach ($file in $files) {
    Write-Host "↓ $file" -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "$BASE/$file" -OutFile "$DEST/$file" -ErrorAction Stop
        Write-Host "✅ $file downloaded" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to download $file : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "✅ Models ready in $DEST" -ForegroundColor Green
