import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleBar from 'simplebar-react';
import classNames from 'classnames';
import * as Icons from 'react-feather';
import { Dropdown, Form, ListGroup, Badge } from 'react-bootstrap';
import { useWindowWidth } from '@react-hook/window-size';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getContacts, getConversations, markMessagesAsRead, wsClient } from '@/services/chatService';
// Keep as fallback
import defaultContacts from '@/data/chat/contact-list';

//Images
import avatar1 from '@/assets/img/avatar1.jpg';
import avatar8 from '@/assets/img/avatar8.jpg';
import avatar15 from '@/assets/img/avatar15.jpg';


const ContactList = ({ invitePeople }) => {

    const { states, dispatch } = useGlobalStateContext();
    const [list, setList] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const width = useWindowWidth();
    const [loading, setLoading] = useState(true);
    
    // Función para ordenar conversaciones con mensajes no leídos primero
    const sortConversations = useCallback((conversations) => {
        if (!conversations || !Array.isArray(conversations)) return [];
        
        console.log("Ordenando conversaciones:", conversations.map(c => ({
            id: c.id.substring(0, 8),
            unread: c.unread_count,
            unread_type: typeof c.unread_count
        })));
        
        return [...conversations].sort((a, b) => {
            // Asegurar que unread_count sea un número
            const aUnread = Number(a.unread_count || 0);
            const bUnread = Number(b.unread_count || 0);
            
            // Primero ordenar por mensajes no leídos (mayor a menor)
            if (aUnread !== bUnread) {
                return bUnread - aUnread;
            }
            // Luego por fecha de actualización (más reciente primero)
            if (a.updated_at && b.updated_at) {
                return new Date(b.updated_at) - new Date(a.updated_at);
            }
            // Si uno tiene fecha y el otro no, el que tiene fecha va primero
            if (a.updated_at && !b.updated_at) return -1;
            if (!a.updated_at && b.updated_at) return 1;
            // Si ninguno tiene fecha, mantener el orden original
            return 0;
        });
    }, []);

    // Fetch contacts on component mount
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                dispatch({ type: "fetch_contacts_request" });
                const contactsData = await getContacts();
                dispatch({ type: "fetch_contacts_success", contacts: contactsData });
                setList(contactsData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching contacts:", error);
                dispatch({ type: "fetch_contacts_failure", error: error.message });
                // Fallback to default contacts if API fails
                setList(defaultContacts);
                setLoading(false);
            }
        };
        
        fetchContacts();
    }, [dispatch]);
    
    // Verificar si hay conversaciones cargadas desde el WebSocket
    useEffect(() => {
        console.log("🔄 Verificando estado de WebSocket y conversaciones...");
        
        // Si el WebSocket está conectado pero no hay conversaciones, intentar cargarlas
        if (states.chatState.wsConnected && 
            states.chatState.contacts && 
            states.chatState.contacts.length > 0 && 
            (!states.chatState.conversations || states.chatState.conversations.length === 0)) {
            
            console.log("WebSocket conectado pero sin conversaciones, intentando cargar...");
            
            // Función para obtener todas las conversaciones para todos los contactos
            const fetchAllConversations = async () => {
                console.log("🔄 Iniciando fetchAllConversations desde ContactList...");
                try {
                    console.log("🔍 DEBUG: Estado actual de contactos:", 
                        states.chatState.contacts.map(c => ({
                            id: c.id.substring(0, 8),
                            name: c.name
                        }))
                    );
                    
                    console.log(`ContactList: Obteniendo conversaciones para todos los usuarios...`);
                    let allConversations = [];

                    // Obtener conversaciones para todos los usuarios
                    const usersToFetch = states.chatState.contacts;
                    for (const contact of usersToFetch) {
                        console.log(`Obteniendo conversaciones para usuario: ${contact.name} (ID: ${contact.id})`);
                        try {
                            const userConversations = await getConversations(contact.id);
                            if (userConversations && Array.isArray(userConversations)) {
                                console.log(`Encontradas ${userConversations.length} conversaciones para ${contact.name}`);
                                allConversations = [...allConversations, ...userConversations];
                            }
                        } catch (error) {
                            console.error(`Error al obtener conversaciones para ${contact.name}:`, error);
                        }
                    }

                    // Eliminar duplicados basados en ID de conversación
                    const uniqueConversations = Array.from(
                        new Map(allConversations.map(conv => [conv.id, conv])).values()
                    );
                    console.log(`Total de conversaciones únicas encontradas: ${uniqueConversations.length}`);

                    // Verificar que tenemos datos válidos
                    if (uniqueConversations && Array.isArray(uniqueConversations) && uniqueConversations.length > 0) {
                        // Ordenar conversaciones (no leídas primero)
                        const sortedConversations = sortConversations(uniqueConversations);
                        console.log("Enviando conversaciones ordenadas al estado global:", sortedConversations.length);
                        dispatch({ type: "fetch_conversations_success", conversations: sortedConversations });
                    } else {
                        console.log("No se encontraron conversaciones para ningún contacto");
                    }
                } catch (error) {
                    console.error("Error al obtener conversaciones:", error);
                }
            };
            
            fetchAllConversations();
        } else if (states.chatState.wsConnected && states.chatState.conversations && states.chatState.conversations.length > 0) {
            console.log(`WebSocket conectado y ${states.chatState.conversations.length} conversaciones ya cargadas`);
        } else if (!states.chatState.wsConnected) {
            console.log("WebSocket no conectado, esperando conexión...");
        }
        
    }, [dispatch, states.chatState.contacts, states.chatState.wsConnected, states.chatState.conversations, sortConversations]);
    
    // Actualizar la lista de contactos cuando cambian las conversaciones o los contactos
    useEffect(() => {
        console.log("🔄 Actualizando lista de contactos basada en conversaciones y contactos...");
        console.log(`Conversaciones: ${states.chatState.conversations?.length || 0}, Contactos: ${states.chatState.contacts?.length || 0}`);
        
        if (states.chatState.conversations && states.chatState.conversations.length > 0 && 
            states.chatState.contacts && states.chatState.contacts.length > 0) {
            
            console.log("Tenemos conversaciones y contactos, generando lista combinada...");
            
            // Crear una lista de contactos a partir de las conversaciones
            let contactsWithConversations = [];
            
            // Convertir todas las conversaciones en contactos para mostrarlos en la lista
            states.chatState.conversations.forEach(conv => {
                // Buscar si ya existe un contacto para esta conversación
                const existingContact = states.chatState.contacts.find(contact => 
                    contact.id === conv.external_id || 
                    (conv.external_id && conv.external_id.includes(contact.id))
                );
                
                if (existingContact) {
                    // Si existe un contacto, usar su información
                    contactsWithConversations.push({
                        ...existingContact,
                        unread: Number(conv.unread_count || 0),
                        lastChat: conv.last_message || "Click to start conversation",
                        time: new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        conversationId: conv.id,
                        updated_at: conv.updated_at
                    });
                } else {
                    // Si no existe un contacto, crear uno virtual
                    contactsWithConversations.push({
                        id: conv.external_id || `virtual-${conv.id}`,
                        name: `Usuario ${conv.external_id || conv.id.substring(0, 8)}`,
                        unread: Number(conv.unread_count || 0),
                        lastChat: conv.last_message || "Click to start conversation",
                        time: new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        conversationId: conv.id,
                        updated_at: conv.updated_at,
                        // Usar un avatar genérico
                        initAvatar: {
                            variant: 'soft-primary',
                            title: (conv.external_id || 'U').charAt(0).toUpperCase()
                        }
                    });
                }
            });
            
            console.log(`Generados ${contactsWithConversations.length} contactos con conversaciones`);
                
            // Ordenar todos los contactos (incluyendo los virtuales)
            const sortedContacts = [...contactsWithConversations].sort((a, b) => {
                // Primero ordenar por mensajes no leídos (mayor a menor)
                if ((a.unread || 0) !== (b.unread || 0)) {
                    return (b.unread || 0) - (a.unread || 0);
                }
                // Luego por fecha de actualización (más reciente primero)
                if (a.updated_at && b.updated_at) {
                    return new Date(b.updated_at) - new Date(a.updated_at);
                }
                // Si uno tiene fecha y el otro no, el que tiene fecha va primero
                if (a.updated_at && !b.updated_at) return -1;
                if (!a.updated_at && b.updated_at) return 1;
                // Si ninguno tiene fecha, mantener el orden original
                return 0;
            });
            
            // Verificar si hay cambios en la lista antes de actualizarla
            const currentListStr = JSON.stringify(list.map(item => ({
                id: item.id,
                conversationId: item.conversationId,
                unread: item.unread,
                updated_at: item.updated_at
            })));
            
            const newListStr = JSON.stringify(sortedContacts.map(item => ({
                id: item.id,
                conversationId: item.conversationId,
                unread: item.unread,
                updated_at: item.updated_at
            })));
            
            const hasChanges = currentListStr !== newListStr;
            
            if (hasChanges) {
                console.log("📋 Actualizando lista de contactos con datos actualizados");
                console.log(`Lista anterior: ${list.length} contactos, Nueva lista: ${sortedContacts.length} contactos`);
                // Actualizar la lista con los contactos ordenados
                setList([...sortedContacts]);
            } else {
                console.log("No hay cambios en la lista de contactos, omitiendo actualización");
            }
        } else if (states.chatState.contacts && states.chatState.contacts.length > 0 && list.length === 0) {
            // Si no hay conversaciones pero hay contactos, mostrar los contactos sin conversaciones
            console.log("No hay conversaciones pero sí contactos, mostrando contactos sin conversaciones");
            setList(states.chatState.contacts);
        }
    }, [states.chatState.conversations, states.chatState.contacts, list]);

    const Conversation = async (index, id) => {
        console.log(`Seleccionando conversación para contacto ID: ${id}, índice: ${index}`);
        
        // Set the selected user
        if (list[index].avatar) {
            dispatch({ 
                type: "set_user", 
                userId: list[index].id, 
                avatar: list[index].avatar, 
                userName: list[index].name, 
                status: list[index].status 
            });
        } else {
            dispatch({ 
                type: "set_user", 
                userId: list[index].id, 
                avatar: list[index].initAvatar, 
                userName: list[index].name, 
                status: list[index].status 
            });
        }

        // Usar directamente el conversationId si existe
        if (list[index].conversationId) {
            console.log(`Usando conversationId: ${list[index].conversationId}`);
            dispatch({ 
                type: "set_current_conversation", 
                conversationId: list[index].conversationId 
            });
            
            // Marcar mensajes como leídos si hay mensajes no leídos
            if (list[index].unread > 0) {
                try {
                    console.log(`Marcando mensajes como leídos para conversación: ${list[index].conversationId}`);
                    await markMessagesAsRead(list[index].conversationId);
                    
                    // Actualizar la UI optimistamente
                    const updatedContacts = list.map((contactList, idx) =>
                        idx === index ? { ...contactList, unread: 0 } : contactList
                    );
                    
                    // Ordenar la lista actualizada
                    const sortedUpdatedContacts = [...updatedContacts].sort((a, b) => {
                        // Asegurar que unread sea un número
                        const aUnread = Number(a.unread || 0);
                        const bUnread = Number(b.unread || 0);
                        
                        console.log(`Ordenando contactos actualizados: ${a.name} (unread: ${aUnread}) vs ${b.name} (unread: ${bUnread})`);
                        
                        // Primero ordenar por mensajes no leídos (mayor a menor)
                        if (aUnread !== bUnread) {
                            return bUnread - aUnread;
                        }
                        // Luego por fecha de actualización (más reciente primero)
                        if (a.updated_at && b.updated_at) {
                            return new Date(b.updated_at) - new Date(a.updated_at);
                        }
                        // Si uno tiene fecha y el otro no, el que tiene fecha va primero
                        if (a.updated_at && !b.updated_at) return -1;
                        if (!a.updated_at && b.updated_at) return 1;
                        // Si ninguno tiene fecha, mantener el orden original
                        return 0;
                    });
                    
                    // Forzar actualización de la lista con los contactos ordenados
                    setList([...sortedUpdatedContacts]);
                    
                    // Actualizar el estado global
                    const conversation = states.chatState.conversations.find(
                        conv => conv.id === list[index].conversationId
                    );
                    
                    if (conversation) {
                        dispatch({
                            type: "update_conversation",
                            conversation: {
                                ...conversation,
                                unread_count: 0
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error al marcar mensajes como leídos:", error);
                }
            }
        }

        // Handle mobile view
        if (width <= 991) {
            dispatch({ type: "start_chat" });
            dispatch({ type: "top_nav_toggle" });
        }
    }

    const searchOnChange = (event) => {
        setSearchValue(event.target.value);
        // Create copy of item list from state.contacts or fallback to defaultContacts
        const contactsToSearch = states.chatState.contacts.length > 0 ? states.chatState.contacts : defaultContacts;
        var updatedList = [...contactsToSearch];
        // Include all elements which includes the search query
        updatedList = updatedList.filter((item) => 
            searchValue.length > 1 
                ? item.name.toString().toLowerCase().includes(event.target.value.toLowerCase()) 
                : item
        );
        // Trigger render with updated values
        setList(updatedList);
    }

    return (
        <>
            <div className="chatapp-aside">
                <header className="aside-header">
                    <Dropdown>
                        <Dropdown.Toggle as="a" className="chatapp-title link-dark" href="#" >
                            <h1>Chat</h1>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item as={Link} href="chats">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.MessageSquare />
                                </span>
                                <span>Chats</span>
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} href="contact">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Book />
                                </span>
                                <span>Contacts</span>
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} href="groups">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.User />
                                </span>
                                <span>Groups</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="#">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Archive />
                                </span>
                                <span>Archived</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="#">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Star />
                                </span>
                                <span>Favorites</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <div className="d-flex">
                        <Dropdown>
                            <Dropdown.Toggle as="a" href="#" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret me-1">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.Settings />
                                    </span>
                                </span>
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end" >
                                <Dropdown.Item href="#">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.UserCheck />
                                    </span>
                                    <span>Active Contacts</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.MessageSquare />
                                    </span>
                                    <span>Chat Requests</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.Archive />
                                    </span>
                                    <span>Archived Chats</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.ToggleRight />
                                    </span>
                                    <span>Unread Chats</span>
                                </Dropdown.Item>
                                <Dropdown.Divider as="div" />
                                <Dropdown.Item href="#">Settings</Dropdown.Item>
                                <Dropdown.Item href="#">Help</Dropdown.Item>
                                <Dropdown.Item href="#">Report a problem	</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        <a className="btn btn-icon btn-rounded btn-primary" onClick={invitePeople} >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Icons.Plus />
                                </span>
                            </span>
                        </a>
                    </div>
                </header>
                <SimpleBar style={{ height: "100%" }} className="aside-body" >
                    <Form className="aside-search" role="search">
                        <Form.Control type="text" placeholder="Search Chats" value={searchValue} onChange={searchOnChange} />
                    </Form>
                    <div className="frequent-contact">
                        <div className="title-sm text-primary"><span>Frequent contact</span></div>
                        <ul className="hk-list">
                            <li>
                                <div className="avatar avatar-sm avatar-primary position-relative avatar-rounded">
                                    <span className="initial-wrap">H</span>
                                    <div className="badge-icon badge-circle badge-icon-xxs text-white position-bottom-end-overflow-1">
                                        <div className="badge-icon-wrap">
                                            <i className="ri-group-fill text-light" />
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127">
                                            <g data-name="Ellipse 302" transform="translate(8 8)" strokeWidth={3}>
                                                <circle cx="55.5" cy="55.5" r="55.5" stroke="currentColor" />
                                                <circle cx="55.5" cy="55.5" r="59.5" fill="currentColor" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-primary position-relative avatar-rounded">
                                    <Image src={avatar1} alt="user" className="avatar-img" />
                                    <div className="badge-icon badge-circle badge-icon-xxs text-white position-bottom-end-overflow-1">
                                        <div className="badge-icon-wrap">
                                            <i className="ri-group-fill text-light" />
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127">
                                            <g data-name="Ellipse 302" transform="translate(8 8)" strokeWidth={3}>
                                                <circle cx="55.5" cy="55.5" r="55.5" stroke="currentColor" />
                                                <circle cx="55.5" cy="55.5" r="59.5" fill="currentColor" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-soft-danger avatar-rounded position-relative">
                                    <span className="initial-wrap">W</span>
                                    <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-rounded position-relative">
                                    <Image src={avatar8} alt="user" className="avatar-img" />
                                    <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-rounded">
                                    <Image src={avatar15} alt="user" className="avatar-img" />
                                </div>
                            </li>
                        </ul>
                    </div>
                    <ListGroup variant="flush" className="chat-contacts-list">
                        {
                            list.map((elem, index) => (
                                <ListGroup.Item 
                                    onClick={() => Conversation(index, elem.id)} 
                                    key={index}
                                    className={classNames({"unread-highlight": elem.unread > 0})}
                                    style={elem.unread > 0 ? {
                                        backgroundColor: "rgba(0, 123, 255, 0.15)", 
                                        borderLeft: "3px solid #007bff",
                                        fontWeight: "bold"
                                    } : {}}
                                    data-unread={elem.unread > 0 ? 'true' : 'false'}
                                >
                                    <div className={classNames("media", { "active-user": elem.id === states.chatState.userId }, { "read-chat": !elem.unread })}>
                                        <div className="media-head">
                                            {elem.avatar && elem.avatar.src && <div className="avatar avatar-sm avatar-rounded position-relative">
                                                <Image 
                                                    src={elem.avatar.src} 
                                                    alt="user" 
                                                    className="avatar-img"
                                                    width={40}
                                                    height={40}
                                                />
                                                {elem.status === "online" && <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />}
                                            </div>}
                                            {elem.initAvatar && <div className={`avatar avatar-sm avatar-${elem.initAvatar.variant} avatar-rounded`}>
                                                <span className="initial-wrap">{elem.initAvatar.title}</span>
                                            </div>}
                                            {!elem.avatar?.src && !elem.initAvatar && <div className="avatar avatar-sm avatar-soft-primary avatar-rounded">
                                                <span className="initial-wrap">{elem.name ? elem.name.charAt(0) : 'U'}</span>
                                            </div>}
                                        </div>
                                        <div className="media-body">
                                            <div>
                                                <div className="user-name">
                                                    {elem.name}
                                                    {elem.unread > 0 && (
                                                        <Badge 
                                                            bg="danger" 
                                                            className="ms-1" 
                                                            style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}
                                                        >
                                                            Nuevo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="user-last-chat">{elem.lastChat}</div>
                                            </div>
                                            <div>
                                                <div className="last-chat-time">{elem.time}</div>
                                                {elem.unread > 0 && <div className="badge badge-primary badge-sm badge-pill">{elem.unread}</div>}
                                                <div className="dropdown action-drp">
                                                    <a href="#" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                                    <div className="dropdown-menu dropdown-menu-end">
                                                        <a className="dropdown-item" href="#">Mute Chat</a>
                                                        <a className="dropdown-item" href="#">Archive Chat</a>
                                                        <a className="dropdown-item" href="#">Delete Chat</a>
                                                        <a className="dropdown-item link-danger" href="#">Block</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))
                        }
                    </ListGroup>
                </SimpleBar>
            </div>
        </>
    )
}

export default ContactList;
