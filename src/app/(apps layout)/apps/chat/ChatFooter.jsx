import HkAlert from '@/components/@hk-alert/@hk-alert';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { useState } from 'react';
import { Button, Dropdown, Form, InputGroup } from 'react-bootstrap';
import { ArrowRight, Share, Smile } from 'react-feather';
import { sendMessage as sendMessageApi } from '@/services/chatService';

const ChatFooter = () => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const { states, dispatch } = useGlobalStateContext();

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
                alert("Please select a conversation first!");
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
                
                // For demo purposes - simulate a response
                // In a real app, this would come from a websocket or polling
                setTimeout(() => {
                    const responseMsg = { 
                        text: "Thanks for your message! I'll get back to you soon.", 
                        time: new Date().toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }), 
                        types: "received" 
                    };
                    dispatch({ type: "send_msg", msg: responseMsg });
                }, 2000);
            } catch (error) {
                console.error("Error sending message:", error);
                dispatch({ type: "send_message_failure", error: error.message });
                setSending(false);
                alert("Failed to send message. Please try again.");
            }
        } else {
            alert("Please type something!");
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
            <InputGroup>
                <span className="input-affix-wrapper">
                    <Form.Control type="text" id="input_msg_send_chatapp" name="send-msg" className="input-msg-send rounded-input" placeholder="Type your message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={onKeyDown} /> {/*onKeyDown={onKeyDown} */}
                    <span className="input-suffix">
                        <Button variant="flush-primary" className="btn-icon btn-rounded btn-send">
                            <span className="icon" onClick={handleClick} >  {/* onClick={handleClick} */}
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
