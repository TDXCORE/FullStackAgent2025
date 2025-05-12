# Normalización de Números Telefónicos

Este documento describe la implementación de normalización de números telefónicos para resolver el problema de usuarios duplicados en la base de datos.

## Problema

Se identificó un problema donde se estaban creando usuarios duplicados en la base de datos debido a diferentes formatos de números telefónicos:

- Un usuario con código de país (ej: 573153041548)
- El mismo usuario sin código de país (ej: 3153041548)

Esto resultaba en conversaciones duplicadas y experiencia fragmentada para los usuarios.

## Solución Implementada

Se ha implementado una solución que normaliza los números telefónicos a un formato estándar con código de país. La solución consta de tres partes:

1. **Utilidades de normalización**: Funciones para normalizar números telefónicos y encontrar formatos alternativos.
2. **Integración en el flujo de trabajo**: Modificación de las funciones existentes para usar números normalizados.
3. **Script de migración**: Herramienta para corregir datos existentes.

### Archivos Modificados

- `utils/phone_utils.py` (nuevo): Utilidades para normalización de números telefónicos.
- `db_operations.py`: Actualizado para usar números normalizados al buscar y crear usuarios.
- `simple_webhook.py`: Actualizado para normalizar números telefónicos de remitentes.

### Archivos Creados

- `scripts/fix_duplicate_users.py`: Script para identificar y fusionar usuarios duplicados.

## Cómo Funciona

### Normalización de Números

La función `normalize_phone_number` en `utils/phone_utils.py`:

1. Elimina todos los caracteres no numéricos
2. Detecta si el número ya tiene código de país (57)
3. Añade el código de país si es necesario
4. Retorna el número normalizado

### Búsqueda de Usuarios

La función `get_user_by_phone` en `db_operations.py` ahora:

1. Normaliza el número telefónico
2. Busca primero con el número normalizado
3. Si no encuentra, busca con el número original
4. Si no encuentra, busca con formatos alternativos
5. Si encuentra un usuario con formato alternativo, actualiza su número al formato normalizado

### Creación de Usuarios

La función `get_or_create_user` en `db_operations.py` ahora:

1. Normaliza el número telefónico
2. Busca usuarios existentes con el número normalizado
3. Si no existe, crea un nuevo usuario con el número normalizado

### Procesamiento de Mensajes Entrantes

La función `process_incoming_message` en `simple_webhook.py` ahora:

1. Normaliza el número telefónico del remitente
2. Usa el número normalizado para todas las operaciones subsiguientes

## Corrección de Datos Existentes

El script `scripts/fix_duplicate_users.py` permite corregir usuarios duplicados existentes:

1. Identifica grupos de usuarios con el mismo número normalizado
2. Para cada grupo, selecciona un usuario principal (el más antiguo)
3. Transfiere todas las conversaciones y referencias de los usuarios duplicados al usuario principal
4. Actualiza el número telefónico del usuario principal al formato normalizado

### Uso del Script de Migración

```bash
cd NextJsTemplateFull/Agent
python scripts/fix_duplicate_users.py
```

El script generará un archivo de log `fix_duplicate_users.log` con detalles de las operaciones realizadas.

## Consideraciones

- Por seguridad, el script de migración no elimina los usuarios duplicados automáticamente. Esta operación debe realizarse manualmente si se desea.
- La normalización asume que los números sin código de país son colombianos (57).
- Se recomienda hacer una copia de seguridad de la base de datos antes de ejecutar el script de migración.
