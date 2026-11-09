@echo off
REM =============================================================================
REM XION-MANAGER: Script Batch de Reinicio de Base de Datos para Windows
REM =============================================================================
echo =============================================================================
echo 🔄 Ejecutando reinicio de Base de Datos Xion-Manager...
echo =============================================================================

python scripts\reset_db.py %*

pause

