import axios from 'axios';

// Base API URL - Usa la variable de entorno si está disponible, de lo contrario usa la ruta relativa
const API_URL = typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_API_BASE_URL 
  ? window.ENV.NEXT_PUBLIC_API_BASE_URL 
  : process.env.NEXT_PUBLIC_API_BASE_URL || '/api/chat';

// WebSocket URL - Usa la variable de entorno si está disponible, de lo contrario usa la URL por defecto
const WS_URL = typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_WS_BASE_URL 
  ? window.ENV.NEXT_PUBLIC_WS_BASE_URL 
  : process.env.NEXT_PUBLIC_WS_BASE_URL || 'wss://waagentv1.onrender.com';

// WebSocket Auth Token
const WS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3NDc3OTU1NjUsImV4cCI6MTc3OTMzMTU2NSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.JX6CXcJ5KWr9Omnyyf4xlIRYlDCIefbxz9StLAe4gqY';

/**
 * Cliente WebSocket para comunicarse con el servidor
 */
class WebSocketClient {
    /**
     * Cliente WebSocket para comunicarse con el servidor
     * @param {string} baseUrl - URL base del servidor (ej: "wss://waagentv1.onrender.com")
     * @param {string} token - Token JWT de autenticación (opcional)
     */
    constructor(baseUrl, token = null) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.eventListeners = {};
        this.responseHandlers = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2 segundos
    }

    /**
     * Conecta al servidor WebSocket
     * @returns {Promise} Promesa que se resuelve cuando la conexión se establece
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // Si ya está conectado, resolver inmediatamente
                if (this.isConnected && this.socket) {
                    resolve();
                    return;
                }
                
                // Construir URL con token si está disponible
                let url = `${this.baseUrl}/ws`;
                if (this.token) {
                    url += `?token=${this.token}`;
                }

                console.log(`Conectando a ${url}...`);
                this.socket = new WebSocket(url);

                // Configurar manejadores de eventos
                this.socket.onopen = () => {
                    console.log('Conexión WebSocket establecida');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    this._handleMessage(event.data);
                };

                this.socket.onclose = (event) => {
                    console.log(`Conexión WebSocket cerrada: ${event.code} ${event.reason}`);
                    this.isConnected = false;
                    this._attemptReconnect();
                    
                    // Disparar evento de desconexión
                    this._triggerEvent('disconnect', {
                        code: event.code,
                        reason: event.reason
                    });
                };

                this.socket.onerror = (error) => {
                    console.error('Error en WebSocket:', error);
                    reject(error);
                    
                    // Disparar evento de error
                    this._triggerEvent('error', {
                        error: error
                    });
                };
            } catch (error) {
                console.error('Error al conectar:', error);
                reject(error);
            }
        });
    }

    /**
     * Intenta reconectar al servidor
     * @private
     */
    _attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect()
                    .then(() => {
                        console.log('Reconexión exitosa');
                        this._triggerEvent('reconnect', {
                            attempt: this.reconnectAttempts
                        });
                    })
                    .catch((error) => {
                        console.error('Error al reconectar:', error);
                    });
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Máximo número de intentos de reconexión alcanzado');
            this._triggerEvent('reconnect_failed', {
                attempts: this.reconnectAttempts
            });
        }
    }

    /**
     * Maneja los mensajes recibidos del servidor
     * @param {string} data - Datos recibidos
     * @private
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('Mensaje recibido:', message);

            // Manejar mensaje de conexión inicial
            if (message.type === 'connected') {
                this.clientId = message.payload?.client_id;
                console.log(`ID de cliente asignado: ${this.clientId}`);
                this._triggerEvent('connect', message.payload);
                return;
            }

            // Manejar respuestas a solicitudes
            if (message.id && this.responseHandlers[message.id]) {
                const handler = this.responseHandlers[message.id];
                handler(message);
                delete this.responseHandlers[message.id];
                return;
            }

            // Manejar eventos
            if (message.type === 'event') {
                this._triggerEvent(message.event, message.payload);
                return;
            }

            // Manejar heartbeat
            if (message.type === 'heartbeat') {
                this._triggerEvent('heartbeat', message.payload);
                return;
            }

            // Otros mensajes
            this._triggerEvent('message', message);
        } catch (error) {
            console.error('Error al procesar mensaje:', error, data);
        }
    }

    /**
     * Dispara un evento para los listeners registrados
     * @param {string} event - Nombre del evento
     * @param {object} data - Datos del evento
     * @private
     */
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

    /**
     * Genera un ID único para las solicitudes
     * @returns {string} ID único
     * @private
     */
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Envía una solicitud al servidor
     * @param {string} resource - Recurso solicitado (conversations, messages, users)
     * @param {string} action - Acción a realizar (get, get_all, create, update, delete)
     * @param {object} data - Datos de la solicitud
     * @returns {Promise} Promesa que se resuelve con la respuesta del servidor
     */
    request(resource, action, data = {}) {
        return new Promise(async (resolve, reject) => {
            // Asegurar que estamos conectados antes de enviar la solicitud
            if (!this.isConnected) {
                try {
                    await this.connect();
                } catch (error) {
                    reject(new Error('No se pudo conectar al servidor WebSocket'));
                    return;
                }
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

            // Registrar handler para la respuesta
            this.responseHandlers[id] = (response) => {
                if (response.type === 'error') {
                    reject(new Error(response.payload?.message || 'Error desconocido'));
                } else {
                    resolve(response.payload);
                }
            };

            // Enviar solicitud
            console.log('Enviando solicitud:', request);
            this.socket.send(JSON.stringify(request));
        });
    }

    /**
     * Cierra la conexión WebSocket
     */
    disconnect() {
        if (this.socket && this.isConnected) {
            this.socket.close();
            this.isConnected = false;
            console.log('Conexión WebSocket cerrada');
        }
    }

    /**
     * Registra un listener para un evento
     * @param {string} event - Nombre del evento
     * @param {function} callback - Función a llamar cuando ocurra el evento
     * @returns {function} Función para eliminar el listener
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);

        // Devolver función para eliminar el listener
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Elimina un listener para un evento
     * @param {string} event - Nombre del evento
     * @param {function} callback - Función a eliminar
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Obtiene todas las conversaciones de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise} Promesa que se resuelve con las conversaciones
     */
    getConversations(userId) {
        return this.request('conversations', 'get_all', { user_id: userId });
    }

    /**
     * Obtiene una conversación específica
     * @param {string} conversationId - ID de la conversación
     * @returns {Promise} Promesa que se resuelve con la conversación
     */
    getConversation(conversationId) {
        return this.request('conversations', 'get_by_id', { conversation_id: conversationId });
    }

    /**
     * Crea una nueva conversación
     * @param {object} conversation - Datos de la conversación
     * @returns {Promise} Promesa que se resuelve con la conversación creada
     */
    createConversation(conversation) {
        return this.request('conversations', 'create', { conversation });
    }

    /**
     * Obtiene los mensajes de una conversación
     * @param {string} conversationId - ID de la conversación
     * @returns {Promise} Promesa que se resuelve con los mensajes
     */
    getMessages(conversationId) {
        return this.request('messages', 'get_by_conversation', { conversation_id: conversationId });
    }

    /**
     * Envía un mensaje a una conversación
     * @param {string} conversationId - ID de la conversación
     * @param {string} content - Contenido del mensaje
     * @param {string} role - Rol del remitente (user, assistant)
     * @param {string} messageType - Tipo de mensaje (text, image, etc.)
     * @param {string} mediaUrl - URL del medio (opcional)
     * @returns {Promise} Promesa que se resuelve con el mensaje creado
     */
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

    /**
     * Marca los mensajes de una conversación como leídos
     * @param {string} conversationId - ID de la conversación
     * @returns {Promise} Promesa que se resuelve con el resultado
     */
    markMessagesAsRead(conversationId) {
        return this.request('messages', 'update', { 
            conversation_id: conversationId,
            read: true
        });
    }

    /**
     * Obtiene información de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise} Promesa que se resuelve con los datos del usuario
     */
    getUser(userId) {
        return this.request('users', 'get_by_id', { user_id: userId });
    }

    /**
     * Obtiene todos los usuarios
     * @returns {Promise} Promesa que se resuelve con la lista de usuarios
     */
    getUsers() {
        return this.request('users', 'get_all');
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
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.getUsers();
    
    // Transformar datos para mantener compatibilidad con el formato actual
    const contacts = result.users.map(user => ({
      id: user.id,
      name: user.full_name,
      avatar: {
        type: "init",
        variant: "primary",
        title: user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
      },
      status: "offline",
      lastChat: "Click to start conversation",
      time: new Date(user.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      unread: 0
    }));
    
    return contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    // Intentar fallback a REST API si WebSocket falla
    try {
      const response = await axios.get(`${API_URL}/users`);
      return response.data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      throw error; // Lanzar el error original de WebSocket
    }
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
    
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.getConversations(userId);
    
    // Verificar y loguear la respuesta
    const conversations = result.conversations || [];
    console.log(`Received ${conversations.length} conversations via WebSocket:`, conversations);
    
    // Asegurar que unread_count sea un número en todas las conversaciones
    const normalizedConversations = conversations.map(conv => ({
      ...conv,
      unread_count: Number(conv.unread_count || 0)
    }));
    
    return normalizedConversations;
  } catch (error) {
    console.error('Error fetching conversations via WebSocket:', error);
    
    // Intentar fallback a REST API si WebSocket falla
    try {
      console.log(`Fallback: Fetching conversations from: ${API_URL}/conversations?user_id=${userId}`);
      const response = await axios.get(`${API_URL}/conversations?user_id=${userId}`);
      const data = response.data || [];
      console.log(`Received ${data.length} conversations via REST API:`, data);
      return data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      // Devolver un array vacío en lugar de propagar el error
      return [];
    }
  }
};

/**
 * Create a new conversation
 * @param {string} userId - User ID
 * @param {string} externalId - External ID (e.g., phone number)
 * @param {string} platform - Platform (default: 'web')
 * @returns {Promise<Object>} Created conversation
 */
export const createConversation = async (userId, externalId, platform = 'web') => {
  try {
    // Validate required parameters
    if (!userId || !externalId) {
      console.error('Missing required parameters for creating conversation');
      throw new Error('User ID and External ID are required');
    }
    
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.createConversation({
      created_by: userId,
      external_id: externalId,
      platform,
      status: 'active'
    });
    
    return result.conversation;
  } catch (error) {
    console.error('Error creating conversation via WebSocket:', error);
    
    // Intentar fallback a REST API si WebSocket falla
    try {
      const response = await axios.post(`${API_URL}/conversations`, {
        user_id: userId,
        external_id: externalId,
        platform,
        status: 'active'
      });
      return response.data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      // Return a more informative error message
      if (fallbackError.response && fallbackError.response.status === 422) {
        console.error('Validation error:', fallbackError.response.data);
        throw new Error(`Validation error: ${JSON.stringify(fallbackError.response.data)}`);
      }
      throw error; // Lanzar el error original de WebSocket
    }
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (conversationId) => {
  try {
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.getMessages(conversationId);
    
    // Transformar mensajes al formato esperado por el frontend
    const messages = result.messages.map(message => ({
      id: message.id,
      types: message.role === 'user' ? 'sent' : 'received',
      text: message.content,
      time: new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: message.message_type || 'text',
      media_url: message.media_url,
      read: message.read
    }));
    
    return messages;
  } catch (error) {
    console.error('Error fetching messages via WebSocket:', error);
    
    // Intentar fallback a REST API si WebSocket falla
    try {
      const response = await axios.get(`${API_URL}/messages?conversation_id=${conversationId}`);
      return response.data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      throw error; // Lanzar el error original de WebSocket
    }
  }
};

/**
 * Send a message
 * @param {string} conversationId - Conversation ID
 * @param {string} content - Message content
 * @param {string} messageType - Message type (default: 'text')
 * @param {string|null} mediaUrl - Media URL (optional)
 * @returns {Promise<Object>} Created message
 */
export const sendMessage = async (conversationId, content, messageType = 'text', mediaUrl = null) => {
  try {
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.sendMessage(conversationId, content, 'user', messageType, mediaUrl);
    
    // Transformar al formato esperado por el frontend
    const message = {
      id: result.message.id,
      types: 'sent',
      text: result.message.content,
      time: new Date(result.message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: result.message.message_type || 'text',
      media_url: result.message.media_url
    };
    
    return message;
  } catch (error) {
    console.error('Error sending message via WebSocket:', error);
    
    // Intentar fallback a REST API si WebSocket falla
    try {
      const response = await axios.post(`${API_URL}/messages`, {
        conversation_id: conversationId,
        content,
        message_type: messageType,
        media_url: mediaUrl
      });
      return response.data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      throw error; // Lanzar el error original de WebSocket
    }
  }
};

/**
 * Toggle agent for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {boolean} enable - True to enable agent, false to disable
 * @returns {Promise<Object>} Result of the operation
 */
export const toggleAgent = async (conversationId, enable) => {
  try {
    // Cambiar a usar parámetros de consulta en lugar de un cuerpo JSON
    const response = await axios.put(`${API_URL}/conversations/${conversationId}/agent?enable=${enable}`);
    console.log('Toggle agent response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error toggling agent:', error);
    throw error;
  }
};

/**
 * Mark all messages in a conversation as read
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Result of the operation
 */
export const markMessagesAsRead = async (conversationId) => {
  try {
    // Usar WebSocket en lugar de REST API
    const result = await wsClient.markMessagesAsRead(conversationId);
    return result;
  } catch (error) {
    console.error('Error marking messages as read via WebSocket:', error);
    
    // Intentar fallback a REST API si WebSocket falla
    try {
      const response = await axios.put(`${API_URL}/messages/read?conversation_id=${conversationId}`);
      return response.data;
    } catch (fallbackError) {
      console.error('Fallback REST API also failed:', fallbackError);
      throw error; // Lanzar el error original de WebSocket
    }
  }
};
