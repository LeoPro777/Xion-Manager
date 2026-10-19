import subprocess
import sys
import os
import time

def main():
    print("=" * 60)
    print("🚀 Levantando Xion-Manager en Modo Desarrollo Local (Sin Docker)")
    print("=" * 60)
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend-web")
    
    # 1. Instalar requerimientos de backend si no están presentes
    print("\n📦 Verificando dependencias del Backend Python...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", os.path.join(backend_dir, "requirements.txt")], check=False)
    
    # 2. Iniciar servidor FastAPI Backend
    print("\n⚡ Iniciando Backend FastAPI en http://localhost:8000 ...")
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = backend_dir
    
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        env=backend_env
    )
    
    # 3. Iniciar servidor Frontend Vite Web
    print("\n💻 Iniciando Frontend Web React/Vite en http://localhost:3000 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    # Instalar npm packages si node_modules no existe
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("📦 Instalando dependencias Node.js en frontend-web...")
        subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=False)
        
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )
    
    print("\n" + "=" * 60)
    print("✅ Xion-Manager Backend & Frontend iniciados exitosamente!")
    print("🌐 Backend API Docs: http://localhost:8000/docs")
    print("🌐 Frontend Web App:  http://localhost:3000")
    print("Presiona Ctrl+C para detener ambos servidores.")
    print("=" * 60 + "\n")
    
    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servidores de Xion-Manager...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✓ Servidores detenidos.")

if __name__ == "__main__":
    main()
