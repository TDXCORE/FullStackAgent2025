@echo off
echo Instalando dependencias necesarias...
npm install node-fetch@2

echo.
echo Ejecutando pruebas de API...
node test-api-endpoints.js

echo.
echo Presiona cualquier tecla para salir...
pause > nul
