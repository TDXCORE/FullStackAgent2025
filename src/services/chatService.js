import axios from 'axios';

// Base API URL
const API_URL = '/api/chat';

/**
 * Get all contacts/users
 * @returns {Promise<Array>} Array of contacts
 */
export const getContacts = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Get conversations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of conversations
 */
export const getConversations = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/conversations?user_id=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
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
    const response = await axios.post(`${API_URL}/conversations`, {
      user_id: userId,
      external_id: externalId,
      platform
    });
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (conversationId) => {
  try {
    const response = await axios.get(`${API_URL}/messages?conversation_id=${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
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
    const response = await axios.post(`${API_URL}/messages`, {
      conversation_id: conversationId,
      content,
      message_type: messageType,
      media_url: mediaUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
