'use client';

import { useEffect, useState } from 'react';
import { getContacts, getConversations, getMessages } from '@/services/chatService';
import { Button, Card, Container, Row, Col } from 'react-bootstrap';

const ApiDebugger = () => {
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      addLog('Fetching contacts...');
      const data = await getContacts();
      setContacts(data);
      addLog(`Fetched ${data.length} contacts successfully`);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      addLog(`Error fetching contacts: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchConversations = async (userId) => {
    if (!userId) {
      addLog('No user ID provided for fetching conversations');
      return;
    }
    
    try {
      setLoading(true);
      addLog(`Fetching conversations for user ID: ${userId}...`);
      const data = await getConversations(userId);
      setConversations(data);
      addLog(`Fetched ${data.length} conversations successfully`);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      addLog(`Error fetching conversations: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) {
      addLog('No conversation ID provided for fetching messages');
      return;
    }
    
    try {
      setLoading(true);
      addLog(`Fetching messages for conversation ID: ${conversationId}...`);
      const data = await getMessages(conversationId);
      setMessages(data);
      addLog(`Fetched ${data.length} messages successfully`);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      addLog(`Error fetching messages: ${err.message}`);
      setLoading(false);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setSelectedConversationId(null);
    setMessages([]);
    fetchConversations(userId);
  };

  const handleConversationSelect = (conversationId) => {
    setSelectedConversationId(conversationId);
    fetchMessages(conversationId);
  };

  return (
    <Container fluid className="mt-4">
      <h2>API Debugger</h2>
      <Row>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Contacts</h5>
                <Button variant="primary" size="sm" onClick={fetchContacts} disabled={loading}>
                  {loading ? 'Loading...' : 'Fetch Contacts'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {contacts.length > 0 ? (
                <ul className="list-group">
                  {contacts.map(contact => (
                    <li 
                      key={contact.id} 
                      className={`list-group-item ${selectedUserId === contact.id ? 'active' : ''}`}
                      onClick={() => handleUserSelect(contact.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {contact.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No contacts found</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Conversations</h5>
                {selectedUserId && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => fetchConversations(selectedUserId)} 
                    disabled={loading || !selectedUserId}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {conversations.length > 0 ? (
                <ul className="list-group">
                  {conversations.map(conversation => (
                    <li 
                      key={conversation.id} 
                      className={`list-group-item ${selectedConversationId === conversation.id ? 'active' : ''}`}
                      onClick={() => handleConversationSelect(conversation.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      ID: {conversation.id}<br/>
                      External ID: {conversation.external_id}<br/>
                      Platform: {conversation.platform}<br/>
                      Created: {new Date(conversation.created_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No conversations found</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Messages</h5>
                {selectedConversationId && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => fetchMessages(selectedConversationId)} 
                    disabled={loading || !selectedConversationId}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {messages.length > 0 ? (
                <ul className="list-group">
                  {messages.map(message => (
                    <li key={message.id} className="list-group-item">
                      <div className={`message ${message.types}`}>
                        <strong>{message.types === 'sent' ? 'You' : 'Them'}</strong>: {message.text}
                        <div className="text-muted small">{message.time}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No messages found</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Logs</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <pre className="mb-0">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </pre>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ApiDebugger;
