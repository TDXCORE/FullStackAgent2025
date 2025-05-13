// Test script to verify the local API endpoints (proxy implementation)

const fetch = require('node-fetch');

// Base URLs for the local API endpoints
const CONVERSATIONS_API = 'http://localhost:3000/api/chat/conversations';
const MESSAGES_API = 'http://localhost:3000/api/chat/messages';
const USERS_API = 'http://localhost:3000/api/chat/users';

// Test function for GET requests
async function testGetRequest(url, params = {}) {
  try {
    // Build query string from params
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    console.log(`Testing GET request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error('Error making GET request:', error);
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('=== TESTING LOCAL API ENDPOINTS ===\n');
  
  // Test Users API
  console.log('\n=== Testing Local Users API ===');
  const usersResult = await testGetRequest(USERS_API);
  
  if (usersResult.success) {
    console.log(`✅ Local Users API test passed. Retrieved ${usersResult.data.length} users.`);
  } else {
    console.log('❌ Local Users API test failed.');
  }
  
  // If we have users, use the first user's ID for conversation test
  let userId = null;
  if (usersResult.success && usersResult.data.length > 0) {
    userId = usersResult.data[0].id;
    console.log(`Using user ID: ${userId} for conversation test`);
  } else {
    console.log('No users found to test conversations');
  }
  
  // Test Conversations API if we have a user ID
  if (userId) {
    console.log('\n=== Testing Local Conversations API ===');
    const conversationsResult = await testGetRequest(CONVERSATIONS_API, { user_id: userId });
    
    if (conversationsResult.success) {
      console.log(`✅ Local Conversations API test passed. Retrieved ${conversationsResult.data.length} conversations.`);
      
      // If we have conversations, use the first conversation's ID for messages test
      if (conversationsResult.data.length > 0) {
        const conversationId = conversationsResult.data[0].id;
        console.log(`Using conversation ID: ${conversationId} for messages test`);
        
        // Test Messages API
        console.log('\n=== Testing Local Messages API ===');
        const messagesResult = await testGetRequest(MESSAGES_API, { conversation_id: conversationId });
        
        if (messagesResult.success) {
          console.log(`✅ Local Messages API test passed. Retrieved ${messagesResult.data.length} messages.`);
        } else {
          console.log('❌ Local Messages API test failed.');
        }
      } else {
        console.log('No conversations found to test messages');
      }
    } else {
      console.log('❌ Local Conversations API test failed.');
    }
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Local Users API:', usersResult.success ? '✅ PASSED' : '❌ FAILED');
  if (userId) {
    const conversationsResult = await testGetRequest(CONVERSATIONS_API, { user_id: userId });
    console.log('Local Conversations API:', conversationsResult.success ? '✅ PASSED' : '❌ FAILED');
    
    if (conversationsResult.success && conversationsResult.data.length > 0) {
      const conversationId = conversationsResult.data[0].id;
      const messagesResult = await testGetRequest(MESSAGES_API, { conversation_id: conversationId });
      console.log('Local Messages API:', messagesResult.success ? '✅ PASSED' : '❌ FAILED');
    } else {
      console.log('Local Messages API: ⚠️ NOT TESTED (No conversations available)');
    }
  } else {
    console.log('Local Conversations API: ⚠️ NOT TESTED (No users available)');
    console.log('Local Messages API: ⚠️ NOT TESTED (No conversations available)');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
