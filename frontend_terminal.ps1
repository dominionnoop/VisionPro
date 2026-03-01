cd "C:\Users\User\Desktop\Aatron\client"
Write-Host "Starting frontend on http://localhost:3000"
Write-Host "Installing dependencies (if needed)..."
pnpm install 2>&1 | Out-Null
pnpm dev
