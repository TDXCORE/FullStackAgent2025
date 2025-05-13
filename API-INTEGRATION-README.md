# Integración de API de Chat - Solución

## Problema Identificado

Se identificó un problema con la integración de la API de chat externa (`https://waagentv1.onrender.com/api/`). Aunque la API de usuarios funcionaba correctamente, las APIs de conversaciones y mensajes estaban devolviendo errores 404, y el backend no estaba recibiendo ninguna petición.

El problema principal era la configuración `dynamic = 'force-static'` en los archivos de ruta (`route.js`), que hacía que las rutas se generaran durante el tiempo de compilación (build time) y no durante el tiempo de ejecución (runtime). Esto es incompatible con las API Routes que necesitan hacer solicitudes dinámicas a un servidor externo.

Además, la configuración `output: 'export'` en `next.config.mjs` estaba configurando la aplicación para exportación estática, lo que es incompatible con las API Routes dinámicas.

## Solución Implementada

Para resolver este problema, se ha implementado una solución híbrida que funciona tanto en desarrollo local como en producción:

1. **Enfoque de cliente directo a API externa**:
   - Se modificó `chatService.js` para que pueda usar directamente la API externa en producción
   - Se configuraron variables de entorno para controlar la URL de la API

2. **Configuración de Next.js**:
   - Se simplificó `next.config.mjs` para usar `output: 'export'` en producción
   - Se configuraron las rutas como estáticas (`dynamic = 'force-static'`) para compatibilidad con la exportación estática
   - Se añadió soporte para variables de entorno en la configuración

3. **Variables de entorno**:
   - Se crearon archivos `.env.local` y `.env.production` para configurar el entorno
   - Se configuró `NEXT_PUBLIC_API_BASE_URL` para apuntar a la API externa en producción

4. **Scripts de construcción**:
   - Se añadió un script `render-build` en `package.json` específico para Render

## Archivos Modificados

1. **`next.config.mjs`**:
   - Simplificado para usar `output: 'export'` en producción
   - Eliminadas las reescrituras (rewrites) que no son compatibles con la exportación estática
   - Añadida configuración de variables de entorno

2. **`package.json`**:
   - Añadido script `render-build` para Render

3. **`src/services/chatService.js`**:
   - Modificado para usar la variable de entorno `NEXT_PUBLIC_API_BASE_URL`
   - Configurado para funcionar tanto en desarrollo como en producción

4. **Archivos de ruta**:
   - `src/app/api/chat/conversations/route.js`
   - `src/app/api/chat/messages/route.js`
   - `src/app/api/chat/users/route.js`
   - Todos configurados para usar la variable de entorno y ser compatibles con la exportación estática

5. **Nuevos archivos**:
   - `.env.local`: Configuración para desarrollo local
   - `.env.production`: Configuración para producción

## Configuración en Render

Para que la aplicación funcione correctamente en Render, es necesario:

1. Configurar la variable de entorno `NEXT_PUBLIC_API_BASE_URL=https://waagentv1.onrender.com/api` en Render
2. Usar el comando de construcción `npm run render-build` en lugar de `npm run build`

## Desarrollo Local

Para desarrollo local, hay dos opciones:

1. **Usar API Routes locales**:
   - Mantener comentada la variable `NEXT_PUBLIC_API_BASE_URL` en `.env.local`
   - Ejecutar `npm run dev`

2. **Usar API externa directamente**:
   - Descomentar y configurar `NEXT_PUBLIC_API_BASE_URL` en `.env.local`
   - Ejecutar `npm run dev`

## Notas Adicionales

- Las rutas dinámicas como `/api/chat/conversations?user_id=123` funcionarán correctamente en desarrollo local
- En producción, las solicitudes se harán directamente a la API externa
- Esta solución mantiene la compatibilidad con la exportación estática requerida por Render
