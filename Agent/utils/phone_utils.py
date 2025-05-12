"""
Utilidades para normalización y validación de números telefónicos.
"""

import re
import logging

# Configurar logging
logger = logging.getLogger(__name__)

def normalize_phone_number(phone_number):
    """
    Normaliza un número telefónico a un formato estándar con código de país.
    
    Args:
        phone_number: Número telefónico en cualquier formato
        
    Returns:
        Número telefónico normalizado
    """
    if not phone_number:
        return None
    
    # Eliminar todos los caracteres no numéricos
    digits_only = re.sub(r'\D', '', str(phone_number))
    
    # Si está vacío después de eliminar no-numéricos, retornar None
    if not digits_only:
        return None
    
    # Determinar si ya tiene código de país
    # Asumimos que los números colombianos comienzan con 57
    has_country_code = False
    
    # Si comienza con 57 y tiene más de 10 dígitos, asumimos que ya tiene código de país
    if digits_only.startswith('57') and len(digits_only) >= 12:
        has_country_code = True
    
    # Si no tiene código de país, añadirlo
    if not has_country_code:
        # Si comienza con 3 y tiene 10 dígitos, es probablemente un número colombiano sin código de país
        if digits_only.startswith('3') and len(digits_only) == 10:
            normalized = '57' + digits_only
        else:
            # Para otros casos, simplemente añadimos 57 como código por defecto
            normalized = '57' + digits_only
    else:
        normalized = digits_only
    
    logger.info(f"Número normalizado: {phone_number} -> {normalized}")
    return normalized

def find_duplicate_phone_formats(phone_number):
    """
    Genera posibles formatos alternativos para un número telefónico.
    Útil para buscar duplicados en la base de datos.
    
    Args:
        phone_number: Número telefónico normalizado
        
    Returns:
        Lista de posibles formatos alternativos
    """
    if not phone_number:
        return []
    
    # Eliminar todos los caracteres no numéricos
    digits_only = re.sub(r'\D', '', str(phone_number))
    
    # Si está vacío después de eliminar no-numéricos, retornar lista vacía
    if not digits_only:
        return []
    
    alternatives = []
    
    # Si comienza con 57 y tiene al menos 12 dígitos, añadir versión sin código de país
    if digits_only.startswith('57') and len(digits_only) >= 12:
        # Versión sin código de país
        alternatives.append(digits_only[2:])
    
    # Si no comienza con 57, añadir versión con código de país
    elif not digits_only.startswith('57'):
        # Versión con código de país
        alternatives.append('57' + digits_only)
    
    return alternatives
