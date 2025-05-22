'use client';
import { createContext, useContext, useMemo, useReducer, useState, useEffect, useRef } from 'react';
import { initialStates, rootReducer } from './reducer/rootReducer';
import { wsClient, getContacts, getConversations, getMessages, markMessagesAsRead } from '@/services/chatService';
// import { GlobalReducer, initialStates } from './GlobalReducer';

// Create a new context
const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
    const [states, dispatch] = useReducer(rootReducer, initialStates);

    // Inicializar conexión WebSocket cuando el componente se monta
    useEffect(() => {
        // Conectar al servidor WebSocket
        wsClient.connect().then(() => {
            console.log('WebSocket conectado exitosamente');
            
            // Registrar listeners para eventos
            wsClient.on('connect', (data) => {
                console.log('Conectado al servidor:', data);
                dispatch({ type: 'ws_connected', payload: data });
            });
            
            wsClient.on('disconnect', (data) => {
                console.log('Desconectado del servidor:', data);
                dispatch({ type: 'ws_disconnected', payload: data });
            });
            
            // Manejar heartbeats
            wsClient.on('heartbeat', (data) => {
                console.log('💓 Heartbeat recibido:', data.timestamp);
                dispatch({ type: 'heartbeat', payload: data });
            });
            
            wsClient.on('new_message', (data) => {
                console.log('Nuevo mensaje recibido:', data);
                console.log('Detalles del mensaje:', {
                    id: data.message.id,
                    conversation_id: data.message.conversation_id,
                    content: data.message.content ? data.message.content.substring(0, 50) + '...' : 'No content',
                    role: data.message.role,
                    created_at: data.message.created_at
                });
                dispatch({ type: 'ws_new_message', payload: data });
                
                // Si hay una conversación seleccionada y el mensaje pertenece a ella,
                // marcar los mensajes como leídos automáticamente
                if (data.message.conversation_id === states.chatState.currentConversationId) {
                    console.log('El mensaje pertenece a la conversación actual, marcando como leído');
                    markMessagesAsRead(data.message.conversation_id)
                        .then(() => {
                            console.log('Mensajes marcados como leídos exitosamente');
                        })
                        .catch(error => {
                            console.error('Error al marcar mensajes como leídos:', error);
                        });
                }
            });
            
            wsClient.on('message_deleted', (data) => {
                console.log('Mensaje eliminado:', data);
                dispatch({ type: 'ws_message_deleted', payload: data });
            });
            
            wsClient.on('conversation_updated', (data) => {
                console.log('Conversación actualizada:', data);
                dispatch({ type: 'ws_conversation_updated', payload: data });
            });
            
            wsClient.on('conversation_created', (data) => {
                console.log('Conversación creada:', data);
                dispatch({ type: 'ws_conversation_created', payload: data });
            });
            
            wsClient.on('user_updated', (data) => {
                console.log('Usuario actualizado:', data);
                dispatch({ type: 'ws_user_updated', payload: data });
            });
            
            // Manejar errores del WebSocket
            wsClient.on('error', (data) => {
                console.error('Error en WebSocket:', data);
                // No actualizamos el estado para errores, pero podríamos hacerlo si fuera necesario
            });
        }).catch(error => {
            console.error('Error al conectar WebSocket:', error);
        });
        
        // Limpiar al desmontar
        return () => {
            wsClient.disconnect();
        };
    }, [dispatch]);
    
    // Referencia para rastrear si los datos iniciales ya se han cargado
    const initialDataLoadedRef = useRef(false);
    
    // Cargar datos iniciales cuando el WebSocket está conectado
    useEffect(() => {
        if (states.chatState.wsConnected && !initialDataLoadedRef.current) {
            console.log('🔄 WebSocket conectado, cargando datos iniciales...');
            initialDataLoadedRef.current = true; // Marcar como cargado para evitar múltiples cargas
            
            // Cargar contactos iniciales
            const loadInitialData = async () => {
                try {
                    console.log('🔄 Cargando contactos iniciales...');
                    dispatch({ type: 'fetch_contacts_request' });
                    
                    // Ya no reconectamos el WebSocket aquí para evitar el bucle infinito
                    
                    const contacts = await getContacts();
                    console.log('✅ Contactos cargados:', contacts.length);
                    dispatch({ type: 'fetch_contacts_success', contacts });
                    
                    // Si hay contactos, cargar conversaciones para cada contacto
                    if (contacts && contacts.length > 0) {
                        console.log('🔄 Cargando conversaciones para contactos...');
                        dispatch({ type: 'fetch_conversations_request' });
                        
                        let allConversations = [];
                        for (const contact of contacts) {
                            try {
                                console.log(`🔍 Cargando conversaciones para contacto: ${contact.name} (${contact.id})`);
                                const userConversations = await getConversations(contact.id);
                                if (userConversations && Array.isArray(userConversations)) {
                                    console.log(`✅ Encontradas ${userConversations.length} conversaciones para ${contact.name}`);
                                    allConversations = [...allConversations, ...userConversations];
                                }
                            } catch (error) {
                                console.error(`❌ Error al cargar conversaciones para ${contact.name}:`, error);
                            }
                        }
                        
                        // Eliminar duplicados basados en ID de conversación
                        const uniqueConversations = Array.from(
                            new Map(allConversations.map(conv => [conv.id, conv])).values()
                        );
                        console.log(`✅ Total de conversaciones únicas cargadas: ${uniqueConversations.length}`);
                        
                        // Ordenar conversaciones por fecha de actualización (más reciente primero)
                        const sortedConversations = [...uniqueConversations].sort((a, b) => {
                            if (a.updated_at && b.updated_at) {
                                return new Date(b.updated_at) - new Date(a.updated_at);
                            }
                            return 0;
                        });
                        
                        console.log('🔄 Conversaciones ordenadas por fecha:', 
                            sortedConversations.slice(0, 3).map(c => ({
                                id: c.id.substring(0, 8),
                                updated_at: c.updated_at,
                                last_message: c.last_message ? c.last_message.substring(0, 20) + '...' : 'No message'
                            }))
                        );
                        
                        dispatch({ 
                            type: 'fetch_conversations_success', 
                            conversations: sortedConversations 
                        });
                        
                        // Si hay conversaciones, precargar mensajes para la primera conversación
                        if (sortedConversations.length > 0) {
                            const firstConversation = sortedConversations[0];
                            console.log(`🔄 Precargando mensajes para la primera conversación: ${firstConversation.id}`);
                            
                            try {
                                const messages = await getMessages(firstConversation.id);
                                console.log(`✅ Precargados ${messages.length} mensajes para la primera conversación`);
                                
                                // No establecer como conversación actual, solo precargar
                                dispatch({ 
                                    type: 'preload_messages', 
                                    conversationId: firstConversation.id,
                                    messages 
                                });
                            } catch (error) {
                                console.error('❌ Error al precargar mensajes:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error cargando datos iniciales:', error);
                    dispatch({ 
                        type: 'fetch_contacts_failure', 
                        error: error.message 
                    });
                }
            };
            
            loadInitialData();
            
            // Configurar un intervalo para refrescar datos periódicamente
            const refreshInterval = setInterval(async () => {
                console.log('🔄 Refrescando datos automáticamente...');
                
                try {
                    // Si hay una conversación seleccionada, refrescar sus mensajes
                    if (states.chatState.currentConversationId) {
                        console.log(`🔄 Refrescando mensajes para conversación: ${states.chatState.currentConversationId}`);
                        const messages = await getMessages(states.chatState.currentConversationId);
                        console.log(`✅ Refrescados ${messages.length} mensajes`);
                        
                        if (messages.length > states.chatState.msg.length) {
                            console.log(`🆕 Hay ${messages.length - states.chatState.msg.length} mensajes nuevos`);
                            dispatch({ type: 'fetch_messages_success', messages });
                        }
                    }
                    
                    // Refrescar todas las conversaciones para el primer contacto
                    if (states.chatState.contacts && states.chatState.contacts.length > 0) {
                        const firstContact = states.chatState.contacts[0];
                        console.log(`🔄 Refrescando conversaciones para contacto: ${firstContact.name}`);
                        
                        const conversations = await getConversations(firstContact.id);
                        if (conversations && Array.isArray(conversations) && conversations.length > 0) {
                            console.log(`✅ Refrescadas ${conversations.length} conversaciones`);
                            
                            // Actualizar solo si hay cambios
                            const currentConvsStr = JSON.stringify(states.chatState.conversations.map(c => ({ 
                                id: c.id, 
                                updated_at: c.updated_at,
                                last_message: c.last_message
                            })));
                            
                            const newConvsStr = JSON.stringify(conversations.map(c => ({ 
                                id: c.id, 
                                updated_at: c.updated_at,
                                last_message: c.last_message
                            })));
                            
                            if (currentConvsStr !== newConvsStr) {
                                console.log('🆕 Hay cambios en las conversaciones, actualizando...');
                                
                                // Combinar las conversaciones existentes con las nuevas
                                const combinedConversations = [...states.chatState.conversations];
                                
                                // Actualizar conversaciones existentes y añadir nuevas
                                conversations.forEach(newConv => {
                                    const existingIndex = combinedConversations.findIndex(c => c.id === newConv.id);
                                    if (existingIndex >= 0) {
                                        // Actualizar conversación existente
                                        combinedConversations[existingIndex] = {
                                            ...combinedConversations[existingIndex],
                                            ...newConv
                                        };
                                    } else {
                                        // Añadir nueva conversación
                                        combinedConversations.push(newConv);
                                    }
                                });
                                
                                // Ordenar por fecha de actualización
                                const sortedConversations = [...combinedConversations].sort((a, b) => {
                                    if (a.updated_at && b.updated_at) {
                                        return new Date(b.updated_at) - new Date(a.updated_at);
                                    }
                                    return 0;
                                });
                                
                                dispatch({ 
                                    type: 'fetch_conversations_success', 
                                    conversations: sortedConversations 
                                });
                            } else {
                                console.log('✅ No hay cambios en las conversaciones');
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error al refrescar datos:', error);
                }
            }, 15000); // Refrescar cada 15 segundos
            
            // Limpiar intervalo al desmontar
            return () => {
                clearInterval(refreshInterval);
            };
        }
    }, [states.chatState.wsConnected, dispatch]); // Reducimos las dependencias para evitar ejecuciones innecesarias

    const ContextValue = useMemo(() => {
        return { states, dispatch };
    }, [states, dispatch]);

    return (
        <GlobalStateContext.Provider value={ContextValue}>
            {children}
        </GlobalStateContext.Provider>
    )
}

export const useGlobalStateContext = () => {
    return useContext(GlobalStateContext)
}
