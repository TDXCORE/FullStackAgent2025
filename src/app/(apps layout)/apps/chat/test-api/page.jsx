'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { getContacts, getConversations, getMessages, createConversation, sendMessage, markMessagesAsRead, wsClient } from '@/services/chatService';

const TestApiPage = () => {
  const [logs, setLogs] = useState([]);
  const [userId, setUserId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // WebSocket states
  const [wsConnected, setWsConnected] = useState(false);
  const [wsClientId, setWsClientId] = useState(null);
  const [wsEvents, setWsEvents] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };
  
  const addEvent = (event) => {
    setWsEvents(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: event.type,
      data: event.data
    }, ...prev.slice(0, 19)]); // Keep only the last 20 events
  };
  
  const clearEvents = () => {
    setWsEvents([]);
  };

  // Setup WebSocket event listeners
  useEffect(() => {
    // Connect event
    const handleConnect = (data) => {
      setWsConnected(true);
      setWsClientId(data.client_id);
      addLog(`WebSocket conectado. ID de cliente: ${data.client_id}`);
      addEvent({ type: 'connect', data });
    };
    
    // Disconnect event
    const handleDisconnect = (data) => {
      setWsConnected(false);
      addLog(`WebSocket desconectado. Código: ${data.code}, Razón: ${data.reason}`);
      addEvent({ type: 'disconnect', data });
    };
    
    // New message event
    const handleNewMessage = (data) => {
      addLog(`Nuevo mensaje recibido en conversación ${data.message.conversation_id}`);
      addEvent({ type: 'new_message', data });
      
      // Si el mensaje pertenece a la conversación actual, actualizar la lista de mensajes
      if (data.message.conversation_id === conversationId) {
        testGetMessages();
      }
      
      // Actualizar la lista de conversaciones para reflejar los nuevos mensajes no leídos
      if (userId) {
        testGetConversations();
      }
    };
    
    // Message deleted event
    const handleMessageDeleted = (data) => {
      addLog(`Mensaje eliminado: ${data.message_id}`);
      addEvent({ type: 'message_deleted', data });
      
      // Actualizar la lista de mensajes si es necesario
      if (conversationId) {
        testGetMessages();
      }
    };
    
    // Conversation updated event
    const handleConversationUpdated = (data) => {
      addLog(`Conversación actualizada: ${data.conversation.id}`);
      addEvent({ type: 'conversation_updated', data });
      
      // Actualizar la lista de conversaciones
      if (userId) {
        testGetConversations();
      }
    };
    
    // Conversation created event
    const handleConversationCreated = (data) => {
      addLog(`Nueva conversación creada: ${data.conversation.id}`);
      addEvent({ type: 'conversation_created', data });
      
      // Actualizar la lista de conversaciones
      if (userId) {
        testGetConversations();
      }
    };
    
    // User updated event
    const handleUserUpdated = (data) => {
      addLog(`Usuario actualizado: ${data.user.id}`);
      addEvent({ type: 'user_updated', data });
      
      // Actualizar la lista de contactos
      testGetContacts();
    };
    
    // Error event
    const handleError = (data) => {
      addLog(`Error en WebSocket: ${JSON.stringify(data)}`);
      addEvent({ type: 'error', data });
    };
    
    // Register event listeners
    wsClient.on('connect', handleConnect);
    wsClient.on('disconnect', handleDisconnect);
    wsClient.on('new_message', handleNewMessage);
    wsClient.on('message_deleted', handleMessageDeleted);
    wsClient.on('conversation_updated', handleConversationUpdated);
    wsClient.on('conversation_created', handleConversationCreated);
    wsClient.on('user_updated', handleUserUpdated);
    wsClient.on('error', handleError);
    
    // Check if already connected
    if (wsClient.isConnected) {
      setWsConnected(true);
      setWsClientId(wsClient.clientId);
    }
    
    // Cleanup function to remove event listeners
    return () => {
      wsClient.off('connect', handleConnect);
      wsClient.off('disconnect', handleDisconnect);
      wsClient.off('new_message', handleNewMessage);
      wsClient.off('message_deleted', handleMessageDeleted);
      wsClient.off('conversation_updated', handleConversationUpdated);
      wsClient.off('conversation_created', handleConversationCreated);
      wsClient.off('user_updated', handleUserUpdated);
      wsClient.off('error', handleError);
    };
  }, [conversationId, userId]);
  
  const testConnectWebSocket = async () => {
    try {
      setLoading(true);
      addLog('Conectando a WebSocket...');
      await wsClient.connect();
      setLoading(false);
    } catch (error) {
      addLog(`Error al conectar WebSocket: ${error.message}`);
      console.error('Error connecting to WebSocket:', error);
      setLoading(false);
    }
  };
  
  const testDisconnectWebSocket = () => {
    try {
      addLog('Desconectando WebSocket...');
      wsClient.disconnect();
    } catch (error) {
      addLog(`Error al desconectar WebSocket: ${error.message}`);
      console.error('Error disconnecting WebSocket:', error);
    }
  };
  
  const testGetContacts = async () => {
    try {
      setLoading(true);
      addLog('Fetching contacts...');
      const data = await getContacts();
      setContacts(data);
      addLog(`Success! Fetched ${data.length} contacts`);
      console.log('Contacts:', data);
      setLoading(false);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error('Error fetching contacts:', error);
      setLoading(false);
    }
  };

  const testGetConversations = async () => {
    if (!userId) {
      addLog('Error: Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      addLog(`Fetching conversations for user ID: ${userId}...`);
      const data = await getConversations(userId);
      setConversations(data);
      addLog(`Success! Fetched ${data.length} conversations`);
      console.log('Conversations:', data);
      setLoading(false);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const testCreateConversation = async () => {
    if (!userId) {
      addLog('Error: Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      const externalId = `web-${Date.now()}`;
      addLog(`Creating conversation for user ID: ${userId} with external ID: ${externalId}...`);
      const data = await createConversation(userId, externalId, 'web');
      addLog(`Success! Created conversation with ID: ${data.id}`);
      console.log('Created conversation:', data);
      setConversationId(data.id);
      setLoading(false);
      
      // Refresh conversations list
      testGetConversations();
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error('Error creating conversation:', error);
      setLoading(false);
    }
  };

  const testGetMessages = async () => {
    if (!conversationId) {
      addLog('Error: Please enter a conversation ID');
      return;
    }

    try {
      setLoading(true);
      addLog(`Fetching messages for conversation ID: ${conversationId}...`);
      const data = await getMessages(conversationId);
      setMessages(data);
      addLog(`Success! Fetched ${data.length} messages`);
      console.log('Messages:', data);
      setLoading(false);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const testSendMessage = async () => {
    if (!conversationId) {
      addLog('Error: Please enter a conversation ID');
      return;
    }

    if (!messageText) {
      addLog('Error: Please enter a message');
      return;
    }

    try {
      setLoading(true);
      addLog(`Sending message to conversation ID: ${conversationId}...`);
      const data = await sendMessage(conversationId, messageText);
      addLog(`Success! Message sent with ID: ${data.id}`);
      console.log('Sent message:', data);
      setMessageText('');
      setLoading(false);
      
      // Refresh messages list
      testGetMessages();
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error('Error sending message:', error);
      setLoading(false);
    }
  };

  return (
    <Container fluid className="mt-4 mb-5">
      <h2>API Test Tool</h2>
      <p className="text-muted">Use this tool to test the chat API endpoints directly</p>
      
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">WebSocket Connection</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3">
                  <strong>Status:</strong>{' '}
                  {wsConnected ? (
                    <Badge bg="success">Conectado</Badge>
                  ) : (
                    <Badge bg="danger">Desconectado</Badge>
                  )}
                </div>
                {wsConnected && (
                  <div className="me-3">
                    <strong>Client ID:</strong> {wsClientId}
                  </div>
                )}
                <div className="ms-auto">
                  <Button 
                    variant={wsConnected ? "outline-danger" : "outline-success"} 
                    size="sm"
                    onClick={wsConnected ? testDisconnectWebSocket : testConnectWebSocket}
                    disabled={loading}
                  >
                    {loading ? (
                      <><Spinner size="sm" animation="border" /> {wsConnected ? 'Desconectando...' : 'Conectando...'}</>
                    ) : (
                      wsConnected ? 'Desconectar' : 'Conectar'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="d-flex flex-wrap gap-2">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={async () => {
                    if (!wsConnected) {
                      addLog('WebSocket no conectado. Conectando primero...');
                      await testConnectWebSocket();
                    }
                    
                    if (!userId) {
                      addLog('Error: Por favor seleccione un usuario primero');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog(`Obteniendo conversaciones vía WebSocket para usuario ID: ${userId}...`);
                      const result = await wsClient.getConversations(userId);
                      addLog(`Éxito! Obtenidas ${result.conversations.length} conversaciones vía WebSocket`);
                      setConversations(result.conversations);
                      console.log('Conversations via WebSocket:', result.conversations);
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error fetching conversations via WebSocket:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !userId}
                >
                  Obtener Conversaciones (WS)
                </Button>
                
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={async () => {
                    if (!wsConnected) {
                      addLog('WebSocket no conectado. Conectando primero...');
                      await testConnectWebSocket();
                    }
                    
                    if (!conversationId) {
                      addLog('Error: Por favor seleccione una conversación primero');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog(`Obteniendo mensajes vía WebSocket para conversación ID: ${conversationId}...`);
                      const result = await wsClient.getMessages(conversationId);
                      
                      // Transformar mensajes al formato esperado por la UI
                      const formattedMessages = result.messages.map(message => ({
                        id: message.id,
                        types: message.role === 'user' ? 'sent' : 'received',
                        text: message.content,
                        time: new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        message_type: message.message_type || 'text',
                        media_url: message.media_url,
                        read: message.read
                      }));
                      
                      addLog(`Éxito! Obtenidos ${result.messages.length} mensajes vía WebSocket`);
                      setMessages(formattedMessages);
                      console.log('Messages via WebSocket:', result.messages);
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error fetching messages via WebSocket:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !conversationId}
                >
                  Obtener Mensajes (WS)
                </Button>
                
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  onClick={async () => {
                    if (!wsConnected) {
                      addLog('WebSocket no conectado. Conectando primero...');
                      await testConnectWebSocket();
                    }
                    
                    if (!conversationId) {
                      addLog('Error: Por favor seleccione una conversación primero');
                      return;
                    }
                    
                    if (!messageText) {
                      addLog('Error: Por favor ingrese un mensaje');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog(`Enviando mensaje vía WebSocket a conversación ID: ${conversationId}...`);
                      const result = await wsClient.sendMessage(conversationId, messageText, 'user');
                      
                      // Transformar al formato esperado por la UI
                      const message = {
                        id: result.message.id,
                        types: 'sent',
                        text: result.message.content,
                        time: new Date(result.message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        message_type: result.message.message_type || 'text',
                        media_url: result.message.media_url
                      };
                      
                      addLog(`Éxito! Mensaje enviado vía WebSocket con ID: ${result.message.id}`);
                      setMessageText('');
                      
                      // Actualizar la lista de mensajes
                      setMessages(prev => [...prev, message]);
                      
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error sending message via WebSocket:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !conversationId || !messageText}
                >
                  Enviar Mensaje (WS)
                </Button>
                
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  onClick={async () => {
                    if (!wsConnected) {
                      addLog('WebSocket no conectado. Conectando primero...');
                      await testConnectWebSocket();
                    }
                    
                    if (!conversationId) {
                      addLog('Error: Por favor seleccione una conversación primero');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog(`Marcando mensajes como leídos vía WebSocket para conversación ID: ${conversationId}...`);
                      const result = await wsClient.markMessagesAsRead(conversationId);
                      addLog(`Éxito! Mensajes marcados como leídos vía WebSocket`);
                      
                      // Actualizar la lista de conversaciones
                      if (userId) {
                        testGetConversations();
                      }
                      
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error marking messages as read via WebSocket:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !conversationId}
                >
                  Marcar como Leídos (WS)
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Contacts</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="primary" 
                  onClick={testGetContacts} 
                  disabled={loading}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Fetch Contacts'}
                </Button>
                
                <Button 
                  variant="outline-primary" 
                  onClick={async () => {
                    if (!wsConnected) {
                      addLog('WebSocket no conectado. Conectando primero...');
                      await testConnectWebSocket();
                    }
                    
                    try {
                      setLoading(true);
                      addLog('Probando conexión directa con el servidor WebSocket para obtener usuarios...');
                      
                      // Usar el método getUsers con el parámetro getAll
                      const result = await wsClient.getUsers(true);
                      
                      addLog(`Respuesta directa del servidor: ${JSON.stringify(result)}`);
                      console.log('Respuesta directa para usuarios:', result);
                      
                      if (result.users && Array.isArray(result.users)) {
                        // Transformar datos para mantener compatibilidad con el formato completo
                        const formattedContacts = result.users.map(user => ({
                          id: user.id,
                          name: user.full_name || user.phone || user.email || 'Usuario sin nombre',
                          avatar: {
                            type: "init",
                            variant: "primary",
                            title: user.full_name ? user.full_name.charAt(0).toUpperCase() : 
                                  (user.phone ? user.phone.charAt(0).toUpperCase() : 
                                  (user.email ? user.email.charAt(0).toUpperCase() : 'U'))
                          },
                          status: "offline",
                          lastChat: "Click to start conversation",
                          time: new Date(user.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                          unread: 0
                        }));
                        
                        setContacts(formattedContacts);
                        addLog(`Obtenidos ${result.users.length} usuarios directamente`);
                      } else {
                        addLog('No se encontraron usuarios en la respuesta directa');
                      }
                      
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error en solicitud directa: ${error.message}`);
                      console.error('Error en solicitud directa:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Probar Conexión Directa'}
                </Button>
              </div>
              
              {contacts.length > 0 && (
                <div className="mt-3">
                  <h6>Contacts ({contacts.length})</h6>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map(contact => (
                          <tr key={contact.id}>
                            <td>{contact.id}</td>
                            <td>{contact.name}</td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => {
                                  setUserId(contact.id);
                                  addLog(`Selected user ID: ${contact.id}`);
                                }}
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Conversations</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>User ID</Form.Label>
                <Form.Control 
                  type="text" 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                />
              </Form.Group>
              
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="primary" 
                  onClick={testGetConversations} 
                  disabled={loading || !userId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Get Conversations'}
                </Button>
                
                <Button 
                  variant="success" 
                  onClick={testCreateConversation} 
                  disabled={loading || !userId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Create Conversation'}
                </Button>
              </div>
              
              {conversations.length > 0 && (
                <div className="mt-3">
                  <h6>Conversations ({conversations.length})</h6>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>External ID</th>
                          <th>Unread</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversations.map(conv => (
                          <tr key={conv.id} style={conv.unread_count > 0 ? {backgroundColor: "rgba(0, 123, 255, 0.15)", fontWeight: "bold"} : {}}>
                            <td>{conv.id}</td>
                            <td>{conv.external_id}</td>
                            <td>
                              {conv.unread_count > 0 ? (
                                <span className="badge bg-danger">{conv.unread_count}</span>
                              ) : (
                                <span className="badge bg-secondary">0</span>
                              )}
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  onClick={() => {
                                    setConversationId(conv.id);
                                    addLog(`Selected conversation ID: ${conv.id}`);
                                  }}
                                >
                                  Select
                                </Button>
                                {conv.unread_count > 0 && (
                                  <Button 
                                    variant="outline-success" 
                                    size="sm" 
                                    onClick={async () => {
                                      try {
                                        setLoading(true);
                                        addLog(`Marking messages as read for conversation ID: ${conv.id}...`);
                                        const result = await markMessagesAsRead(conv.id);
                                        addLog(`Success! Marked ${result.updated_count || 'all'} messages as read`);
                                        // Refresh conversations list
                                        testGetConversations();
                                      } catch (error) {
                                        addLog(`Error: ${error.message}`);
                                        console.error('Error marking messages as read:', error);
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                  >
                                    Mark Read
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Messages</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Conversation ID</Form.Label>
                <Form.Control 
                  type="text" 
                  value={conversationId} 
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="Enter conversation ID"
                />
              </Form.Group>
              
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="primary" 
                  onClick={testGetMessages} 
                  disabled={loading || !conversationId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Get Messages'}
                </Button>
                
                <Button 
                  variant="warning" 
                  onClick={async () => {
                    if (!conversationId) {
                      addLog('Error: Please enter a conversation ID');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog(`Marking messages as read for conversation ID: ${conversationId}...`);
                      const result = await markMessagesAsRead(conversationId);
                      addLog(`Success! Marked ${result.updated_count || 'all'} messages as read`);
                      // Refresh conversations list
                      if (userId) {
                        testGetConversations();
                      }
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error marking messages as read:', error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !conversationId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Mark as Read'}
                </Button>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>New Message</Form.Label>
                <Form.Control 
                  type="text" 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message"
                />
              </Form.Group>
              
              <Button 
                variant="success" 
                onClick={testSendMessage} 
                disabled={loading || !conversationId || !messageText}
              >
                {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Send Message'}
              </Button>
              
              {messages.length > 0 && (
                <div className="mt-3">
                  <h6>Messages ({messages.length})</h6>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Content</th>
                          <th>Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map(msg => (
                          <tr key={msg.id}>
                            <td>{msg.id}</td>
                            <td>{msg.types}</td>
                            <td>{msg.text}</td>
                            <td>{msg.time}</td>
                            <td>
                              {msg.read === false ? (
                                <span className="badge bg-danger">Unread</span>
                              ) : (
                                <span className="badge bg-success">Read</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Unread Messages Test</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">Test the unread messages functionality</p>
              
              <div className="d-flex flex-column gap-2">
                <Button 
                  variant="info" 
                  onClick={async () => {
                    if (!userId) {
                      addLog('Error: Please select a user first');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog('Testing unread messages functionality...');
                      
                      // 1. Get conversations for the user
                      addLog(`Fetching conversations for user ID: ${userId}...`);
                      const conversations = await getConversations(userId);
                      
                      if (conversations.length === 0) {
                        addLog('No conversations found. Please create a conversation first.');
                        setLoading(false);
                        return;
                      }
                      
                      // 2. Check if conversations are sorted by unread count
                      let isSorted = true;
                      for (let i = 0; i < conversations.length - 1; i++) {
                        if (conversations[i].unread_count < conversations[i + 1].unread_count) {
                          isSorted = false;
                          break;
                        }
                      }
                      
                      addLog(`Conversations sorted by unread count: ${isSorted ? 'Yes' : 'No'}`);
                      
                      // 3. Display unread counts for each conversation
                      conversations.forEach(conv => {
                        addLog(`Conversation ${conv.id}: ${conv.unread_count} unread messages`);
                      });
                      
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error testing unread messages:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !userId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Test Unread Messages Sorting'}
                </Button>
                
                <Button 
                  variant="primary" 
                  onClick={async () => {
                    if (!userId) {
                      addLog('Error: Please select a user first');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      addLog('Refreshing conversation list to check unread status...');
                      
                      // Refresh conversations list
                      await testGetConversations();
                      
                      setLoading(false);
                    } catch (error) {
                      addLog(`Error: ${error.message}`);
                      console.error('Error refreshing conversations:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !userId}
                >
                  {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Refresh Conversations'}
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">WebSocket Events</h5>
                  <Button variant="outline-secondary" size="sm" onClick={clearEvents}>Clear</Button>
                </Card.Header>
                <Card.Body>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {wsEvents.length === 0 ? (
                      <p className="text-muted">No events received yet</p>
                    ) : (
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Type</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wsEvents.map(event => (
                            <tr key={event.id}>
                              <td>{event.time}</td>
                              <td>
                                <Badge bg={
                                  event.type === 'connect' ? 'success' :
                                  event.type === 'disconnect' ? 'danger' :
                                  event.type === 'new_message' ? 'primary' :
                                  event.type === 'error' ? 'danger' :
                                  'info'
                                }>
                                  {event.type}
                                </Badge>
                              </td>
                              <td>
                                <pre style={{ fontSize: '0.8rem', maxHeight: '100px', overflowY: 'auto', margin: 0 }}>
                                  {JSON.stringify(event.data, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Logs</h5>
              <Button variant="outline-secondary" size="sm" onClick={clearLogs}>Clear</Button>
            </Card.Header>
            <Card.Body>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <pre className="mb-0">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </pre>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TestApiPage;
