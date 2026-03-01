cd "C:\Users\User\Desktop\Aatron\server"
Write-Host "Activating venv..."
& "C:\Users\User\Desktop\Aatron\server\venv\Scripts\python.exe" -c "print('Python ready')"
Write-Host "Starting backend on http://0.0.0.0:8000"
& "C:\Users\User\Desktop\Aatron\server\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
