'use client';
import { createContext, useContext, useMemo, useReducer, useState, useEffect } from 'react';
import { initialStates, rootReducer } from './reducer/rootReducer';
import { wsClient } from '@/services/chatService';
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
