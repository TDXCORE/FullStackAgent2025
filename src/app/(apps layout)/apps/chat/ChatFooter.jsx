import HkAlert from '@/components/@hk-alert/@hk-alert';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { useState, useEffect } from 'react';
import { Button, Dropdown, Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ArrowRight, Share, Smile, Terminal } from 'react-feather';
import { sendMessage as sendMessageApi, toggleAgent } from '@/services/chatService';

const ChatFooter = () => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [agentEnabled, setAgentEnabled] = useState(true);
    const [toggleLoading, setToggleLoading] = useState(false);
    const { states, dispatch } = useGlobalStateContext();
    
    // Inicializar el estado del agente desde el estado global
    useEffect(() => {
        if (states.chatState.conversations && states.chatState.currentConversationId) {
            const currentConversation = states.chatState.conversations.find(
                conv => conv.id === states.chatState.currentConversationId
            );
            if (currentConversation) {
                setAgentEnabled(currentConversation.agent_enabled !== false);
            }
        }
    }, [states.chatState.conversations, states.chatState.currentConversationId]);
    
    // Función para activar/desactivar el agente
    const handleToggleAgent = async () => {
        if (!states.chatState.currentConversationId) {
            alert("Por favor, selecciona una conversación primero.");
            return;
        }
        
        try {
            setToggleLoading(true);
            const newState = !agentEnabled;
            
            // Actualizar optimistamente la UI
            setAgentEnabled(newState);
            
            // Llamar a la API para actualizar el estado del agente
            const result = await toggleAgent(states.chatState.currentConversationId, newState);
            
            // Actualizar el estado global
            dispatch({ 
                type: "toggle_agent", 
                enabled: newState,
                conversationId: states.chatState.currentConversationId
            });
            
            console.log(`Agente ${newState ? 'activado' : 'desactivado'} correctamente:`, result);
            setToggleLoading(false);
        } catch (error) {
            console.error("Error al cambiar el estado del agente:", error);
            // Revertir el cambio en caso de error
            setAgentEnabled(!agentEnabled);
            setToggleLoading(false);
            alert("Error al cambiar el estado del agente. Por favor, inténtalo de nuevo.");
        }
    };

    //Get current system time
    const current = new Date();
    const msgTime = current.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    //Send a new message
    const sendMessage = async () => {
        if (message.length > 0) {
            if (!states.chatState.currentConversationId) {
                alert("Por favor, selecciona una conversación primero.");
                return;
            }

            try {
                setSending(true);
                dispatch({ type: "send_message_request" });
                
                // Optimistically update UI
                const tempMsg = { 
                    id: Date.now().toString(), 
                    text: message, 
                    time: msgTime, 
                    types: "sent" 
                };
                dispatch({ type: "send_msg", msg: tempMsg });
                
                // Send to API
                const sentMessage = await sendMessageApi(
                    states.chatState.currentConversationId,
                    message
                );
                
                dispatch({ type: "send_message_success", message: sentMessage });
                setSending(false);
                
                // Ya no necesitamos simular una respuesta, el polling se encargará de obtener
                // las respuestas reales del agente si está habilitado
            } catch (error) {
                console.error("Error sending message:", error);
                dispatch({ type: "send_message_failure", error: error.message });
                setSending(false);
                alert("Error al enviar el mensaje. Por favor, inténtalo de nuevo.");
            }
        } else {
            alert("Por favor, escribe algo!");
        }
    }
    const handleClick = () => {
        sendMessage();
        setMessage("");
    }
    const onKeyDown = (e) => {
        if (e.keyCode === 13) {
            sendMessage();
            setMessage("");
        }
    }


    return (
        <footer className="chat-footer">
            <div className="d-flex">
                <Dropdown>
                    <Dropdown.Toggle variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover no-caret flex-shrink-0">
                        <span className="icon">
                            <span className="feather-icon">
                                <Share />
                            </span>
                        </span>
                    </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item>
                        <div className="d-flex align-items-center">
                            <div className="avatar avatar-icon avatar-xs avatar-soft-primary avatar-rounded me-3">
                                <span className="initial-wrap">
                                    <i className="ri-image-line" />
                                </span>
                            </div>
                            <div>
                                <span className="h6 mb-0">Photo or Video Library</span>
                            </div>
                        </div>
                    </Dropdown.Item>
                    <Dropdown.Item>
                        <div className="d-flex align-items-center">
                            <div className="avatar avatar-icon avatar-xs avatar-soft-info avatar-rounded me-3">
                                <span className="initial-wrap">
                                    <i className="ri-file-4-line" />
                                </span>
                            </div>
                            <div>
                                <span className="h6 mb-0">Documents</span>
                            </div>
                        </div>
                    </Dropdown.Item>
                    <Dropdown.Item>
                        <div className="d-flex align-items-center">
                            <div className="avatar avatar-icon avatar-xs avatar-soft-success avatar-rounded me-3">
                                <span className="initial-wrap">
                                    <i className="ri-map-pin-line" />
                                </span>
                            </div>
                            <div>
                                <span className="h6 mb-0">Location</span>
                            </div>
                        </div>
                    </Dropdown.Item>
                    <Dropdown.Item>
                        <div className="d-flex align-items-center">
                            <div className="avatar avatar-icon avatar-xs avatar-soft-blue avatar-rounded me-3">
                                <span className="initial-wrap">
                                    <i className="ri-contacts-line" />
                                </span>
                            </div>
                            <div>
                                <span className="h6 mb-0">Contact</span>
                            </div>
                        </div>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id="agent-tooltip">
                            {agentEnabled ? "Desactivar agente" : "Activar agente"}
                        </Tooltip>
                    }
                >
                    <Button 
                        variant={agentEnabled ? "primary" : "outline-secondary"} 
                        className="btn-icon btn-rounded ms-2"
                        onClick={handleToggleAgent}
                        disabled={toggleLoading}
                    >
                        <span className="icon">
                            <span className="feather-icon">
                                <Terminal />
                            </span>
                        </span>
                    </Button>
                </OverlayTrigger>
            </div>

            <InputGroup>
                <span className="input-affix-wrapper">
                    <Form.Control 
                        type="text" 
                        id="input_msg_send_chatapp" 
                        name="send-msg" 
                        className="input-msg-send rounded-input" 
                        placeholder={agentEnabled ? "Escribe tu mensaje al agente..." : "Escribe tu mensaje..."} 
                        value={message} 
                        onChange={e => setMessage(e.target.value)} 
                        onKeyDown={onKeyDown} 
                        disabled={sending}
                    />
                    <span className="input-suffix">
                        <Button 
                            variant="flush-primary" 
                            className="btn-icon btn-rounded btn-send"
                            disabled={sending}
                        >
                            <span className="icon" onClick={handleClick}>
                                <span className="feather-icon">
                                    <ArrowRight />
                                </span>
                            </span>
                        </Button>
                    </span>
                </span>
            </InputGroup>
            <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                <span className="icon">
                    <span className="feather-icon">
                        <Smile />
                    </span>
                </span>
            </Button>
        </footer>
    )
}

export default ChatFooter;
