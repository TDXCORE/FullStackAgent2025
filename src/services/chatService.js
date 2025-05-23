// Configuración para modo de desarrollo y fallback
const IS_DEV_MODE = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

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

/**
 * Cliente WebSocket para comunicarse con el servidor
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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 segundos iniciales
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
  }

  connect() {
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
          
          // Intentar reconectar automáticamente si no fue un cierre limpio
          if (event.code !== 1000 && event.code !== 1001) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ Error en WebSocket:', error);
          this.isConnected = false;
          // Aquí ya no activamos mock data, simplemente reportamos el error.
          // La reconexión se manejará en onclose si es apropiado.
          reject(error);
        };
      } catch (error) {
        console.error('Error al conectar:', error);
        reject(error);
      }
    });
  }
  
  disconnect() {
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
      
      // Aquí ya no activamos mock data.
      // Si se desea algún comportamiento específico tras fallos persistentes,
      // se podría añadir aquí, como notificar a la UI.
    }
  }
  
  // _startMockHeartbeats ya no es necesario y puede ser eliminado si no hay otra lógica que lo use.
  // Por ahora lo dejo por si hay referencias, pero idealmente se elimina.
  _startMockHeartbeats() {
    // Esta función estaba ligada al modo mock. Si se elimina el modo mock,
    // esta función probablemente ya no tenga uso o necesite ser reevaluada.
    // Por ahora, la dejamos vacía o con un log para indicar que no debería usarse.
    console.warn('_startMockHeartbeats fue llamada, pero el modo mock está deshabilitado.');
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
        // Siempre intentamos enviar una solicitud real
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
          // Ya no se diferencia IS_DEV_MODE para activar mockData
          console.log('🔄 Intentando reconectar y reenviar solicitud...');
          try {
            await this.connect();
            console.log('✅ Reconexión exitosa, reenviando solicitud...');
            
            // Reenviar solicitud
            this.socket.send(JSON.stringify(request));
          } catch (reconnectError) {
            console.error('❌ Error al reconectar:', reconnectError);
            reject(sendError); // Rechazar con el error de envío original si la reconexión falla
          }
        }
      } catch (error) {
        console.error('Error en request:', error);
        reject(error); // Ya no hay fallback a mockData
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
    
    // Ya no hay modo de datos simulados aquí.
    
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
