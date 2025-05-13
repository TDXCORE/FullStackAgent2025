# API Endpoint Tests

Este conjunto de scripts de prueba está diseñado para verificar que los nuevos endpoints de API estén funcionando correctamente y que la implementación de proxy en la aplicación Next.js esté configurada adecuadamente.

## Archivos Incluidos

1. **test-endpoints.js**: Prueba básica de los endpoints externos (`https://waagentv1.onrender.com/api/...`)
2. **test-local-endpoints.js**: Prueba básica de los endpoints locales (`http://localhost:3000/api/chat/...`)
3. **test-all-methods.js**: Prueba completa de todos los métodos HTTP (GET, POST, PUT, DELETE) para ambos endpoints
4. **run-tests.bat**: Script para ejecutar todas las pruebas secuencialmente

## Requisitos Previos

- Node.js instalado
- La aplicación Next.js debe estar ejecutándose en `localhost:3000` para las pruebas locales

## Cómo Ejecutar las Pruebas

### Opción 1: Usando el Script Automatizado

Simplemente ejecute el archivo `run-tests.bat`:

```
run-tests.bat
```

Este script:
1. Instalará las dependencias necesarias
2. Ejecutará las pruebas básicas para los endpoints externos
3. Pausará para que puedas iniciar tu aplicación Next.js si aún no está en ejecución
4. Ejecutará las pruebas básicas para los endpoints locales
5. Ejecutará las pruebas completas para los endpoints externos
6. Pausará nuevamente
7. Ejecutará las pruebas completas para los endpoints locales

### Opción 2: Ejecutar Scripts Individualmente

También puedes ejecutar cada script de prueba individualmente:

```
# Instalar dependencias
npm install node-fetch@2

# Probar endpoints externos básicos
node test-endpoints.js

# Probar endpoints locales básicos
node test-local-endpoints.js

# Probar todos los métodos en endpoints externos
node test-all-methods.js --external

# Probar todos los métodos en endpoints locales
node test-all-methods.js --local
```

## Interpretación de Resultados

Los scripts mostrarán información detallada sobre cada solicitud y respuesta, incluyendo:

- URL de la solicitud
- Método HTTP
- Cuerpo de la solicitud (para POST/PUT)
- Código de estado de la respuesta
- Datos de la respuesta

Al final de cada prueba, se mostrará un resumen indicando si cada endpoint pasó o falló la prueba.

## Solución de Problemas

Si las pruebas de los endpoints externos tienen éxito pero las pruebas locales fallan, esto indica que hay un problema con la implementación del proxy en la aplicación Next.js. Verifica:

1. Que la aplicación Next.js esté ejecutándose en `localhost:3000`
2. Que los archivos de ruta API (`route.js`) estén configurados correctamente
3. Que las URLs y parámetros se estén pasando correctamente a los endpoints externos

Si ambas pruebas fallan, puede haber un problema con los endpoints externos o con la conectividad a internet.

## Endpoints Probados

1. __Gestión de Conversaciones__:
   - URL Base: `https://waagentv1.onrender.com/api/conversations`
   - Métodos: GET, POST, PUT, DELETE

2. __Gestión de Mensajes__:
   - URL Base: `https://waagentv1.onrender.com/api/messages`
   - Métodos: GET, POST, PUT, DELETE

3. __Gestión de Usuarios__:
   - URL Base: `https://waagentv1.onrender.com/api/users`
   - Métodos: GET, POST, PUT, DELETE
