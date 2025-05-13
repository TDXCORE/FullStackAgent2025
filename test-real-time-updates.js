// Script para probar las actualizaciones en tiempo real

const fetch = require('node-fetch');

// Configuración
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api';
const CONVERSATION_ID = process.argv[2]; // Tomar el ID de conversación como argumento
const MESSAGE_INTERVAL = 5000; // Intervalo entre mensajes (5 segundos)
const TOTAL_MESSAGES = 3; // Número total de mensajes a enviar

if (!CONVERSATION_ID) {
  console.error('Error: Debes proporcionar un ID de conversación como argumento.');
  console.log('Uso: node test-real-time-updates.js <conversation_id>');
  process.exit(1);
}

console.log(`=== Prueba de Actualizaciones en Tiempo Real ===`);
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`ID de Conversación: ${CONVERSATION_ID}`);
console.log(`Intervalo entre mensajes: ${MESSAGE_INTERVAL / 1000} segundos`);
console.log(`Total de mensajes a enviar: ${TOTAL_MESSAGES}`);
console.log('\n');

// Función para enviar un mensaje de prueba
async function sendTestMessage(index) {
  try {
    const timestamp = new Date().toISOString();
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: CONVERSATION_ID,
        role: 'user',
        content: `Mensaje de prueba #${index + 1} - ${timestamp}`,
        message_type: 'text'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al enviar mensaje: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`✅ Mensaje #${index + 1} enviado correctamente:`, data.content);
    return data;
  } catch (error) {
    console.error(`❌ Error al enviar mensaje #${index + 1}:`, error.message);
    throw error;
  }
}

// Función principal para ejecutar la prueba
async function runTest() {
  console.log('Iniciando prueba de envío de mensajes...');
  
  for (let i = 0; i < TOTAL_MESSAGES; i++) {
    try {
      await sendTestMessage(i);
      
      // Esperar antes de enviar el siguiente mensaje (excepto el último)
      if (i < TOTAL_MESSAGES - 1) {
        console.log(`Esperando ${MESSAGE_INTERVAL / 1000} segundos antes del siguiente mensaje...`);
        await new Promise(resolve => setTimeout(resolve, MESSAGE_INTERVAL));
      }
    } catch (error) {
      console.error('Error en la prueba:', error);
      process.exit(1);
    }
  }
  
  console.log('\n=== Prueba completada con éxito ===');
  console.log('Verifica en el navegador que los mensajes aparezcan automáticamente sin necesidad de recargar.');
}

// Ejecutar la prueba
runTest();
