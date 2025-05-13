@echo off
echo === Script de Prueba de Actualizaciones en Tiempo Real ===

if "%1"=="" (
  echo Error: Debes proporcionar un ID de conversacion como argumento.
  echo Uso: run-real-time-test.bat ^<conversation_id^>
  exit /b 1
)

echo Ejecutando prueba con ID de conversacion: %1
echo.

node test-real-time-updates.js %1

echo.
echo === Prueba finalizada ===
echo Verifica en el navegador que los mensajes aparezcan automaticamente.
pause
