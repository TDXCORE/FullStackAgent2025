'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import { getContacts, getConversations, getMessages, createConversation, sendMessage, markMessagesAsRead } from '@/services/chatService';

const TestApiPage = () => {
  const [logs, setLogs] = useState([]);
  const [userId, setUserId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
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
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Contacts</h5>
            </Card.Header>
            <Card.Body>
              <Button 
                variant="primary" 
                onClick={testGetContacts} 
                disabled={loading}
                className="mb-3"
              >
                {loading ? <><Spinner size="sm" animation="border" /> Loading...</> : 'Fetch Contacts'}
              </Button>
              
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
