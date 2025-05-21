'use client';
import { createContext, useContext, useMemo, useReducer, useState, useEffect } from 'react';
import { initialStates, rootReducer } from './reducer/rootReducer';
import { wsClient, getContacts, getConversations } from '@/services/chatService';
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
            
            wsClient.on('new_message', (data) => {
                console.log('Nuevo mensaje recibido:', data);
                dispatch({ type: 'ws_new_message', payload: data });
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
        }).catch(error => {
            console.error('Error al conectar WebSocket:', error);
        });
        
        // Limpiar al desmontar
        return () => {
            wsClient.disconnect();
        };
    }, [dispatch]);
    
    // Cargar datos iniciales cuando el WebSocket está conectado
    useEffect(() => {
        if (states.chatState.wsConnected) {
            console.log('WebSocket conectado, cargando datos iniciales...');
            
            // Cargar contactos iniciales
            const loadInitialData = async () => {
                try {
                    console.log('Cargando contactos iniciales...');
                    dispatch({ type: 'fetch_contacts_request' });
                    const contacts = await getContacts();
                    console.log('Contactos cargados:', contacts);
                    dispatch({ type: 'fetch_contacts_success', contacts });
                    
                    // Si hay contactos, cargar conversaciones para cada contacto
                    if (contacts && contacts.length > 0) {
                        console.log('Cargando conversaciones para contactos...');
                        dispatch({ type: 'fetch_conversations_request' });
                        
                        let allConversations = [];
                        for (const contact of contacts) {
                            try {
                                console.log(`Cargando conversaciones para contacto: ${contact.name} (${contact.id})`);
                                const userConversations = await getConversations(contact.id);
                                if (userConversations && Array.isArray(userConversations)) {
                                    console.log(`Encontradas ${userConversations.length} conversaciones para ${contact.name}`);
                                    allConversations = [...allConversations, ...userConversations];
                                }
                            } catch (error) {
                                console.error(`Error al cargar conversaciones para ${contact.name}:`, error);
                            }
                        }
                        
                        // Eliminar duplicados basados en ID de conversación
                        const uniqueConversations = Array.from(
                            new Map(allConversations.map(conv => [conv.id, conv])).values()
                        );
                        console.log(`Total de conversaciones únicas cargadas: ${uniqueConversations.length}`);
                        
                        dispatch({ 
                            type: 'fetch_conversations_success', 
                            conversations: uniqueConversations 
                        });
                    }
                } catch (error) {
                    console.error('Error cargando datos iniciales:', error);
                    dispatch({ 
                        type: 'fetch_contacts_failure', 
                        error: error.message 
                    });
                }
            };
            
            loadInitialData();
        }
    }, [states.chatState.wsConnected, dispatch]);

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
