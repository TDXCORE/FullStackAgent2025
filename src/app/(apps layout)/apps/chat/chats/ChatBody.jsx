import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, Dropdown } from 'react-bootstrap';
import { ArrowDown, CornerUpRight, MoreHorizontal } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getMessages } from '@/services/chatService';

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
                    setLoading(true);
                    dispatch({ type: "fetch_messages_request" });
                    const messagesData = await getMessages(states.chatState.currentConversationId);
                    dispatch({ type: "fetch_messages_success", messages: messagesData });
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching messages:", error);
                    dispatch({ type: "fetch_messages_failure", error: error.message });
                    setLoading(false);
                }
            }
        };
        
        fetchMessages();
    }, [states.chatState.currentConversationId, dispatch]);

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
                        {states.chatState.avatar.type === "img" && <Image src={states.chatState.avatar.src} alt="user" className="avatar-img" />}
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
                        {states.chatState.avatar.type === "img" && <Image src={states.chatState.avatar.src} alt="user" className="avatar-img" />}
                        {states.chatState.avatar.type === "init" && <div className={`avatar avatar-xs avatar-${states.chatState.avatar.variant} avatar-rounded`}>
                            <span className="initial-wrap">{states.chatState.avatar.title}</span>
                        </div>}
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
                        {states.chatState.avatar.type === "img" && <Image src={states.chatState.avatar.src} alt="user" className="avatar-img" />}
                        {states.chatState.avatar.type === "init" && <div className={`avatar avatar-xs avatar-${states.chatState.avatar.variant} avatar-rounded`}>
                            <span className="initial-wrap">{states.chatState.avatar.title}</span>
                        </div>}
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
                        {states.chatState.avatar.type === "img" && <Image src={states.chatState.avatar.src} alt="user" className="avatar-img" />}
                        {states.chatState.avatar.type === "init" && <div className={`avatar avatar-xs avatar-${states.chatState.avatar.variant} avatar-rounded`}>
                            <span className="initial-wrap">{states.chatState.avatar.title}</span>
                        </div>}
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
                                {states.chatState.avatar.type === "img" && <Image src={states.chatState.avatar.src} alt="user" className="avatar-img" />}
                                {states.chatState.avatar.type === "init" && <div className={`avatar avatar-xs avatar-${states.chatState.avatar.variant} avatar-rounded`}>
                                    <span className="initial-wrap">{states.chatState.avatar.title}</span>
                                </div>}
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
