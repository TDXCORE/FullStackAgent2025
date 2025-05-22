// Configuración para modo de desarrollo y fallback
const IS_DEV_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Permitir configurar el uso de datos simulados a través de una variable de entorno o localStorage
const USE_MOCK_DATA = typeof window !== 'undefined' && window.localStorage.getItem('USE_MOCK_DATA') === 'true' 
  ? true 
  : false; // Por defecto, usar datos reales

console.log(`🔧 Modo: ${IS_DEV_MODE ? 'Desarrollo' : 'Producción'}, Usando datos simulados: ${USE_MOCK_DATA}`);

// WebSocket URL - Usa la variable de entorno si está disponible, de lo contrario usa la URL por defecto
const WS_URL = typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_WS_BASE_URL 
  ? window.ENV.NEXT_PUBLIC_WS_BASE_URL 
  : process.env.NEXT_PUBLIC_WS_BASE_URL || 'wss://waagentv1.onrender.com';

// Añadir path /ws si no está incluido en la URL
const getFullWsUrl = (baseUrl) => {
  if (!baseUrl) return '';
  if (baseUrl.endsWith('/ws')) return baseUrl;
  return baseUrl.endsWith('/') ? `${baseUrl}ws` : `${baseUrl}/ws`;
};

// WebSocket Auth Token
const WS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3NDc3OTU1NjUsImV4cCI6MTc3OTMzMTU2NSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.JX6CXcJ5KWr9Omnyyf4xlIRYlDCIefbxz9StLAe4gqY';

// Datos simulados para desarrollo
const MOCK_DATA = {
  users: [
    { id: 'user-1', full_name: 'John Doe', phone: '+1234567890', email: 'john@example.com', created_at: new Date().toISOString() },
    { id: 'user-2', full_name: 'Jane Smith', phone: '+0987654321', email: 'jane@example.com', created_at: new Date().toISOString() },
    { id: 'user-3', full_name: 'Bob Johnson', phone: '+1122334455', email: 'bob@example.com', created_at: new Date().toISOString() }
  ],
  conversations: [
    { 
      id: 'conv-1', 
      external_id: 'ext-1', 
      created_by: 'user-1', 
      unread_count: 2, 
      last_message: 'Hello there!', 
      updated_at: new Date().toISOString(),
      status: 'active'
    },
    { 
      id: 'conv-2', 
      external_id: 'ext-2', 
      created_by: 'user-2', 
      unread_count: 0, 
      last_message: 'How are you?', 
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      status: 'active'
    }
  ],
  messages: {
    'conv-1': [
      { 
        id: 'msg-1', 
        conversation_id: 'conv-1', 
        content: 'Hello there!', 
        role: 'user', 
        created_at: new Date().toISOString(), 
        read: false,
        message_type: 'text'
      },
      { 
        id: 'msg-2', 
        conversation_id: 'conv-1', 
        content: 'Hi! How can I help you?', 
        role: 'assistant', 
        created_at: new Date(Date.now() - 60000).toISOString(), 
        read: true,
        message_type: 'text'
      }
    ],
    'conv-2': [
      { 
        id: 'msg-3', 
        conversation_id: 'conv-2', 
        content: 'How are you?', 
        role: 'user', 
        created_at: new Date(Date.now() - 3600000).toISOString(), 
        read: true,
        message_type: 'text'
      },
      { 
        id: 'msg-4', 
        conversation_id: 'conv-2', 
        content: 'I\'m doing well, thanks for asking!', 
        role: 'assistant', 
        created_at: new Date(Date.now() - 3540000).toISOString(), 
        read: true,
        message_type: 'text'
      }
    ]
  }
};

/**
 * Cliente WebSocket para comunicarse con el servidor
 * Con soporte para modo de desarrollo con datos simulados
 */
class WebSocketClient {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.socket = null;
    this.isConnected = false;
    this.clientId = null;
    this.userId = null;
    this.eventListeners = {};
    this.responseHandlers = {};
    this.useMockData = USE_MOCK_DATA;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 segundos iniciales
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    
    // Si estamos en modo de datos simulados, simular una conexión exitosa
    if (this.useMockData) {
      console.log('🔶 Usando modo de datos simulados para desarrollo');
      this.isConnected = true;
      this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
    }
  }

  connect() {
    if (this.useMockData) {
      console.log('🔶 Modo de datos simulados: simulando conexión exitosa');
      this.isConnected = true;
      this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
      
      // Simular evento de conexión
      this._triggerEvent('connect', {
        client_id: this.clientId,
        user_id: 'mock-user',
        timestamp: new Date().toISOString()
      });
      
      // Iniciar heartbeats simulados
      this._startMockHeartbeats();
      
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Limpiar cualquier conexión existente
        this._cleanupConnection();
        
        // Construir URL completa
        const wsUrl = getFullWsUrl(this.baseUrl);
        if (!wsUrl) {
          throw new Error('URL de WebSocket inválida');
        }
        
        let url = wsUrl;
        if (this.token) {
          url += `?token=${this.token}`;
        }

        console.log(`🔌 Conectando a: ${url}...`);
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
          console.log('✅ Conexión WebSocket establecida');
          this.isConnected = true;
          this.reconnectAttempts = 0; // Resetear intentos de reconexión
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log(`📥 Mensaje recibido (${message.type}):`, message.id ? message.id.substring(0, 8) : 'sin ID');
            
            // Manejar mensaje de bienvenida
            if (message.type === 'connected') {
              this.clientId = message.payload?.client_id;
              this.userId = message.payload?.user_id;
              console.log(`✅ ID de cliente asignado: ${this.clientId}`);
              
              // Disparar evento de conexión
              this._triggerEvent('connect', message.payload);
            }
            
            // Manejar heartbeats
            else if (message.type === 'heartbeat') {
              this.lastHeartbeat = message.payload?.timestamp;
              console.log(`💓 Heartbeat recibido: ${this.lastHeartbeat}`);
              
              // Disparar evento de heartbeat
              this._triggerEvent('heartbeat', message.payload);
            }
            
            // Manejar eventos
            else if (message.type === 'event') {
              const eventType = message.payload?.type;
              console.log(`🎉 Evento recibido: ${eventType}`);
              
              // Disparar evento específico
              if (eventType) {
                this._triggerEvent(eventType, message.payload);
              }
            }
            
            // Manejar nuevos mensajes
            else if (message.type === 'new_message') {
              console.log(`📨 Nuevo mensaje recibido para conversación: ${message.payload?.message?.conversation_id}`);
              
              // Disparar evento de nuevo mensaje
              this._triggerEvent('new_message', message.payload);
            }
            
            // Manejar respuestas a solicitudes
            else if (message.id && this.responseHandlers[message.id]) {
              const handler = this.responseHandlers[message.id];
              handler(message);
              delete this.responseHandlers[message.id];
            }
            
            // Manejar errores
            else if (message.type === 'error') {
              console.error(`❌ Error del servidor: ${message.payload?.message}`);
              
              // Disparar evento de error
              this._triggerEvent('error', message.payload);
            }
          } catch (error) {
            console.error('Error al procesar mensaje:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`🔌 Conexión WebSocket cerrada. Código: ${event.code}, Razón: ${event.reason}`);
          this.isConnected = false;
          
          // Limpiar intervalos y timeouts
          this._cleanupTimers();
          
          // Disparar evento de desconexión
          this._triggerEvent('disconnect', {
            code: event.code,
            reason: event.reason,
            timestamp: new Date().toISOString()
          });
          
          if (IS_DEV_MODE) {
            console.log('🔶 Conexión cerrada en modo desarrollo, activando modo de datos simulados');
            this.useMockData = true;
            this.isConnected = true;
            this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
          } else {
            // Intentar reconectar automáticamente si no fue un cierre limpio
            if (event.code !== 1000 && event.code !== 1001) {
              this._attemptReconnect();
            }
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ Error en WebSocket:', error);
          this.isConnected = false;
          
          if (IS_DEV_MODE) {
            console.log('🔶 Error de conexión en modo desarrollo, activando modo de datos simulados');
            this.useMockData = true;
            this.isConnected = true;
            this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
            
            // Simular evento de conexión
            this._triggerEvent('connect', {
              client_id: this.clientId,
              user_id: 'mock-user',
              timestamp: new Date().toISOString()
            });
            
            resolve();
          } else {
            reject(error);
          }
        };
      } catch (error) {
        console.error('Error al conectar:', error);
        
        if (IS_DEV_MODE) {
          console.log('🔶 Error al conectar en modo desarrollo, activando modo de datos simulados');
          this.useMockData = true;
          this.isConnected = true;
          this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
          
          // Simular evento de conexión
          this._triggerEvent('connect', {
            client_id: this.clientId,
            user_id: 'mock-user',
            timestamp: new Date().toISOString()
          });
          
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }
  
  disconnect() {
    if (this.useMockData) {
      console.log('🔶 Modo de datos simulados: simulando desconexión');
      this.isConnected = false;
      
      // Simular evento de desconexión
      this._triggerEvent('disconnect', {
        code: 1000,
        reason: 'Closed by client',
        timestamp: new Date().toISOString()
      });
      
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      if (this.socket && this.isConnected) {
        console.log('🔌 Cerrando conexión WebSocket...');
        
        // Limpiar intervalos y timeouts
        this._cleanupTimers();
        
        // Cerrar socket
        try {
          this.socket.close(1000, 'Closed by client');
          console.log('✅ Conexión cerrada correctamente');
        } catch (e) {
          console.error('❌ Error al cerrar socket:', e);
        }
        
        this.isConnected = false;
        this.socket = null;
      }
      
      resolve();
    });
  }
  
  _cleanupConnection() {
    // Limpiar socket existente
    if (this.socket) {
      try {
        this.socket.close(1000, 'Cleanup before reconnect');
      } catch (e) {
        console.log('Error al cerrar socket existente:', e);
      }
      this.socket = null;
    }
    
    // Limpiar intervalos y timeouts
    this._cleanupTimers();
  }
  
  _cleanupTimers() {
    // Limpiar intervalo de heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  _attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Backoff exponencial
      const maxDelay = 30000; // Máximo 30 segundos
      const actualDelay = Math.min(delay, maxDelay);
      
      console.log(`🔄 Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${actualDelay}ms...`);
      
      setTimeout(() => {
        console.log(`🔄 Reconectando (intento ${this.reconnectAttempts})...`);
        this.connect()
          .then(() => {
            console.log('✅ Reconexión exitosa');
            // Reiniciar contador de intentos
            this.reconnectAttempts = 0;
          })
          .catch(error => {
            console.error('❌ Error en reconexión:', error);
            // Si aún no hemos alcanzado el máximo, intentar de nuevo
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this._attemptReconnect();
            }
          });
      }, actualDelay);
    } else {
      console.error(`❌ Máximo número de intentos de reconexión (${this.maxReconnectAttempts}) alcanzado`);
      
      // Disparar evento de error de reconexión
      this._triggerEvent('reconnect_failed', {
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
      
      // Activar modo de datos simulados en desarrollo
      if (IS_DEV_MODE) {
        console.log('🔶 Activando modo de datos simulados después de fallar reconexiones');
        this.useMockData = true;
        this.isConnected = true;
        this.clientId = 'mock-client-' + Math.random().toString(36).substring(2, 15);
        
        // Simular evento de conexión
        this._triggerEvent('connect', {
          client_id: this.clientId,
          user_id: 'mock-user',
          timestamp: new Date().toISOString()
        });
        
        // Iniciar heartbeats simulados
        this._startMockHeartbeats();
      }
    }
  }
  
  _startMockHeartbeats() {
    // Limpiar intervalo existente
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Iniciar nuevo intervalo
    this.heartbeatInterval = setInterval(() => {
      const timestamp = new Date().toISOString();
      this.lastHeartbeat = timestamp;
      
      // Disparar evento de heartbeat
      this._triggerEvent('heartbeat', {
        timestamp: timestamp
      });
      
      console.log(`💓 Heartbeat simulado: ${timestamp}`);
    }, 30000); // Cada 30 segundos
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }
  
  _triggerEvent(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }

  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  request(resource, action, data = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Si estamos en modo de datos simulados, generar respuesta simulada
        if (this.useMockData) {
          console.log(`🔶 Modo de datos simulados: simulando solicitud ${resource}/${action}`);
          
          setTimeout(() => {
            try {
              let response;
              
              // Generar respuesta simulada según el recurso y acción
              if (resource === 'users') {
                if (action === 'get_all') {
                  response = { users: MOCK_DATA.users, total: MOCK_DATA.users.length };
                } else if (action === 'get_by_id') {
                  const user = MOCK_DATA.users.find(u => u.id === data.user_id);
                  if (!user) {
                    throw new Error(`Usuario no encontrado: ${data.user_id}`);
                  }
                  response = { user };
                }
              } else if (resource === 'conversations') {
                if (action === 'get_all') {
                  let conversations = [...MOCK_DATA.conversations];
                  if (data.user_id) {
                    conversations = conversations.filter(c => c.created_by === data.user_id);
                  }
                  response = { conversations, total: conversations.length };
                } else if (action === 'get_by_id') {
                  const conversation = MOCK_DATA.conversations.find(c => c.id === data.conversation_id);
                  if (!conversation) {
                    throw new Error(`Conversación no encontrada: ${data.conversation_id}`);
                  }
                  response = { conversation };
                } else if (action === 'create') {
                  const newConversation = {
                    id: 'conv-' + Date.now(),
                    ...data.conversation,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    unread_count: 0
                  };
                  MOCK_DATA.conversations.push(newConversation);
                  MOCK_DATA.messages[newConversation.id] = [];
                  response = { conversation: newConversation };
                }
              } else if (resource === 'messages') {
                if (action === 'get_by_conversation') {
                  const messages = MOCK_DATA.messages[data.conversation_id] || [];
                  response = { 
                    messages,
                    pagination: {
                      limit: 50,
                      offset: 0,
                      total: messages.length
                    }
                  };
                } else if (action === 'create') {
                  const newMessage = {
                    id: 'msg-' + Date.now(),
                    ...data.message,
                    created_at: new Date().toISOString(),
                    read: false
                  };
                  
                  if (!MOCK_DATA.messages[newMessage.conversation_id]) {
                    MOCK_DATA.messages[newMessage.conversation_id] = [];
                  }
                  
                  MOCK_DATA.messages[newMessage.conversation_id].push(newMessage);
                  
                  // Actualizar last_message en la conversación
                  const conversation = MOCK_DATA.conversations.find(c => c.id === newMessage.conversation_id);
                  if (conversation) {
                    conversation.last_message = newMessage.content;
                    conversation.updated_at = newMessage.created_at;
                    
                    // Incrementar unread_count si el mensaje es del usuario
                    if (newMessage.role === 'user') {
                      conversation.unread_count = (Number(conversation.unread_count) || 0) + 1;
                    }
                  }
                  
                  response = { message: newMessage };
                  
                  // Simular evento de nuevo mensaje
                  setTimeout(() => {
                    this._triggerEvent('new_message', {
                      message: newMessage,
                      conversation: conversation
                    });
                  }, 100);
                } else if (action === 'update') {
                  if (data.message_id === 'all') {
                    // Marcar todos los mensajes como leídos
                    const messages = MOCK_DATA.messages[data.conversation_id] || [];
                    messages.forEach(msg => {
                      msg.read = true;
                    });
                    
                    // Actualizar unread_count en la conversación
                    const conversation = MOCK_DATA.conversations.find(c => c.id === data.conversation_id);
                    if (conversation) {
                      conversation.unread_count = 0;
                    }
                    
                    response = { success: true };
                  }
                }
              }
              
              if (!response) {
                throw new Error(`Acción no soportada en modo simulado: ${resource}/${action}`);
              }
              
              resolve(response);
            } catch (mockError) {
              console.error('Error al generar respuesta simulada:', mockError);
              reject(mockError);
            }
          }, 200);
          
          return;
        }
        
        // Si no estamos en modo simulado, enviar solicitud real
        if (!this.isConnected) {
          console.log('📡 WebSocket no conectado, intentando conectar antes de enviar solicitud...');
          await this.connect();
        }
        
        const id = this._generateId();
        const request = {
          type: 'request',
          id: id,
          resource: resource,
          payload: {
            action: action,
            ...data
          }
        };
        
        console.log(`📤 Enviando solicitud ${resource}/${action} (ID: ${id.substring(0, 8)})`);
        
        this.responseHandlers[id] = (response) => {
          if (response.type === 'error') {
            console.error(`❌ Error en solicitud ${resource}/${action}: ${response.payload?.message}`);
            reject(new Error(response.payload?.message || 'Error desconocido'));
          } else {
            console.log(`✅ Respuesta recibida para solicitud ${resource}/${action}`);
            resolve(response.payload);
          }
        };
        
        // Establecer timeout para la solicitud
        const timeoutId = setTimeout(() => {
          if (this.responseHandlers[id]) {
            delete this.responseHandlers[id];
            console.error(`⏰ Timeout en solicitud ${resource}/${action} (ID: ${id.substring(0, 8)})`);
            reject(new Error(`Timeout en solicitud ${resource}/${action}`));
          }
        }, 15000); // 15 segundos de timeout
        
        // Enviar solicitud
        try {
          this.socket.send(JSON.stringify(request));
        } catch (sendError) {
          clearTimeout(timeoutId);
          delete this.responseHandlers[id];
          console.error(`❌ Error al enviar solicitud ${resource}/${action}:`, sendError);
          
          // Intentar reconectar y reenviar
          if (!IS_DEV_MODE) {
            console.log('🔄 Intentando reconectar y reenviar solicitud...');
            try {
              await this.connect();
              console.log('✅ Reconexión exitosa, reenviando solicitud...');
              
              // Reenviar solicitud
              this.socket.send(JSON.stringify(request));
            } catch (reconnectError) {
              console.error('❌ Error al reconectar:', reconnectError);
              reject(sendError);
            }
          } else {
            console.log('🔶 Error al enviar en modo desarrollo, usando datos simulados');
            this.useMockData = true;
            
            // Reintentar con datos simulados
            this.request(resource, action, data).then(resolve).catch(reject);
          }
        }
      } catch (error) {
        console.error('Error en request:', error);
        
        if (IS_DEV_MODE) {
          console.log('🔶 Error en request en modo desarrollo, usando datos simulados');
          this.useMockData = true;
          
          // Reintentar con datos simulados
          this.request(resource, action, data).then(resolve).catch(reject);
        } else {
          reject(error);
        }
      }
    });
  }

  // Métodos de conveniencia
  getConversations(userId) {
    return this.request('conversations', 'get_all', { user_id: userId });
  }

  getConversation(conversationId) {
    return this.request('conversations', 'get_by_id', { conversation_id: conversationId });
  }

  createConversation(conversation) {
    return this.request('conversations', 'create', { conversation });
  }

  getMessages(conversationId) {
    return this.request('messages', 'get_by_conversation', { conversation_id: conversationId });
  }

  sendMessage(conversationId, content, role = 'user', messageType = 'text', mediaUrl = null) {
    const message = {
      conversation_id: conversationId,
      content,
      role,
      message_type: messageType
    };
    
    if (mediaUrl) {
      message.media_url = mediaUrl;
    }
    
    return this.request('messages', 'create', { message });
  }

  markMessagesAsRead(conversationId) {
    return this.request('messages', 'update', { 
      conversation_id: conversationId,
      message_id: 'all',
      read: true
    });
  }

  getUser(userId) {
    return this.request('users', 'get_by_id', { user_id: userId });
  }

  getUsers(getAll = false) {
    return this.request('users', 'get_all', getAll ? { get_all: true } : {});
  }
}

// Crear una instancia global del cliente WebSocket
export const wsClient = new WebSocketClient(WS_URL, WS_TOKEN);

/**
 * Get all contacts/users
 * @returns {Promise<Array>} Array of contacts
 */
export const getContacts = async () => {
  try {
    console.log('Fetching contacts via WebSocket');
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente, client_id:', wsClient.clientId);
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para obtener usuarios con parámetros de búsqueda
    console.log('Solicitando usuarios a través de WebSocket...');
    
    // Usar el método getUsers con el parámetro getAll
    const result = await wsClient.getUsers(true);
    
    console.log('Respuesta completa de WebSocket para usuarios:', JSON.stringify(result));
    
    // Verificar si la respuesta contiene usuarios
    if (!result.users || !Array.isArray(result.users)) {
      console.error('Respuesta inesperada del servidor:', result);
      return [];
    }
    
    // Transformar datos para mantener compatibilidad con el formato actual
    const contacts = result.users.map(user => ({
      id: user.id,
      name: user.full_name || user.phone || user.email || 'Usuario sin nombre',
      avatar: {
        type: "init",
        variant: "primary",
        title: user.full_name ? user.full_name.charAt(0).toUpperCase() : (user.phone ? user.phone.charAt(0).toUpperCase() : 'U')
      },
      status: "offline",
      lastChat: "Click to start conversation",
      time: new Date(user.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      unread: 0
    }));
    
    console.log(`Procesados ${contacts.length} contactos:`, 
      contacts.map(c => ({
        id: c.id,
        name: c.name
      }))
    );
    
    return contacts;
  } catch (error) {
    console.error('Error fetching contacts via WebSocket:', error);
    // Devolver un array vacío en lugar de propagar el error
    return [];
  }
};

/**
 * Get conversations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of conversations
 */
export const getConversations = async (userId) => {
  try {
    console.log(`Fetching conversations for user: ${userId} via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para obtener conversaciones
    console.log(`Solicitando conversaciones para usuario ${userId} a través de WebSocket...`);
    const result = await wsClient.getConversations(userId);
    
    // Verificar y loguear la respuesta
    console.log('Respuesta completa de WebSocket para conversaciones:', result);
    
    const conversations = result.conversations || [];
    console.log(`Received ${conversations.length} conversations via WebSocket:`, 
      conversations.map(c => ({
        id: c.id,
        external_id: c.external_id,
        unread: c.unread_count,
        last_message: c.last_message?.substring(0, 20) + (c.last_message?.length > 20 ? '...' : '')
      }))
    );
    
    // Asegurar que unread_count sea un número en todas las conversaciones
    const normalizedConversations = conversations.map(conv => ({
      ...conv,
      unread_count: Number(conv.unread_count || 0)
    }));
    
    return normalizedConversations;
  } catch (error) {
    console.error(`Error fetching conversations for user ${userId}:`, error);
    return [];
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (conversationId) => {
  try {
    console.log(`Fetching messages for conversation: ${conversationId} via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para obtener mensajes
    console.log(`Solicitando mensajes para conversación ${conversationId} a través de WebSocket...`);
    const result = await wsClient.getMessages(conversationId);
    
    // Verificar y loguear la respuesta
    console.log(`Received messages via WebSocket for conversation ${conversationId}:`, 
      result.messages ? `${result.messages.length} messages` : 'No messages'
    );
    
    if (!result.messages || !Array.isArray(result.messages)) {
      console.warn('No se encontraron mensajes o formato inesperado:', result);
      return [];
    }
    
    // Transformar datos para mantener compatibilidad con el formato actual
    const messages = result.messages.map(msg => ({
      id: msg.id,
      types: msg.role === 'user' ? 'sent' : 'received',
      text: msg.content,
      time: new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: msg.message_type || 'text',
      media_url: msg.media_url,
      read: msg.read || false
    }));
    
    console.log(`Procesados ${messages.length} mensajes para conversación ${conversationId}`);
    
    return messages;
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    return [];
  }
};

/**
 * Send a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} content - Message content
 * @param {string} role - Message role (user or assistant)
 * @returns {Promise<Object>} Sent message
 */
export const sendMessage = async (conversationId, content, role = 'user') => {
  try {
    console.log(`Sending message to conversation: ${conversationId} via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para enviar mensaje
    console.log(`Enviando mensaje a conversación ${conversationId} a través de WebSocket...`);
    const result = await wsClient.sendMessage(conversationId, content, role);
    
    // Verificar y loguear la respuesta
    console.log('Mensaje enviado exitosamente:', result.message ? result.message.id : 'No message ID');
    
    if (!result.message) {
      console.warn('Formato de respuesta inesperado al enviar mensaje:', result);
      throw new Error('Error al enviar mensaje: formato de respuesta inesperado');
    }
    
    // Transformar datos para mantener compatibilidad con el formato actual
    const message = {
      id: result.message.id,
      types: result.message.role === 'user' ? 'sent' : 'received',
      text: result.message.content,
      time: new Date(result.message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: result.message.message_type || 'text',
      media_url: result.message.media_url,
      read: result.message.read || false
    };
    
    return message;
  } catch (error) {
    console.error(`Error sending message to conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Mark all messages in a conversation as read
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Result
 */
export const markMessagesAsRead = async (conversationId) => {
  try {
    console.log(`Marking messages as read for conversation: ${conversationId} via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para marcar mensajes como leídos
    console.log(`Marcando mensajes como leídos para conversación ${conversationId} a través de WebSocket...`);
    const result = await wsClient.markMessagesAsRead(conversationId);
    
    // Verificar y loguear la respuesta
    console.log('Mensajes marcados como leídos:', result);
    
    return result;
  } catch (error) {
    console.error(`Error marking messages as read for conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Create a new conversation
 * @param {Object} conversation - Conversation data
 * @returns {Promise<Object>} Created conversation
 */
export const createConversation = async (conversation) => {
  try {
    console.log(`Creating conversation via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Usar WebSocket para crear conversación
    console.log(`Creando conversación a través de WebSocket...`);
    const result = await wsClient.createConversation(conversation);
    
    // Verificar y loguear la respuesta
    console.log('Conversación creada exitosamente:', result.conversation ? result.conversation.id : 'No conversation ID');
    
    if (!result.conversation) {
      console.warn('Formato de respuesta inesperado al crear conversación:', result);
      throw new Error('Error al crear conversación: formato de respuesta inesperado');
    }
    
    return result.conversation;
  } catch (error) {
    console.error(`Error creating conversation:`, error);
    throw error;
  }
};

/**
 * Toggle agent for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {boolean} enabled - Whether to enable or disable the agent
 * @returns {Promise<Object>} Result
 */
export const toggleAgent = async (conversationId, enabled) => {
  try {
    console.log(`Toggling agent for conversation: ${conversationId} to ${enabled ? 'enabled' : 'disabled'} via WebSocket`);
    
    // Verificar si el WebSocket está conectado
    if (!wsClient.isConnected) {
      console.log('WebSocket no conectado, intentando conectar...');
      try {
        await wsClient.connect();
        console.log('WebSocket conectado exitosamente');
      } catch (connectError) {
        console.error('Error al conectar WebSocket:', connectError);
        throw new Error('No se pudo conectar al WebSocket');
      }
    }
    
    // Si estamos en modo de datos simulados, simular la respuesta
    if (wsClient.useMockData) {
      console.log(`🔶 Modo de datos simulados: simulando toggle agent para conversación ${conversationId}`);
      
      // Buscar la conversación en los datos simulados
      const conversation = MOCK_DATA.conversations.find(c => c.id === conversationId);
      if (conversation) {
        // Actualizar el estado del agente
        conversation.agent_enabled = enabled;
        
        return {
          success: true,
          conversation: {
            ...conversation,
            agent_enabled: enabled
          }
        };
      } else {
        throw new Error(`Conversación no encontrada: ${conversationId}`);
      }
    }
    
    // Usar WebSocket para actualizar la conversación
    console.log(`Actualizando estado del agente para conversación ${conversationId} a través de WebSocket...`);
    const result = await wsClient.request('conversations', 'update', {
      conversation_id: conversationId,
      agent_enabled: enabled
    });
    
    // Verificar y loguear la respuesta
    console.log('Estado del agente actualizado:', result);
    
    return result;
  } catch (error) {
    console.error(`Error toggling agent for conversation ${conversationId}:`, error);
    throw error;
  }
};
