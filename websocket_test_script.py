#!/usr/bin/env python3
"""
Script completo de pruebas para WebSocket del backend FullStackAgent
URL de producción: https://fullstackagent2025.onrender.com/

Este script realiza pruebas exhaustivas de todas las funcionalidades WebSocket:
- Conexión y autenticación
- Operaciones CRUD de usuarios, conversaciones y mensajes
- Eventos en tiempo real
- Manejo de errores
- Heartbeats y reconexión
"""

import asyncio
import websockets
import json
import uuid
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
import traceback
import sys

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WebSocketTester:
    def __init__(self, base_url: str = "wss://fullstackagent2025.onrender.com", token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.websocket = None
        self.client_id = None
        self.user_id = None
        self.is_connected = False
        self.response_handlers = {}
        self.event_handlers = {}
        self.received_events = []
        self.test_results = []
        self.test_data = {}  # Para almacenar IDs creados durante las pruebas
        
    async def connect(self) -> bool:
        """Establece conexión WebSocket"""
        try:
            # Construir URL
            url = f"{self.base_url}/ws"
            if self.token:
                url += f"?token={self.token}"
            
            logger.info(f"🔌 Conectando a: {url}")
            
            # Conectar
            self.websocket = await websockets.connect(url)
            self.is_connected = True
            
            logger.info("✅ Conexión WebSocket establecida")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error al conectar: {str(e)}")
            return False
    
    async def disconnect(self):
        """Cierra la conexión WebSocket"""
        if self.websocket and self.is_connected:
            await self.websocket.close()
            self.is_connected = False
            logger.info("🔌 Conexión WebSocket cerrada")
    
    def generate_id(self) -> str:
        """Genera un ID único para los mensajes"""
        return str(uuid.uuid4())
    
    async def send_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Envía un mensaje y espera la respuesta"""
        if not self.is_connected:
            logger.error("❌ No hay conexión WebSocket")
            return None
        
        try:
            message_id = message.get("id", self.generate_id())
            message["id"] = message_id
            
            # Enviar mensaje
            logger.info(f"📤 Enviando: {json.dumps(message, indent=2)}")
            await self.websocket.send(json.dumps(message))
            
            # Esperar respuesta
            timeout = 10  # 10 segundos timeout
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    response_text = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    response = json.loads(response_text)
                    
                    logger.info(f"📥 Recibido: {json.dumps(response, indent=2)}")
                    
                    # Verificar si es la respuesta que esperamos
                    if response.get("id") == message_id:
                        return response
                    else:
                        # Es otro tipo de mensaje (evento, heartbeat, etc.)
                        await self.handle_other_message(response)
                        
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"❌ Error al recibir mensaje: {str(e)}")
                    break
            
            logger.error(f"⏰ Timeout esperando respuesta para mensaje {message_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error al enviar mensaje: {str(e)}")
            return None
    
    async def handle_other_message(self, message: Dict[str, Any]):
        """Maneja mensajes que no son respuestas directas"""
        msg_type = message.get("type")
        
        if msg_type == "connected":
            self.client_id = message.get("payload", {}).get("client_id")
            self.user_id = message.get("payload", {}).get("user_id")
            logger.info(f"🎯 Conectado - Cliente ID: {self.client_id}, Usuario ID: {self.user_id}")
            
        elif msg_type == "event":
            event_data = message.get("payload", {})
            event_type = event_data.get("type")
            logger.info(f"🎉 Evento recibido: {event_type}")
            self.received_events.append(message)
            
        elif msg_type == "heartbeat":
            logger.debug("💓 Heartbeat recibido")
            
        else:
            logger.info(f"📨 Mensaje recibido: {msg_type}")
    
    def log_test_result(self, test_name: str, success: bool, details: str = "", data: Any = None):
        """Registra el resultado de una prueba"""
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} {test_name}: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
    
    async def test_connection(self):
        """Prueba 1: Conexión básica"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 1: CONEXIÓN BÁSICA")
        logger.info("="*50)
        
        connected = await self.connect()
        
        if connected:
            # Esperar mensaje de bienvenida
            try:
                welcome_msg = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                welcome_data = json.loads(welcome_msg)
                logger.info(f"📥 Mensaje de bienvenida: {json.dumps(welcome_data, indent=2)}")
                
                if welcome_data.get("type") == "connected":
                    self.client_id = welcome_data.get("payload", {}).get("client_id")
                    self.log_test_result("Conexión y mensaje de bienvenida", True, 
                                       f"Cliente ID: {self.client_id}")
                else:
                    self.log_test_result("Mensaje de bienvenida", False, 
                                       f"Tipo inesperado: {welcome_data.get('type')}")
            except Exception as e:
                self.log_test_result("Mensaje de bienvenida", False, f"Error: {str(e)}")
        else:
            self.log_test_result("Conexión básica", False, "No se pudo establecer conexión")
    
    async def test_users_operations(self):
        """Prueba 2: Operaciones de usuarios"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 2: OPERACIONES DE USUARIOS")
        logger.info("="*50)
        
        # 2.1 Obtener todos los usuarios
        logger.info("\n📋 2.1 Obtener todos los usuarios")
        response = await self.send_message({
            "type": "request",
            "resource": "users",
            "payload": {
                "action": "get_all"
            }
        })
        
        if response and response.get("type") == "response":
            users = response.get("payload", {}).get("users", [])
            self.log_test_result("Obtener todos los usuarios", True, 
                               f"Obtenidos {len(users)} usuarios")
            if users:
                self.test_data["existing_user_id"] = users[0].get("id")
        else:
            self.log_test_result("Obtener todos los usuarios", False, 
                               f"Respuesta inválida: {response}")
        
        # 2.2 Crear un nuevo usuario
        logger.info("\n👤 2.2 Crear nuevo usuario")
        test_phone = f"+57315{int(time.time() % 10000):04d}"
        test_email = f"test_{int(time.time())}@example.com"
        
        response = await self.send_message({
            "type": "request",
            "resource": "users",
            "payload": {
                "action": "create",
                "user": {
                    "phone": test_phone,
                    "email": test_email,
                    "full_name": "Usuario de Prueba",
                    "company": "Empresa de Prueba"
                }
            }
        })
        
        if response and response.get("type") == "response":
            user = response.get("payload", {}).get("user", {})
            if user.get("id"):
                self.test_data["created_user_id"] = user["id"]
                self.log_test_result("Crear usuario", True, 
                                   f"Usuario creado con ID: {user['id']}")
            else:
                self.log_test_result("Crear usuario", False, "No se obtuvo ID del usuario")
        else:
            self.log_test_result("Crear usuario", False, 
                               f"Error en respuesta: {response}")
        
        # 2.3 Obtener usuario por ID
        if "created_user_id" in self.test_data:
            logger.info("\n🔍 2.3 Obtener usuario por ID")
            response = await self.send_message({
                "type": "request",
                "resource": "users",
                "payload": {
                    "action": "get_by_id",
                    "user_id": self.test_data["created_user_id"]
                }
            })
            
            if response and response.get("type") == "response":
                user = response.get("payload", {}).get("user", {})
                if user.get("id") == self.test_data["created_user_id"]:
                    self.log_test_result("Obtener usuario por ID", True, 
                                       f"Usuario obtenido: {user.get('full_name')}")
                else:
                    self.log_test_result("Obtener usuario por ID", False, 
                                       "ID no coincide")
            else:
                self.log_test_result("Obtener usuario por ID", False, 
                                   f"Error en respuesta: {response}")
    
    async def test_conversations_operations(self):
        """Prueba 3: Operaciones de conversaciones"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 3: OPERACIONES DE CONVERSACIONES")
        logger.info("="*50)
        
        if "created_user_id" not in self.test_data:
            self.log_test_result("Preparación conversaciones", False, 
                               "No hay usuario creado para pruebas")
            return
        
        user_id = self.test_data["created_user_id"]
        
        # 3.1 Obtener conversaciones del usuario
        logger.info("\n💬 3.1 Obtener conversaciones del usuario")
        response = await self.send_message({
            "type": "request",
            "resource": "conversations",
            "payload": {
                "action": "get_all",
                "user_id": user_id
            }
        })
        
        if response and response.get("type") == "response":
            conversations = response.get("payload", {}).get("conversations", [])
            self.log_test_result("Obtener conversaciones", True, 
                               f"Obtenidas {len(conversations)} conversaciones")
        else:
            self.log_test_result("Obtener conversaciones", False, 
                               f"Error en respuesta: {response}")
        
        # 3.2 Crear nueva conversación
        logger.info("\n➕ 3.2 Crear nueva conversación")
        test_external_id = f"test_{int(time.time())}"
        
        response = await self.send_message({
            "type": "request",
            "resource": "conversations",
            "payload": {
                "action": "create",
                "user_id": user_id,
                "external_id": test_external_id,
                "platform": "test"
            }
        })
        
        if response and response.get("type") == "response":
            conversation = response.get("payload", {}).get("conversation", {})
            if conversation.get("id"):
                self.test_data["created_conversation_id"] = conversation["id"]
                self.log_test_result("Crear conversación", True, 
                                   f"Conversación creada con ID: {conversation['id']}")
            else:
                self.log_test_result("Crear conversación", False, 
                                   "No se obtuvo ID de conversación")
        else:
            self.log_test_result("Crear conversación", False, 
                               f"Error en respuesta: {response}")
        
        # 3.3 Obtener conversación por ID
        if "created_conversation_id" in self.test_data:
            logger.info("\n🔍 3.3 Obtener conversación por ID")
            response = await self.send_message({
                "type": "request",
                "resource": "conversations",
                "payload": {
                    "action": "get_by_id",
                    "conversation_id": self.test_data["created_conversation_id"]
                }
            })
            
            if response and response.get("type") == "response":
                conversation = response.get("payload", {}).get("conversation", {})
                if conversation.get("id") == self.test_data["created_conversation_id"]:
                    self.log_test_result("Obtener conversación por ID", True, 
                                       f"Conversación obtenida")
                else:
                    self.log_test_result("Obtener conversación por ID", False, 
                                       "ID no coincide")
            else:
                self.log_test_result("Obtener conversación por ID", False, 
                                   f"Error en respuesta: {response}")
    
    async def test_messages_operations(self):
        """Prueba 4: Operaciones de mensajes"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 4: OPERACIONES DE MENSAJES")
        logger.info("="*50)
        
        if "created_conversation_id" not in self.test_data:
            self.log_test_result("Preparación mensajes", False, 
                               "No hay conversación creada para pruebas")
            return
        
        conversation_id = self.test_data["created_conversation_id"]
        
        # 4.1 Obtener mensajes de la conversación
        logger.info("\n📨 4.1 Obtener mensajes de la conversación")
        response = await self.send_message({
            "type": "request",
            "resource": "messages",
            "payload": {
                "action": "get_by_conversation",
                "conversation_id": conversation_id
            }
        })
        
        if response and response.get("type") == "response":
            messages = response.get("payload", {}).get("messages", [])
            self.log_test_result("Obtener mensajes", True, 
                               f"Obtenidos {len(messages)} mensajes")
        else:
            self.log_test_result("Obtener mensajes", False, 
                               f"Error en respuesta: {response}")
        
        # 4.2 Crear nuevo mensaje
        logger.info("\n✍️ 4.2 Crear nuevo mensaje")
        test_content = f"Mensaje de prueba {datetime.now().isoformat()}"
        
        response = await self.send_message({
            "type": "request",
            "resource": "messages",
            "payload": {
                "action": "create",
                "message": {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": test_content,
                    "message_type": "text"
                }
            }
        })
        
        if response and response.get("type") == "response":
            message = response.get("payload", {}).get("message", {})
            if message.get("id"):
                self.test_data["created_message_id"] = message["id"]
                self.log_test_result("Crear mensaje", True, 
                                   f"Mensaje creado con ID: {message['id']}")
            else:
                self.log_test_result("Crear mensaje", False, 
                                   "No se obtuvo ID del mensaje")
        else:
            self.log_test_result("Crear mensaje", False, 
                               f"Error en respuesta: {response}")
        
        # 4.3 Obtener mensaje por ID
        if "created_message_id" in self.test_data:
            logger.info("\n🔍 4.3 Obtener mensaje por ID")
            response = await self.send_message({
                "type": "request",
                "resource": "messages",
                "payload": {
                    "action": "get_by_id",
                    "message_id": self.test_data["created_message_id"]
                }
            })
            
            if response and response.get("type") == "response":
                message = response.get("payload", {}).get("message", {})
                if message.get("id") == self.test_data["created_message_id"]:
                    self.log_test_result("Obtener mensaje por ID", True, 
                                       f"Mensaje obtenido: {message.get('content', '')[:50]}...")
                else:
                    self.log_test_result("Obtener mensaje por ID", False, 
                                       "ID no coincide")
            else:
                self.log_test_result("Obtener mensaje por ID", False, 
                                   f"Error en respuesta: {response}")
    
    async def test_error_handling(self):
        """Prueba 5: Manejo de errores"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 5: MANEJO DE ERRORES")
        logger.info("="*50)
        
        # 5.1 Recurso inexistente
        logger.info("\n❌ 5.1 Recurso inexistente")
        response = await self.send_message({
            "type": "request",
            "resource": "nonexistent_resource",
            "payload": {
                "action": "get_all"
            }
        })
        
        if response and response.get("type") == "error":
            error_code = response.get("payload", {}).get("code")
            self.log_test_result("Error recurso inexistente", True, 
                               f"Error manejado correctamente: {error_code}")
        else:
            self.log_test_result("Error recurso inexistente", False, 
                               "No se manejó el error correctamente")
        
        # 5.2 Acción inexistente
        logger.info("\n❌ 5.2 Acción inexistente")
        response = await self.send_message({
            "type": "request",
            "resource": "users",
            "payload": {
                "action": "nonexistent_action"
            }
        })
        
        if response and response.get("type") == "error":
            error_code = response.get("payload", {}).get("code")
            self.log_test_result("Error acción inexistente", True, 
                               f"Error manejado correctamente: {error_code}")
        else:
            self.log_test_result("Error acción inexistente", False, 
                               "No se manejó el error correctamente")
        
        # 5.3 Datos faltantes
        logger.info("\n❌ 5.3 Datos faltantes")
        response = await self.send_message({
            "type": "request",
            "resource": "users",
            "payload": {
                "action": "get_by_id"
                # Falta user_id
            }
        })
        
        if response and response.get("type") == "error":
            error_message = response.get("payload", {}).get("message", "")
            self.log_test_result("Error datos faltantes", True, 
                               f"Error manejado: {error_message}")
        else:
            self.log_test_result("Error datos faltantes", False, 
                               "No se manejó el error correctamente")
    
    async def test_heartbeat(self):
        """Prueba 6: Heartbeat"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 6: HEARTBEAT")
        logger.info("="*50)
        
        logger.info("💓 Esperando heartbeat del servidor...")
        
        # Esperar hasta 35 segundos por un heartbeat (se envían cada 30s)
        heartbeat_received = False
        start_time = time.time()
        
        while time.time() - start_time < 35:
            try:
                message_text = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                message = json.loads(message_text)
                
                if message.get("type") == "heartbeat":
                    heartbeat_received = True
                    self.log_test_result("Heartbeat", True, 
                                       f"Heartbeat recibido: {message.get('payload', {}).get('timestamp')}")
                    break
                else:
                    await self.handle_other_message(message)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error esperando heartbeat: {str(e)}")
                break
        
        if not heartbeat_received:
            self.log_test_result("Heartbeat", False, 
                               "No se recibió heartbeat en 35 segundos")
    
    async def test_events_system(self):
        """Prueba 7: Sistema de eventos"""
        logger.info("\n" + "="*50)
        logger.info("🧪 PRUEBA 7: SISTEMA DE EVENTOS")
        logger.info("="*50)
        
        if "created_conversation_id" not in self.test_data:
            self.log_test_result("Sistema de eventos", False, 
                               "No hay conversación para probar eventos")
            return
        
        conversation_id = self.test_data["created_conversation_id"]
        
        # Limpiar eventos recibidos
        self.received_events.clear()
        
        # Crear un mensaje y verificar si se recibe el evento
        logger.info("🎉 Creando mensaje para generar evento...")
        
        # Primero enviar el mensaje
        response = await self.send_message({
            "type": "request",
            "resource": "messages",
            "payload": {
                "action": "create",
                "message": {
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": "Mensaje para probar eventos",
                    "message_type": "text"
                }
            }
        })
        
        if response and response.get("type") == "response":
            # Esperar un poco por el evento
            logger.info("⏳ Esperando evento...")
            await asyncio.sleep(2)
            
            # Revisar mensajes adicionales que puedan haber llegado
            try:
                while True:
                    message_text = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    message = json.loads(message_text)
                    await self.handle_other_message(message)
            except asyncio.TimeoutError:
                pass
            
            # Verificar si se recibió algún evento
            if self.received_events:
                self.log_test_result("Eventos del sistema", True, 
                                   f"Recibidos {len(self.received_events)} eventos")
                for event in self.received_events:
                    event_type = event.get("payload", {}).get("type")
                    logger.info(f"  📨 Evento: {event_type}")
            else:
                self.log_test_result("Eventos del sistema", False, 
                                   "No se recibieron eventos")
        else:
            self.log_test_result("Eventos del sistema", False, 
                               "No se pudo crear mensaje para generar evento")
    
    def generate_summary_report(self):
        """Genera un reporte resumen de todas las pruebas"""
        logger.info("\n" + "="*60)
        logger.info("📊 REPORTE RESUMEN DE PRUEBAS")
        logger.info("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        logger.info(f"📈 Estadísticas generales:")
        logger.info(f"   Total de pruebas: {total_tests}")
        logger.info(f"   ✅ Exitosas: {passed_tests}")
        logger.info(f"   ❌ Fallidas: {failed_tests}")
        logger.info(f"   📊 Tasa de éxito: {success_rate:.1f}%")
        
        logger.info(f"\n📋 Detalle de pruebas:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅" if result["success"] else "❌"
            logger.info(f"   {i:2d}. {status} {result['test']}")
            if result["details"]:
                logger.info(f"       📝 {result['details']}")
        
        logger.info(f"\n🗂️ Datos de prueba creados:")
        for key, value in self.test_data.items():
            logger.info(f"   {key}: {value}")
        
        logger.info(f"\n🎉 Eventos recibidos: {len(self.received_events)}")
        for event in self.received_events:
            event_type = event.get("payload", {}).get("type", "unknown")
            logger.info(f"   📨 {event_type}")
        
        # Evaluación general
        logger.info(f"\n🎯 Evaluación general:")
        if success_rate >= 90:
            logger.info("   🟢 EXCELENTE: El WebSocket funciona perfectamente")
        elif success_rate >= 75:
            logger.info("   🟡 BUENO: El WebSocket funciona bien con algunos problemas menores")
        elif success_rate >= 50:
            logger.info("   🟠 REGULAR: El WebSocket tiene problemas que necesitan atención")
        else:
            logger.info("   🔴 CRÍTICO: El WebSocket tiene problemas graves")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": success_rate,
            "test_results": self.test_results,
            "test_data": self.test_data,
            "events_received": len(self.received_events)
        }
    
    async def run_all_tests(self):
        """Ejecuta todas las pruebas"""
        logger.info("🚀 INICIANDO PRUEBAS COMPLETAS DEL WEBSOCKET")
        logger.info(f"🎯 URL objetivo: {self.base_url}")
        logger.info(f"⏰ Tiempo de inicio: {datetime.now().isoformat()}")
        
        try:
            # Ejecutar todas las pruebas en orden
            await self.test_connection()
            await self.test_users_operations()
            await self.test_conversations_operations()
            await self.test_messages_operations()
            await self.test_error_handling()
            await self.test_heartbeat()
            await self.test_events_system()
            
        except Exception as e:
            logger.error(f"❌ Error durante las pruebas: {str(e)}")
            logger.error(traceback.format_exc())
        
        finally:
            # Cerrar conexión
            await self.disconnect()
            
            # Generar reporte
            summary = self.generate_summary_report()
            
            logger.info(f"\n⏰ Tiempo de finalización: {datetime.now().isoformat()}")
            logger.info("🏁 PRUEBAS COMPLETADAS")
            
            return summary

async def main():
    """Función principal"""
    # Configuración de la prueba
    base_url = "wss://fullstackagent2025.onrender.com"
    token = None  # Puedes agregar un token aquí si lo necesitas
    
    # Crear instancia del tester
    tester = WebSocketTester(base_url, token)
    
    try:
        # Ejecutar todas las pruebas
        summary = await tester.run_all_tests()
        
        # Retornar código de salida basado en el resultado
        if summary["success_rate"] >= 75:
            sys.exit(0)  # Éxito
        else:
            sys.exit(1)  # Fallo
            
    except KeyboardInterrupt:
        logger.info("\n⛔ Pruebas interrumpidas por el usuario")
        await tester.disconnect()
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ Error fatal: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    # Verificar que websockets esté instalado
    try:
        import websockets
    except ImportError:
        print("❌ Error: El módulo 'websockets' no está instalado")
        print("📦 Instálalo con: pip install websockets")
        sys.exit(1)
    
    # Mensaje de bienvenida
    print("🔬 SCRIPT DE PRUEBAS WEBSOCKET - FULLSTACKAGENT")
    print("=" * 60)
    print("📍 URL de producción: https://fullstackagent2025.onrender.com")
    print("🎯 Este script probará todas las funcionalidades del WebSocket")
    print("⏱️  Tiempo estimado: 2-3 minutos")
    print("=" * 60)
    
    # Ejecutar pruebas
    asyncio.run(main())