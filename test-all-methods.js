// Comprehensive test script to verify all HTTP methods for the API endpoints

const fetch = require('node-fetch');

// Base URLs for the API endpoints
const EXTERNAL_BASE_URL = 'https://waagentv1.onrender.com/api';
const LOCAL_BASE_URL = 'http://localhost:3000/api/chat';

// Test data for creating new resources
const TEST_USER = {
  full_name: 'Test User',
  phone: '+1234567890',
  email: 'test@example.com',
  company: 'Test Company'
};

const TEST_CONVERSATION = {
  external_id: 'test-external-id',
  platform: 'web',
  status: 'active'
};

const TEST_MESSAGE = {
  role: 'user',
  content: 'This is a test message',
  message_type: 'text'
};

// Helper function to make HTTP requests
async function makeRequest(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`Making ${method} request to: ${url}`);
    if (body) {
      console.log('Request body:', JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, options);
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      data = { message: 'No JSON response body' };
    }

    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`Error making ${method} request:`, error);
    return { success: false, error: error.message };
  }
}

// Test function for a specific endpoint and all its methods
async function testEndpoint(baseUrl, endpoint, testData, parentId = null, parentIdParam = null) {
  console.log(`\n=== Testing ${endpoint.toUpperCase()} API (${baseUrl}) ===`);
  
  // Prepare URL with parent ID if needed
  let url = `${baseUrl}/${endpoint}`;
  let createData = { ...testData };
  
  if (parentId && parentIdParam) {
    url = `${url}?${parentIdParam}=${parentId}`;
    createData[parentIdParam] = parentId;
  }
  
  // Test GET (list)
  console.log(`\n--- Testing GET ${endpoint} ---`);
  const getResult = await makeRequest(url);
  
  // Test POST (create)
  console.log(`\n--- Testing POST ${endpoint} ---`);
  const postResult = await makeRequest(url, 'POST', createData);
  
  // If POST was successful, test PUT and DELETE
  if (postResult.success && postResult.data && postResult.data.id) {
    const id = postResult.data.id;
    
    // Test PUT (update)
    console.log(`\n--- Testing PUT ${endpoint}/${id} ---`);
    const updateData = { id, ...createData, updated: true };
    const putResult = await makeRequest(`${baseUrl}/${endpoint}/${id}`, 'PUT', updateData);
    
    // Test DELETE
    console.log(`\n--- Testing DELETE ${endpoint}/${id} ---`);
    const deleteResult = await makeRequest(`${baseUrl}/${endpoint}/${id}`, 'DELETE');
    
    return {
      get: getResult,
      post: postResult,
      put: putResult,
      delete: deleteResult,
      id
    };
  }
  
  return {
    get: getResult,
    post: postResult
  };
}

// Main test function
async function runTests() {
  const testExternal = process.argv.includes('--external');
  const testLocal = process.argv.includes('--local');
  
  if (!testExternal && !testLocal) {
    console.log('Please specify which endpoints to test with --external or --local flags');
    return;
  }
  
  if (testExternal) {
    console.log('\n=== TESTING EXTERNAL API ENDPOINTS ===\n');
    await testExternalEndpoints();
  }
  
  if (testLocal) {
    console.log('\n=== TESTING LOCAL API ENDPOINTS ===\n');
    await testLocalEndpoints();
  }
}

async function testExternalEndpoints() {
  // Test users endpoint
  const usersResult = await testEndpoint(EXTERNAL_BASE_URL, 'users', TEST_USER);
  
  // Test conversations endpoint with user ID if available
  let userId = null;
  if (usersResult.post && usersResult.post.success) {
    userId = usersResult.post.data.id;
  } else if (usersResult.get && usersResult.get.success && usersResult.get.data.length > 0) {
    userId = usersResult.get.data[0].id;
  }
  
  let conversationId = null;
  if (userId) {
    const conversationsResult = await testEndpoint(
      EXTERNAL_BASE_URL, 
      'conversations', 
      { ...TEST_CONVERSATION, user_id: userId },
      userId,
      'user_id'
    );
    
    // Test messages endpoint with conversation ID if available
    if (conversationsResult.post && conversationsResult.post.success) {
      conversationId = conversationsResult.post.data.id;
    } else if (conversationsResult.get && conversationsResult.get.success && conversationsResult.get.data.length > 0) {
      conversationId = conversationsResult.get.data[0].id;
    }
    
    if (conversationId) {
      await testEndpoint(
        EXTERNAL_BASE_URL, 
        'messages', 
        { ...TEST_MESSAGE, conversation_id: conversationId },
        conversationId,
        'conversation_id'
      );
    }
  }
}

async function testLocalEndpoints() {
  // Test users endpoint
  const usersResult = await testEndpoint(LOCAL_BASE_URL, 'users', TEST_USER);
  
  // Test conversations endpoint with user ID if available
  let userId = null;
  if (usersResult.post && usersResult.post.success) {
    userId = usersResult.post.data.id;
  } else if (usersResult.get && usersResult.get.success && usersResult.get.data.length > 0) {
    userId = usersResult.get.data[0].id;
  }
  
  let conversationId = null;
  if (userId) {
    const conversationsResult = await testEndpoint(
      LOCAL_BASE_URL, 
      'conversations', 
      { ...TEST_CONVERSATION, user_id: userId },
      userId,
      'user_id'
    );
    
    // Test messages endpoint with conversation ID if available
    if (conversationsResult.post && conversationsResult.post.success) {
      conversationId = conversationsResult.post.data.id;
    } else if (conversationsResult.get && conversationsResult.get.success && conversationsResult.get.data.length > 0) {
      conversationId = conversationsResult.get.data[0].id;
    }
    
    if (conversationId) {
      await testEndpoint(
        LOCAL_BASE_URL, 
        'messages', 
        { ...TEST_MESSAGE, conversation_id: conversationId },
        conversationId,
        'conversation_id'
      );
    }
  }
}

// Check command line arguments
if (process.argv.length <= 2) {
  console.log('Usage: node test-all-methods.js [--external] [--local]');
  console.log('  --external: Test the external API endpoints');
  console.log('  --local: Test the local API endpoints');
} else {
  // Run the tests
  runTests().catch(error => {
    console.error('Error running tests:', error);
  });
}
