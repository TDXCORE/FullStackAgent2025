import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, Dropdown } from 'react-bootstrap';
import { ArrowDown, CornerUpRight, MoreHorizontal } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getMessages, markMessagesAsRead } from '@/services/chatService';

//Images

const ChatBody = () => {
    const { states, dispatch } = useGlobalStateContext();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch messages when conversation ID changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (states.chatState.currentConversationId) {
                try {
                    console.log(`Obteniendo mensajes para conversación ID: ${states.chatState.currentConversationId}`);
                    setLoading(true);
                    dispatch({ type: "fetch_messages_request" });
                    const messagesData = await getMessages(states.chatState.currentConversationId);
                    console.log(`Mensajes obtenidos:`, messagesData);
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

    // Polling para actualizar mensajes periódicamente
    useEffect(() => {
        if (states.chatState.currentConversationId) {
            // Función para obtener mensajes más recientes
            const fetchLatestMessages = async () => {
                try {
                    const messagesData = await getMessages(states.chatState.currentConversationId);
                    
                    // Verificar si hay cambios en los mensajes
                    const currentMessages = states.chatState.msg || [];
                    const hasNewMessages = messagesData.length !== currentMessages.length ||
                        JSON.stringify(messagesData) !== JSON.stringify(currentMessages);
                    
                    if (hasNewMessages) {
                        console.log("Nuevos mensajes detectados, actualizando...", {
                            nuevos: messagesData.length,
                            actuales: currentMessages.length
                        });
                        
                        dispatch({ type: "update_messages", messages: messagesData });
                        
                        // Desplazar automáticamente al último mensaje
                        setTimeout(() => {
                            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                        
                        // Si hay mensajes nuevos y la conversación actual tiene mensajes no leídos,
                        // marcarlos como leídos
                        const currentConversation = states.chatState.conversations.find(
                            conv => conv.id === states.chatState.currentConversationId
                        );
                        
                        if (currentConversation && currentConversation.unread_count > 0) {
                            try {
                                console.log(`Marcando mensajes como leídos para conversación: ${states.chatState.currentConversationId}`);
                                await markMessagesAsRead(states.chatState.currentConversationId);
                                
                                // Actualizar el estado global
                                dispatch({
                                    type: "update_conversation",
                                    conversation: {
                                        ...currentConversation,
                                        unread_count: 0
                                    }
                                });
                            } catch (error) {
                                console.error("Error al marcar mensajes como leídos:", error);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error en polling de mensajes:", error);
                }
            };
            
            // Ejecutar inmediatamente y luego cada 3 segundos
            fetchLatestMessages();
            const intervalId = setInterval(fetchLatestMessages, 3000);
            
            // Limpiar intervalo al desmontar o cambiar de conversación
            return () => {
                console.log("Limpiando intervalo de polling para conversación:", states.chatState.currentConversationId);
                clearInterval(intervalId);
            };
        }
    }, [states.chatState.currentConversationId, dispatch, states.chatState.msg, states.chatState.conversations]);

    // Update local messages state when redux state changes
    useEffect(() => {
        setMessages(states.chatState.msg);
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
                                    <span className="chat-time">{elem.time}</span>
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
