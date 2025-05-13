# Herramientas de Depuración para la Integración de API de Chat

Este documento describe las herramientas de depuración creadas para diagnosticar y solucionar problemas con la integración de la API de chat.

## Problema

La aplicación frontend no está mostrando correctamente las conversaciones y mensajes de la API. Aunque los endpoints están correctamente configurados, parece haber un problema en la integración entre el frontend y los endpoints.

## Herramientas de Depuración

Se han creado varias herramientas para ayudar a diagnosticar y solucionar el problema:

### 1. Botón de Depuración en la Interfaz de Chat

Se ha agregado un botón de depuración (ícono de insecto) en la esquina inferior derecha de la interfaz de chat. Al hacer clic en este botón, se muestra un menú con enlaces a las herramientas de depuración.

### 2. API Debugger

Accesible en `/apps/chat/debug`, esta herramienta proporciona una interfaz para examinar el estado de la API y las llamadas que se realizan.

### 3. API Test Tool

Accesible en `/apps/chat/test-api`, esta herramienta proporciona una interfaz más completa para probar directamente los endpoints de la API:

- Obtener contactos
- Obtener conversaciones para un usuario
- Crear conversaciones
- Obtener mensajes para una conversación
- Enviar mensajes

### 4. Script de Prueba de API

Se ha creado un script de Node.js (`test-api-endpoints.js`) que prueba directamente los endpoints de la API externa:

- Obtiene usuarios
- Obtiene conversaciones para un usuario
- Crea una conversación si no existe ninguna
- Obtiene mensajes para una conversación
- Envía un mensaje de prueba
- Verifica que el mensaje se haya agregado correctamente

Para ejecutar este script, simplemente ejecute el archivo batch `run-api-tests.bat`.

## Cómo Usar las Herramientas

1. **Para acceder a las herramientas de depuración desde la interfaz de chat**:
   - Navegue a la página de chat (`/apps/chat/chats`)
   - Haga clic en el botón de depuración (ícono de insecto) en la esquina inferior derecha
   - Seleccione la herramienta que desea utilizar

2. **Para usar el API Debugger**:
   - Navegue a `/apps/chat/debug`
   - Haga clic en "Fetch Contacts" para obtener la lista de contactos
   - Seleccione un contacto para ver sus conversaciones
   - Seleccione una conversación para ver sus mensajes

3. **Para usar el API Test Tool**:
   - Navegue a `/apps/chat/test-api`
   - Siga el flujo de trabajo: Obtener contactos -> Seleccionar usuario -> Obtener/Crear conversaciones -> Seleccionar conversación -> Obtener/Enviar mensajes
   - Observe los logs para ver el resultado de cada operación

4. **Para ejecutar el script de prueba de API**:
   - Ejecute el archivo batch `run-api-tests.bat`
   - Observe la salida en la consola para ver el resultado de las pruebas

## Solución de Problemas Comunes

1. **No se muestran contactos**:
   - Verifique que la API de usuarios esté funcionando correctamente
   - Verifique que el componente ContactList esté llamando a getContacts()

2. **No se muestran conversaciones**:
   - Verifique que la API de conversaciones esté funcionando correctamente
   - Verifique que se esté llamando a getConversations() con el ID de usuario correcto
   - Verifique que el estado de conversaciones se esté actualizando correctamente

3. **No se muestran mensajes**:
   - Verifique que la API de mensajes esté funcionando correctamente
   - Verifique que se esté llamando a getMessages() con el ID de conversación correcto
   - Verifique que el estado de mensajes se esté actualizando correctamente

4. **No se pueden enviar mensajes**:
   - Verifique que la API de mensajes esté funcionando correctamente
   - Verifique que se esté llamando a sendMessage() con los parámetros correctos
   - Verifique que el estado de mensajes se esté actualizando después de enviar un mensaje

## Próximos Pasos

1. Utilice las herramientas de depuración para identificar exactamente dónde está fallando la integración
2. Corrija los problemas identificados
3. Verifique que la aplicación funcione correctamente después de las correcciones
