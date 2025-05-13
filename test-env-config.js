// Script para probar la configuración de variables de entorno

console.log('=== Prueba de Configuración de Entorno ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

// Simular el comportamiento de chatService.js
const API_URL = typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_API_BASE_URL 
  ? window.ENV.NEXT_PUBLIC_API_BASE_URL 
  : process.env.NEXT_PUBLIC_API_BASE_URL || '/api/chat';

console.log('API_URL calculada:', API_URL);

// Simular el comportamiento de los archivos de ruta
const CONVERSATIONS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api'}/conversations`;
const MESSAGES_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api'}/messages`;
const USERS_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api'}/users`;

console.log('URLs de API:');
console.log('- Conversations:', CONVERSATIONS_URL);
console.log('- Messages:', MESSAGES_URL);
console.log('- Users:', USERS_URL);

console.log('\n=== Instrucciones de Prueba ===');
console.log('1. Ejecutar en desarrollo: NODE_ENV=development node test-env-config.js');
console.log('2. Ejecutar simulando producción: NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://waagentv1.onrender.com/api node test-env-config.js');
