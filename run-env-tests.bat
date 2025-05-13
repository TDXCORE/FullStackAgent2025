@echo off
echo === Ejecutando pruebas de configuracion de entorno ===

echo.
echo === Prueba en modo desarrollo (sin variable de entorno) ===
set NODE_ENV=development
node test-env-config.js

echo.
echo === Prueba en modo produccion (con variable de entorno) ===
set NODE_ENV=production
set NEXT_PUBLIC_API_BASE_URL=https://waagentv1.onrender.com/api
node test-env-config.js

echo.
echo === Pruebas completadas ===
pause
