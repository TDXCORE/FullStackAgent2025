import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, Dropdown } from 'react-bootstrap';
import { ArrowDown, CornerUpRight, MoreHorizontal } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getMessages, markMessagesAsRead } from '@/services/chatService';

//Images
import giphy from '@/assets/img/giphy.gif'

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
                <li className="media received">
                    <div className="avatar avatar-xs avatar-rounded">
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
                    </div>
                    <div className="media-body">
                        <div className="msg-box">
                            <div>
                                <p>Cool, lets talk about it tomorrow</p>
                                <span className="chat-time">10:52 PM</span>
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
                        <div className="msg-box">
                            <div>
                                <p>Images for new marketing pages have been sent</p>
                                <span className="chat-time">10:53 PM</span>
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
                <li className="media media-attachment received">
                    <div className="avatar avatar-xs avatar-rounded">
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
                    </div>
                    <div className="media-body msg-docs">
                        <div className="msg-box">
                            <div>
                                <div className="media">
                                    <div className="avatar avatar-icon avatar-sm avatar-blue">
                                        <span className="initial-wrap fs-3">
                                            <i className="ri-file-excel-2-fill" />
                                        </span>
                                    </div>
                                    <div className="media-body">
                                        <p className="file-name">Website_content.xls</p>
                                        <p className="file-size">2,635 KB</p>
                                    </div>
                                </div>
                                <div className="file-overlay">
                                    <Button variant="primary" size="sm" className="btn-icon btn-rounded">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <ArrowDown />
                                            </span>
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="msg-box">
                            <div>
                                <div className="media">
                                    <div className="avatar avatar-icon avatar-sm avatar-warning">
                                        <span className="initial-wrap fs-3">
                                            <i className="ri-file-zip-fill" />
                                        </span>
                                    </div>
                                    <div className="media-body">
                                        <p className="file-name">themeforest-pack.zip</p>
                                        <p className="file-size">2.45 GB</p>
                                    </div>
                                </div>
                                <div className="file-overlay">
                                    <Button variant="primary" size="sm" className="btn-icon btn-rounded">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <ArrowDown />
                                            </span>
                                        </span>
                                    </Button>
                                </div>
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
                <li className="day-sep">
                    <span>Today</span>
                </li>
                <li className="media sent">
                    <div className="media-body">
                        <div className="msg-box">
                            <div>
                                <p>Anyways, I am working on something that you would like to know. This project is based on angular js and you are the keeda in it. I need you help in it.</p>
                                <span className="chat-time">11:52 PM</span>
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
                <li className="media media-attachment received">
                    <div className="avatar avatar-xs avatar-rounded">
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
                    </div>
                    <div className="media-body msg-imgs">
                        <div className="msg-box">
                            <div>
                                <Image className="d-block img-fluid" src={giphy} alt="gif" />
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
                <li className="media sent">
                    <div className="media-body">
                        <div className="msg-box">
                            <div>
                                <p>Haha, this joke is hilarious. Is it what your heart feel about the salary? 😍</p>
                                <span className="chat-time">10:52 PM</span>
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
                <li className="media received">
                    <div className="avatar avatar-xs avatar-rounded">
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
                    </div>
                    <div className="media-body">
                        <div className="msg-box">
                            <div>
                                <p>Hey Ben, just a reminder that you are coming for the meeting today in the conference. We are proposing a change in the client briefing.</p>
                                <span className="chat-time">9:20 AM</span>
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
                {
                    messages.map((elem, index) => (
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
                    ))
                }
            </ul>
            <div ref={bottomRef} />
        </SimpleBar>
    )
}

export default ChatBody;
