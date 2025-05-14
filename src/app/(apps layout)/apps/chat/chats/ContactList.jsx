import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleBar from 'simplebar-react';
import classNames from 'classnames';
import * as Icons from 'react-feather';
import { Dropdown, Form, ListGroup, Badge } from 'react-bootstrap';
import { useWindowWidth } from '@react-hook/window-size';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getContacts, getConversations, markMessagesAsRead } from '@/services/chatService';
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
    
    // Polling para actualizar conversaciones periódicamente
    useEffect(() => {
        // Función para obtener todas las conversaciones para todos los contactos
        const fetchAllConversations = async () => {
            console.log("🔄 Iniciando fetchAllConversations...");
            try {
                // Si tenemos contactos, obtener conversaciones para cada uno
                if (states.chatState.contacts && states.chatState.contacts.length > 0) {
                    // Usar el primer contacto como usuario principal para obtener todas las conversaciones
                    // Esto es temporal, idealmente deberíamos tener un endpoint que devuelva todas las conversaciones
                    const mainUserId = states.chatState.contacts[0].id;
                    console.log(`ContactList: Fetching all conversations using user ID: ${mainUserId}`);
                    console.log(`Estado actual - Contactos: ${states.chatState.contacts.length}, Conversaciones: ${states.chatState.conversations.length}`);
                    
                    const conversations = await getConversations(mainUserId);
                    
                    // Verificar que tenemos datos válidos
                    if (conversations && Array.isArray(conversations)) {
                        console.log(`ContactList: Received ${conversations.length} conversations before sorting`);
                        
                        // Verificar los datos de unread_count antes de ordenar
                        conversations.forEach(conv => {
                            console.log(`Conversation ${conv.id.substring(0, 8)}: unread_count=${conv.unread_count} (${typeof conv.unread_count})`);
                        });
                        
                        // Ordenar conversaciones (no leídas primero)
                        const sortedConversations = sortConversations(conversations);
                        
                        console.log("ContactList: Actualizando conversaciones ordenadas:", 
                            sortedConversations.map(c => ({
                                id: c.id.substring(0, 8),
                                unread: c.unread_count,
                                updated: new Date(c.updated_at).toLocaleTimeString()
                            }))
                        );
                        
                        dispatch({ type: "fetch_conversations_success", conversations: sortedConversations });
                        
                        // Actualizar la lista de contactos con información de conversaciones
                        if (states.chatState.contacts && states.chatState.contacts.length > 0) {
                            // Primero crear un mapa de contactos con sus conversaciones
                            const contactsWithConversations = states.chatState.contacts.map(contact => {
                                // Agregar logs para depuración
                                console.log(`Buscando conversación para contacto: ${contact.name} (ID: ${contact.id})`);
                                console.log(`Conversaciones disponibles:`, sortedConversations.map(c => ({id: c.id.substring(0,8), external_id: c.external_id})));

                                // Buscar si hay una conversación para este contacto
                                // Primero intentar buscar por external_id exacto
                                let conversation = sortedConversations.find(
                                    conv => conv.external_id === contact.id
                                );
                                
                                // Si no se encuentra, intentar buscar por external_id que contenga el ID del contacto
                                // Esto es útil para conversaciones web donde el external_id puede ser "web-timestamp"
                                if (!conversation) {
                                    conversation = sortedConversations.find(
                                        conv => conv.external_id.includes(contact.id)
                                    );
                                }
                                
                                // Si aún no se encuentra, intentar buscar por nombre de usuario en external_id
                                // Esto es útil para conversaciones donde el external_id es un número de teléfono
                                if (!conversation) {
                                    // Extraer el número de teléfono del nombre si existe (formato: "Usuario XXXXXXXXXX")
                                    const phoneMatch = contact.name.match(/Usuario\s+(\d+)/);
                                    if (phoneMatch && phoneMatch[1]) {
                                        const phoneNumber = phoneMatch[1];
                                        console.log(`Intentando buscar por número de teléfono: ${phoneNumber}`);
                                        conversation = sortedConversations.find(
                                            conv => conv.external_id === phoneNumber
                                        );
                                    }
                                }

                                if (conversation) {
                                    console.log(`✅ Encontrada conversación para ${contact.name}: ${conversation.id} (unread: ${conversation.unread_count})`);
                                    // Asegurar que unread_count sea un número
                                    const unreadCount = Number(conversation.unread_count || 0);
                                    console.log("Contacto con conversación:", contact.id, "unread:", unreadCount, "external_id:", conversation.external_id);
                                    return {
                                        ...contact,
                                        unread: unreadCount,
                                        lastChat: conversation.last_message || "Click to start conversation",
                                        time: new Date(conversation.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                                        conversationId: conversation.id,
                                        updated_at: conversation.updated_at
                                    };
                                }
                                return {
                                    ...contact,
                                    unread: 0,
                                    lastChat: "Click to start conversation",
                                    time: "",
                                    updated_at: null
                                };
                            });
                            
                            // Ahora ordenar la lista de contactos: primero los que tienen mensajes no leídos,
                            // luego por fecha de actualización más reciente
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
                            const hasChanges = JSON.stringify(sortedContacts) !== JSON.stringify(list);
                            console.log(`¿Hay cambios en la lista de contactos? ${hasChanges ? 'SÍ' : 'NO'}`);
                            if (hasChanges) {
                                console.log("📋 Actualizando lista de contactos:", 
                                    sortedContacts.map(c => ({
                                        name: c.name,
                                        unread: c.unread,
                                        updated: c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : 'N/A'
                                    }))
                                );
                                // Actualizar la lista con los contactos ordenados
                                setList([...sortedContacts]);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error en polling de conversaciones:", error);
            }
        };
        
        // Ejecutar inmediatamente y luego cada 3 segundos
        fetchAllConversations();
        const intervalId = setInterval(fetchAllConversations, 3000);
        
        return () => {
            clearInterval(intervalId);
        };
    }, [dispatch, states.chatState.contacts, sortConversations]);

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

        // Si el contacto ya tiene un ID de conversación almacenado, usarlo directamente
        if (list[index].conversationId) {
            console.log(`Usando conversationId almacenado: ${list[index].conversationId}`);
            dispatch({ 
                type: "set_current_conversation", 
                conversationId: list[index].conversationId 
            });
            
            // Buscar la conversación en el estado global
            const conversation = states.chatState.conversations.find(
                conv => conv.id === list[index].conversationId
            );
            
            if (conversation && conversation.unread_count > 0) {
                try {
                    console.log(`Marcando mensajes como leídos para conversación: ${conversation.id}`);
                    await markMessagesAsRead(conversation.id);
                    
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
                    dispatch({
                        type: "update_conversation",
                        conversation: {
                            ...conversation,
                            unread_count: 0
                        }
                    });
                } catch (error) {
                    console.error("Error al marcar mensajes como leídos:", error);
                }
            }
        } else {
            // Buscar la conversación correspondiente por external_id
            const conversation = states.chatState.conversations.find(
                conv => conv.external_id === id
            );
            
            if (conversation) {
                console.log(`Encontrada conversación por external_id: ${conversation.id}`);
                // Establecer la conversación actual
                dispatch({ 
                    type: "set_current_conversation", 
                    conversationId: conversation.id 
                });
                
                // Actualizar el contacto con el ID de conversación para futuras referencias
                const updatedContacts = list.map((contactList, idx) =>
                    idx === index ? { ...contactList, conversationId: conversation.id } : contactList
                );
                setList(updatedContacts);
                
                // Si hay mensajes no leídos, marcarlos como leídos
                if (conversation.unread_count > 0) {
                    try {
                        console.log(`Marcando mensajes como leídos para conversación: ${conversation.id}`);
                        await markMessagesAsRead(conversation.id);
                        
                        // Actualizar la UI optimistamente
                        const updatedContactsWithRead = updatedContacts.map((contactList, idx) =>
                            idx === index ? { ...contactList, unread: 0 } : contactList
                        );
                        
                        // Ordenar la lista actualizada
                        const sortedUpdatedContacts = [...updatedContactsWithRead].sort((a, b) => {
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
                        dispatch({
                            type: "update_conversation",
                            conversation: {
                                ...conversation,
                                unread_count: 0
                            }
                        });
                    } catch (error) {
                        console.error("Error al marcar mensajes como leídos:", error);
                    }
                }
            } else {
                console.log(`No se encontró conversación para el contacto ID: ${id}`);
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
