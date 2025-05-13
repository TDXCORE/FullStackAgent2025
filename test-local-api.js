/**
 * Test script to verify that the local API routes are working correctly
 * 
 * This script tests the following routes:
 * - /api/chat/users
 * - /api/chat/conversations
 * - /api/chat/messages
 */

const axios = require('axios');

// Base URL for the local API
const BASE_URL = 'http://localhost:3000';

// Test function
async function testLocalApiRoutes() {
  console.log('=== TESTING LOCAL API ROUTES ===');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log('-----------------------------------\n');

  // Get a valid user ID first
  console.log('=== Step 1: Getting a valid user ID ===');
  try {
    const usersResponse = await axios.get(`${BASE_URL}/api/chat/users`);
    console.log(`Users API - Status: ${usersResponse.status}`);
    
    if (usersResponse.data && usersResponse.data.length > 0) {
      const userId = usersResponse.data[0].id;
      console.log(`Found user ID: ${userId}\n`);
      
      // Test conversations API
      console.log('=== Step 2: Testing Conversations API ===');
      try {
        const convsResponse = await axios.get(`${BASE_URL}/api/chat/conversations?user_id=${userId}`);
        console.log(`Conversations API - Status: ${convsResponse.status}`);
        
        if (convsResponse.data && convsResponse.data.length > 0) {
          console.log(`Found ${convsResponse.data.length} conversations`);
          const conversationId = convsResponse.data[0].id;
          console.log(`Found conversation ID: ${conversationId}\n`);
          
          // Test messages API
          console.log('=== Step 3: Testing Messages API ===');
          try {
            const messagesResponse = await axios.get(`${BASE_URL}/api/chat/messages?conversation_id=${conversationId}`);
            console.log(`Messages API - Status: ${messagesResponse.status}`);
            console.log(`Found ${messagesResponse.data.length} messages\n`);
          } catch (error) {
            console.log(`❌ Messages API - Error: ${error.message}`);
            if (error.response) {
              console.log(`Status: ${error.response.status}`);
              console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
            }
          }
          
          // Test POST to messages API
          console.log('=== Step 4: Testing POST to Messages API ===');
          try {
            const newMessage = {
              conversation_id: conversationId,
              content: "Test message from local API test script",
              message_type: "text"
            };
            
            const createResponse = await axios.post(`${BASE_URL}/api/chat/messages`, newMessage);
            console.log(`POST to Messages API - Status: ${createResponse.status}`);
            console.log(`Created message with ID: ${createResponse.data.id}\n`);
          } catch (error) {
            console.log(`❌ POST to Messages API - Error: ${error.message}`);
            if (error.response) {
              console.log(`Status: ${error.response.status}`);
              console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
            }
          }
        } else {
          console.log('No conversations found for this user\n');
          
          // Create a conversation
          console.log('=== Step 3: Creating a new conversation ===');
          try {
            const newConversation = {
              user_id: userId,
              external_id: `test-${Date.now()}`,
              platform: 'web'
            };
            
            const createConvResponse = await axios.post(`${BASE_URL}/api/chat/conversations`, newConversation);
            console.log(`POST to Conversations API - Status: ${createConvResponse.status}`);
            console.log(`Created conversation with ID: ${createConvResponse.data.id}\n`);
            
            const conversationId = createConvResponse.data.id;
            
            // Test POST to messages API with the new conversation
            console.log('=== Step 4: Testing POST to Messages API with new conversation ===');
            try {
              const newMessage = {
                conversation_id: conversationId,
                content: "Test message for new conversation",
                message_type: "text"
              };
              
              const createMsgResponse = await axios.post(`${BASE_URL}/api/chat/messages`, newMessage);
              console.log(`POST to Messages API - Status: ${createMsgResponse.status}`);
              console.log(`Created message with ID: ${createMsgResponse.data.id}\n`);
            } catch (error) {
              console.log(`❌ POST to Messages API - Error: ${error.message}`);
              if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
              }
            }
          } catch (error) {
            console.log(`❌ POST to Conversations API - Error: ${error.message}`);
            if (error.response) {
              console.log(`Status: ${error.response.status}`);
              console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ Conversations API - Error: ${error.message}`);
        if (error.response) {
          console.log(`Status: ${error.response.status}`);
          console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
        }
      }
    } else {
      console.log('No users found\n');
    }
  } catch (error) {
    console.log(`❌ Users API - Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
    }
  }
  
  console.log('=== TEST SUMMARY ===');
  console.log(`Completed at: ${new Date().toLocaleString()}`);
  console.log('If all tests passed, you should see successful responses for all API endpoints.');
}

// Run the test
testLocalApiRoutes();
