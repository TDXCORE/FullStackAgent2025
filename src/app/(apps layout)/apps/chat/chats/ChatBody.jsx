import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, Dropdown } from 'react-bootstrap';
import { ArrowDown, CornerUpRight, MoreHorizontal, Database } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getMessages, markMessagesAsRead, wsClient } from '@/services/chatService';
import * as Icons from 'react-feather';

//Images

const ChatBody = () => {
    const { states, dispatch } = useGlobalStateContext();
    const [loading, setLoading] = useState(false);
    
    // Use messages directly from global state instead of local state
    const messages = states.chatState.msg || [];

    // Verificar si el WebSocket está conectado
    useEffect(() => {
        if (states.chatState.currentConversationId && !states.chatState.wsConnected) {
            console.log("WebSocket no conectado, intentando conectar...");
            wsClient.connect()
                .then(() => {
                    console.log("WebSocket conectado exitosamente desde ChatBody");
                })
                .catch(error => {
                    console.error("Error al conectar WebSocket desde ChatBody:", error);
                });
        }
    }, [states.chatState.currentConversationId, states.chatState.wsConnected]);

    // Fetch messages when conversation ID changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (states.chatState.currentConversationId && states.chatState.currentConversationId !== null) {
                try {
                    console.log(`ChatBody: Obteniendo mensajes para conversación ID: ${states.chatState.currentConversationId}`);
                    setLoading(true);
                    dispatch({ type: "fetch_messages_request" });
                    
                    // Verificar si el WebSocket está conectado
                    if (!wsClient.isConnected) {
                        console.log("WebSocket no conectado, intentando conectar antes de obtener mensajes...");
                        try {
                            await wsClient.connect();
                            console.log("WebSocket conectado exitosamente");
                        } catch (connectError) {
                            console.error("Error al conectar WebSocket:", connectError);
                        }
                    }
                    
                    // Verificar si estamos usando datos simulados
                    const usingMockData = typeof window !== 'undefined' && window.localStorage.getItem('USE_MOCK_DATA') === 'true';
                    console.log(`ChatBody: Usando ${usingMockData ? 'datos simulados' : 'datos reales'} para obtener mensajes`);
                    
                    const messagesData = await getMessages(states.chatState.currentConversationId);
                    console.log(`ChatBody: ${messagesData.length} mensajes obtenidos para conversación ${states.chatState.currentConversationId}`);
                    
                    if (messagesData.length > 0) {
                        console.log("Primer mensaje:", messagesData[0]);
                        console.log("Último mensaje:", messagesData[messagesData.length - 1]);
                    }
                    
                    dispatch({ type: "fetch_messages_success", messages: messagesData });
                    
                    // Desplazar automáticamente al último mensaje
                    setTimeout(() => {
                        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                    
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching messages:", error);
                    dispatch({ type: "fetch_messages_failure", error: error.message });
                    setLoading(false);
                }
            } else {
                console.log("No hay conversación seleccionada");
                // Limpiar mensajes si no hay conversación seleccionada
                dispatch({ type: "update_messages", messages: [] });
            }
        };
        
        fetchMessages();
    }, [states.chatState.currentConversationId, dispatch]);

    // Marcar mensajes como leídos cuando se selecciona una conversación
    useEffect(() => {
        // Cuando se selecciona una conversación, marcar mensajes como leídos
        if (states.chatState.currentConversationId) {
            console.log(`ChatBody: Verificando mensajes no leídos para conversación: ${states.chatState.currentConversationId}`);
            
            const currentConversation = states.chatState.conversations.find(
                conv => conv.id === states.chatState.currentConversationId
            );
            
            if (currentConversation) {
                console.log(`ChatBody: Conversación encontrada, mensajes no leídos: ${currentConversation.unread_count}`);
                
                if (currentConversation.unread_count > 0) {
                    console.log(`ChatBody: Marcando ${currentConversation.unread_count} mensajes como leídos para conversación: ${states.chatState.currentConversationId}`);
                    
                    markMessagesAsRead(states.chatState.currentConversationId)
                        .then((result) => {
                            console.log("ChatBody: Mensajes marcados como leídos:", result);
                            
                            // Actualizar el estado global
                            dispatch({
                                type: "update_conversation",
                                conversation: {
                                    ...currentConversation,
                                    unread_count: 0
                                }
                            });
                        })
                        .catch(error => {
                            console.error("Error al marcar mensajes como leídos:", error);
                        });
                } else {
                    console.log("ChatBody: No hay mensajes no leídos para marcar");
                }
            } else {
                console.log(`ChatBody: No se encontró la conversación con ID: ${states.chatState.currentConversationId}`);
            }
        }
    }, [states.chatState.currentConversationId, dispatch, states.chatState.conversations]);
    
    // Manejar eventos WebSocket para nuevos mensajes
    useEffect(() => {
        // Cuando se recibe un nuevo mensaje a través de WebSocket y pertenece a la conversación actual,
        // desplazar automáticamente al último mensaje
        if (states.chatState.wsConnected && states.chatState.currentConversationId) {
            console.log(`🔄 ChatBody: WebSocket conectado y conversación seleccionada: ${states.chatState.currentConversationId}`);
            console.log(`📊 ChatBody: Total de mensajes en la conversación: ${states.chatState.msg.length}`);
            
            // Configurar un intervalo para verificar nuevos mensajes periódicamente
            const checkInterval = setInterval(async () => {
                try {
                    console.log(`🔍 ChatBody: Verificando nuevos mensajes para conversación: ${states.chatState.currentConversationId}`);
                    
                    // Forzar reconexión del WebSocket periódicamente para asegurar conexión fresca
                    if (!wsClient.isConnected) {
                        console.log('🔄 ChatBody: WebSocket no conectado, intentando conectar...');
                        try {
                            await wsClient.connect();
                            console.log('✅ ChatBody: WebSocket conectado exitosamente');
                        } catch (connectError) {
                            console.error('❌ ChatBody: Error al conectar WebSocket:', connectError);
                        }
                    }
                    
                    const latestMessages = await getMessages(states.chatState.currentConversationId);
                    
                    // Comparar si hay nuevos mensajes
                    if (latestMessages.length > states.chatState.msg.length) {
                        console.log(`🆕 ChatBody: Se encontraron ${latestMessages.length - states.chatState.msg.length} nuevos mensajes`);
                        
                        // Verificar si hay mensajes realmente nuevos comparando IDs
                        const currentMessageIds = new Set(states.chatState.msg.map(m => m.id));
                        const newMessages = latestMessages.filter(m => !currentMessageIds.has(m.id));
                        
                        if (newMessages.length > 0) {
                            console.log(`✅ ChatBody: Hay ${newMessages.length} mensajes realmente nuevos`);
                            console.log('📝 Nuevos mensajes:', newMessages.map(m => ({
                                id: m.id,
                                text: m.text ? m.text.substring(0, 20) + '...' : 'No text',
                                time: m.time
                            })));
                            
                            dispatch({ type: "fetch_messages_success", messages: latestMessages });
                            
                            // Marcar mensajes como leídos
                            try {
                                console.log(`🔄 ChatBody: Marcando mensajes como leídos para conversación: ${states.chatState.currentConversationId}`);
                                await markMessagesAsRead(states.chatState.currentConversationId);
                                console.log('✅ ChatBody: Mensajes marcados como leídos exitosamente');
                            } catch (error) {
                                console.error('❌ ChatBody: Error al marcar mensajes como leídos:', error);
                            }
                        } else {
                            console.log('ℹ️ ChatBody: Los mensajes nuevos ya están en la lista (IDs duplicados)');
                        }
                    } else {
                        console.log('✅ ChatBody: No hay mensajes nuevos');
                    }
                } catch (error) {
                    console.error("❌ ChatBody: Error al verificar nuevos mensajes:", error);
                }
            }, 5000); // Verificar cada 5 segundos
            
            // Desplazar al último mensaje cuando cambia la lista de mensajes
            setTimeout(() => {
                console.log("🔄 ChatBody: Desplazando al último mensaje");
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            
            // Limpiar intervalo al desmontar
            return () => {
                clearInterval(checkInterval);
            };
        }
    }, [states.chatState.wsConnected, states.chatState.currentConversationId, dispatch]);
    
    // Efecto para manejar cambios en la lista de mensajes
    useEffect(() => {
        if (states.chatState.msg.length > 0) {
            // Desplazar al último mensaje cuando cambia la lista de mensajes
            setTimeout(() => {
                console.log("ChatBody: Desplazando al último mensaje después de actualización");
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [states.chatState.msg]);


    // 👇️ scroll to bottom every time messages change
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    return (
        <SimpleBar style={{ height: "100%" }} id="chat_body" className="chat-body">
            <ul id="dummy_avatar" className="list-unstyled chat-single-list">
                {!states.chatState.currentConversationId && (
                    <li className="text-center p-4">
                        <p className="text-muted">Selecciona una conversación para ver los mensajes</p>
                    </li>
                )}
                
                {states.chatState.currentConversationId && messages.length === 0 && (
                    <li className="text-center p-4">
                        <p className="text-muted">No hay mensajes en esta conversación</p>
                        {typeof window !== 'undefined' && window.localStorage.getItem('USE_MOCK_DATA') === 'true' && (
                            <div className="alert alert-warning mt-3">
                                <small>
                                    <strong>Modo de datos simulados activado.</strong> Para ver datos reales, haz clic en el botón <Database size={14} /> en la barra superior.
                                </small>
                            </div>
                        )}
                    </li>
                )}
                
                {messages.length > 0 && messages.map((elem, index) => (
                    <li className={classNames("media", (elem.types))} key={index}>
                        {elem.types === "received" && <div className="avatar avatar-xs avatar-rounded">
                            {states.chatState.avatar.type === "img" && states.chatState.avatar.src && (
                                <Image 
                                    src={states.chatState.avatar.src} 
                                    alt="user" 
                                    className="avatar-img" 
                                    width={30} 
                                    height={30}
                                />
                            )}
                            {states.chatState.avatar.type === "init" && <div className={`avatar avatar-xs avatar-${states.chatState.avatar.variant} avatar-rounded`}>
                                <span className="initial-wrap">{states.chatState.avatar.title}</span>
                            </div>}
                            {(!states.chatState.avatar.type || (states.chatState.avatar.type === "img" && !states.chatState.avatar.src)) && (
                                <div className="avatar avatar-xs avatar-soft-primary avatar-rounded">
                                    <span className="initial-wrap">U</span>
                                </div>
                            )}
                        </div>}
                        <div className="media-body">
                            <div className="msg-box" id="msg-1" >
                                <div>
                                    <p>{elem.text}</p>
                                    <span className="chat-time">
                                        {elem.time}
                                        {elem.types === "sent" && (
                                            <span className="ms-1" title={elem.read ? "Leído" : "Enviado"}>
                                                {elem.read ? (
                                                    <span style={{ color: '#34c759' }}>✓✓</span>
                                                ) : (
                                                    <span style={{ color: '#8e8e93' }}>✓</span>
                                                )}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="msg-action">
                                    <Button className="btn-icon btn-flush-dark btn-rounded flush-soft-hover no-caret">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <CornerUpRight />
                                            </span>
                                        </span>
                                    </Button>
                                    <Dropdown>
                                        <Dropdown.Toggle variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret">
                                            <span className="icon">
                                                <span className="feather-icon">
                                                    <MoreHorizontal />
                                                </span>
                                            </span>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu align="end">
                                            <Dropdown.Item href="#forward">Forward</Dropdown.Item>
                                            <Dropdown.Item href="#copy">Copy</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <div ref={bottomRef} />
        </SimpleBar>
    )
}

export default ChatBody;
