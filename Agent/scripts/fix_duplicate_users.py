"""
Script para corregir usuarios duplicados en la base de datos.

Este script identifica usuarios con números de teléfono duplicados (con y sin código de país),
fusiona sus conversaciones y actualiza la base de datos.

Uso:
    python fix_duplicate_users.py

Requiere que las variables de entorno de Supabase estén configuradas.
"""

import os
import sys
import logging
from dotenv import load_dotenv
import time

# Añadir el directorio padre al path para poder importar los módulos
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

# Cargar variables de entorno
# Primero intentar cargar desde el directorio actual
load_dotenv()
# Luego intentar cargar desde el directorio del script
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
# Finalmente intentar cargar desde el directorio padre
load_dotenv(os.path.join(parent_dir, '.env'))

# Verificar que las variables de entorno estén cargadas
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("fix_duplicate_users.log")
    ]
)
logger = logging.getLogger(__name__)

# Mostrar información sobre las variables de entorno
logger.info(f"NEXT_PUBLIC_SUPABASE_URL: {'Configurado' if supabase_url else 'No configurado'}")
logger.info(f"SUPABASE_SERVICE_ROLE_KEY: {'Configurado' if supabase_key else 'No configurado'}")

# Importar después de ajustar el path y cargar variables de entorno
from supabase_client import get_supabase_client
from utils.phone_utils import normalize_phone_number, find_duplicate_phone_formats

# Obtener cliente de Supabase
supabase = get_supabase_client()

def get_all_users():
    """Obtiene todos los usuarios de la base de datos"""
    response = supabase.table("users").select("*").execute()
    return response.data

def find_duplicate_users(users):
    """
    Identifica usuarios duplicados basados en números de teléfono normalizados.
    
    Returns:
        Lista de grupos de usuarios duplicados, donde cada grupo es una lista de usuarios
        con el mismo número de teléfono normalizado.
    """
    # Diccionario para agrupar usuarios por número normalizado
    normalized_groups = {}
    
    for user in users:
        phone = user.get("phone")
        if not phone:
            continue
        
        # Normalizar el número de teléfono
        normalized_phone = normalize_phone_number(phone)
        if not normalized_phone:
            continue
        
        # Agrupar por número normalizado
        if normalized_phone not in normalized_groups:
            normalized_groups[normalized_phone] = []
        
        normalized_groups[normalized_phone].append(user)
    
    # Filtrar solo los grupos con más de un usuario (duplicados)
    duplicate_groups = [group for group in normalized_groups.values() if len(group) > 1]
    
    return duplicate_groups

def get_user_conversations(user_id):
    """Obtiene todas las conversaciones de un usuario"""
    response = supabase.table("conversations").select("*").eq("user_id", user_id).execute()
    return response.data

def get_conversation_messages(conversation_id):
    """Obtiene todos los mensajes de una conversación"""
    response = supabase.table("messages").select("*").eq("conversation_id", conversation_id).execute()
    return response.data

def update_conversation_user(conversation_id, new_user_id):
    """Actualiza el usuario de una conversación"""
    data = {
        "user_id": new_user_id,
        "updated_at": "now()"
    }
    response = supabase.table("conversations").update(data).eq("id", conversation_id).execute()
    return response.data

def merge_duplicate_users(duplicate_group):
    """
    Fusiona un grupo de usuarios duplicados.
    
    Args:
        duplicate_group: Lista de usuarios duplicados
    
    Returns:
        ID del usuario principal (el que se mantiene)
    """
    if not duplicate_group or len(duplicate_group) < 2:
        return None
    
    # Ordenar usuarios por fecha de creación (más antiguo primero)
    sorted_users = sorted(duplicate_group, key=lambda u: u.get("created_at", ""))
    
    # El primer usuario será el principal
    primary_user = sorted_users[0]
    duplicate_users = sorted_users[1:]
    
    logger.info(f"Usuario principal: {primary_user['id']} ({primary_user.get('phone')})")
    logger.info(f"Usuarios duplicados: {len(duplicate_users)}")
    
    # Normalizar el número de teléfono del usuario principal
    normalized_phone = normalize_phone_number(primary_user.get("phone"))
    if normalized_phone and normalized_phone != primary_user.get("phone"):
        # Actualizar el número de teléfono del usuario principal
        logger.info(f"Actualizando número de teléfono del usuario principal: {primary_user.get('phone')} -> {normalized_phone}")
        supabase.table("users").update({"phone": normalized_phone, "updated_at": "now()"}).eq("id", primary_user["id"]).execute()
    
    # Procesar cada usuario duplicado
    for dup_user in duplicate_users:
        logger.info(f"Procesando usuario duplicado: {dup_user['id']} ({dup_user.get('phone')})")
        
        # Obtener conversaciones del usuario duplicado
        conversations = get_user_conversations(dup_user["id"])
        logger.info(f"Conversaciones encontradas: {len(conversations)}")
        
        # Transferir cada conversación al usuario principal
        for conv in conversations:
            logger.info(f"Transfiriendo conversación {conv['id']} al usuario principal")
            update_conversation_user(conv["id"], primary_user["id"])
        
        # Actualizar cualquier otra referencia al usuario duplicado
        # Por ejemplo, lead_qualification, meetings, etc.
        try:
            # Lead qualification
            supabase.table("lead_qualification").update({"user_id": primary_user["id"], "updated_at": "now()"}).eq("user_id", dup_user["id"]).execute()
            
            # Meetings
            supabase.table("meetings").update({"user_id": primary_user["id"], "updated_at": "now()"}).eq("user_id", dup_user["id"]).execute()
            
            logger.info(f"Referencias actualizadas para el usuario {dup_user['id']}")
        except Exception as e:
            logger.error(f"Error al actualizar referencias: {str(e)}")
        
        # Opcional: Eliminar el usuario duplicado
        # Comentado por seguridad, descomentar si se desea eliminar los usuarios duplicados
        # supabase.table("users").delete().eq("id", dup_user["id"]).execute()
        # logger.info(f"Usuario duplicado eliminado: {dup_user['id']}")
    
    return primary_user["id"]

def main():
    """Función principal del script"""
    start_time = time.time()
    logger.info("Iniciando corrección de usuarios duplicados")
    
    # Obtener todos los usuarios
    users = get_all_users()
    logger.info(f"Total de usuarios: {len(users)}")
    
    # Encontrar usuarios duplicados
    duplicate_groups = find_duplicate_users(users)
    logger.info(f"Grupos de usuarios duplicados encontrados: {len(duplicate_groups)}")
    
    # Procesar cada grupo de duplicados
    for i, group in enumerate(duplicate_groups):
        logger.info(f"Procesando grupo {i+1}/{len(duplicate_groups)}")
        merge_duplicate_users(group)
    
    elapsed_time = time.time() - start_time
    logger.info(f"Proceso completado en {elapsed_time:.2f} segundos")

if __name__ == "__main__":
    main()
