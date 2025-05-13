@echo off
echo Installing required dependencies...
npm install node-fetch@2

echo.
echo ===== BASIC TESTS =====
echo.
echo Running tests for external API endpoints...
node test-endpoints.js

echo.
echo.
echo NOTE: Make sure your Next.js application is running on localhost:3000 before running the local tests.
echo Press any key to run local API tests or Ctrl+C to exit...
pause > nul

echo.
echo Running tests for local API endpoints...
node test-local-endpoints.js

echo.
echo ===== COMPREHENSIVE TESTS =====
echo.
echo These tests will test all HTTP methods (GET, POST, PUT, DELETE) for each endpoint.
echo.
echo Running comprehensive tests for external API endpoints...
node test-all-methods.js --external

echo.
echo.
echo NOTE: Make sure your Next.js application is running on localhost:3000 before running the local tests.
echo Press any key to run comprehensive local API tests or Ctrl+C to exit...
pause > nul

echo.
echo Running comprehensive tests for local API endpoints...
node test-all-methods.js --local

echo.
echo All tests completed.
pause
