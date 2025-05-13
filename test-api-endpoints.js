// Script para probar los endpoints de la API
const fetch = require('node-fetch');

// URLs base
const CONVERSATIONS_API = 'https://waagentv1.onrender.com/api/conversations';
const MESSAGES_API = 'https://waagentv1.onrender.com/api/messages';
const USERS_API = 'https://waagentv1.onrender.com/api/users';

// Función para realizar pruebas
async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE API ===');
  
  try {
    // 1. Probar obtener usuarios
    console.log('\n--- Probando GET /users ---');
    const usersResponse = await fetch(USERS_API);
    const users = await usersResponse.json();
    
    if (!usersResponse.ok) {
      throw new Error(`Error al obtener usuarios: ${JSON.stringify(users)}`);
    }
    
    console.log(`✅ Éxito! Se obtuvieron ${users.length} usuarios`);
    
    if (users.length === 0) {
      throw new Error('No se encontraron usuarios para continuar las pruebas');
    }
    
    // Usar el primer usuario para las pruebas
    const testUser = users[0];
    console.log(`Usando usuario para pruebas: ID=${testUser.id}, Nombre=${testUser.full_name || testUser.name}`);
    
    // 2. Probar obtener conversaciones del usuario
    console.log('\n--- Probando GET /conversations?user_id=XXX ---');
    const conversationsResponse = await fetch(`${CONVERSATIONS_API}?user_id=${testUser.id}`);
    const conversations = await conversationsResponse.json();
    
    if (!conversationsResponse.ok) {
      throw new Error(`Error al obtener conversaciones: ${JSON.stringify(conversations)}`);
    }
    
    console.log(`✅ Éxito! Se obtuvieron ${conversations.length} conversaciones para el usuario`);
    
    let testConversation;
    
    // Si no hay conversaciones, crear una nueva
    if (conversations.length === 0) {
      console.log('\n--- Probando POST /conversations (crear nueva) ---');
      const newConversationResponse = await fetch(CONVERSATIONS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUser.id,
          external_id: `test-${Date.now()}`,
          platform: 'web',
          status: 'active'
        }),
      });
      
      testConversation = await newConversationResponse.json();
      
      if (!newConversationResponse.ok) {
        throw new Error(`Error al crear conversación: ${JSON.stringify(testConversation)}`);
      }
      
      console.log(`✅ Éxito! Se creó una nueva conversación con ID=${testConversation.id}`);
    } else {
      // Usar la primera conversación existente
      testConversation = conversations[0];
      console.log(`Usando conversación existente: ID=${testConversation.id}`);
    }
    
    // 3. Probar obtener mensajes de la conversación
    console.log('\n--- Probando GET /messages?conversation_id=XXX ---');
    const messagesResponse = await fetch(`${MESSAGES_API}?conversation_id=${testConversation.id}`);
    const messages = await messagesResponse.json();
    
    if (!messagesResponse.ok) {
      throw new Error(`Error al obtener mensajes: ${JSON.stringify(messages)}`);
    }
    
    console.log(`✅ Éxito! Se obtuvieron ${messages.length} mensajes para la conversación`);
    
    // 4. Probar enviar un mensaje
    console.log('\n--- Probando POST /messages (enviar mensaje) ---');
    const newMessageResponse = await fetch(MESSAGES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: testConversation.id,
        content: `Mensaje de prueba - ${new Date().toLocaleString()}`,
        role: 'user',
        message_type: 'text'
      }),
    });
    
    const newMessage = await newMessageResponse.json();
    
    if (!newMessageResponse.ok) {
      throw new Error(`Error al enviar mensaje: ${JSON.stringify(newMessage)}`);
    }
    
    console.log(`✅ Éxito! Se envió un nuevo mensaje con ID=${newMessage.id}`);
    
    // 5. Verificar que el mensaje se haya agregado
    console.log('\n--- Verificando que el mensaje se haya agregado ---');
    const updatedMessagesResponse = await fetch(`${MESSAGES_API}?conversation_id=${testConversation.id}`);
    const updatedMessages = await updatedMessagesResponse.json();
    
    if (!updatedMessagesResponse.ok) {
      throw new Error(`Error al obtener mensajes actualizados: ${JSON.stringify(updatedMessages)}`);
    }
    
    console.log(`✅ Éxito! Ahora hay ${updatedMessages.length} mensajes en la conversación`);
    
    if (updatedMessages.length <= messages.length) {
      console.warn('⚠️ Advertencia: No se detectó un aumento en el número de mensajes');
    }
    
    console.log('\n=== TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO ===');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
  }
}

// Ejecutar las pruebas
runTests();
