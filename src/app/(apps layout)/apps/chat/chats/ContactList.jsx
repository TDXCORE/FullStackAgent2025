import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleBar from 'simplebar-react';
import classNames from 'classnames';
import * as Icons from 'react-feather';
import { Dropdown, Form, ListGroup, Badge } from 'react-bootstrap';
import { useWindowWidth } from '@react-hook/window-size';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { getContacts, getConversations, markMessagesAsRead, wsClient } from '@/services/chatService';
// No longer using fallback data
// import defaultContacts from '@/data/chat/contact-list';

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
                
                // Ensure WebSocket is connected before fetching contacts
                if (!wsClient.isConnected) {
                    console.log("WebSocket no conectado, conectando antes de obtener contactos...");
                    try {
                        await wsClient.connect();
                        console.log("WebSocket conectado exitosamente");
                    } catch (connectError) {
                        console.error("Error al conectar WebSocket:", connectError);
                        // Don't throw here, try to fetch contacts anyway
                    }
                }
                
                console.log("Obteniendo contactos desde el servidor...");
                const contactsData = await getContacts();
                console.log(`Contactos obtenidos: ${contactsData.length}`, contactsData);
                
                dispatch({ type: "fetch_contacts_success", contacts: contactsData });
                setList(contactsData); // Inicializa 'list' aquí, será la base para 'processedAndSortedList'
                setLoading(false);
            } catch (error) {
                console.error("Error fetching contacts:", error);
                dispatch({ type: "fetch_contacts_failure", error: error.message });
                setLoading(false);
                setList([]);
                if (!wsClient.isConnected) {
                    console.log("Intentando reconectar WebSocket después de error...");
                    wsClient.connect().catch(e => console.error("Error al reconectar:", e));
                }
            }
        };
        
        fetchContacts();
    }, [dispatch]);
    
    // Load all conversations once when contacts are available and WebSocket is connected
    useEffect(() => {
        console.log("🔄 Verificando estado de WebSocket y conversaciones...");
        if (states.chatState.wsConnected && 
            states.chatState.contacts && 
            states.chatState.contacts.length > 0 && 
            (!states.chatState.conversations || states.chatState.conversations.length === 0)) {
            
            console.log("WebSocket conectado pero sin conversaciones, cargando TODAS las conversaciones...");
            const fetchAllConversations = async () => {
                console.log("🔄 Iniciando fetchAllConversations desde ContactList...");
                try {
                    dispatch({ type: "fetch_conversations_request" });
                    
                    // Fetch all conversations from the server (not filtered by user)
                    // This should be a general endpoint that returns all conversations
                    let allConversations = [];
                    
                    // Try to get conversations for each contact, but don't filter the global state
                    const usersToFetch = states.chatState.contacts;
                    for (const contact of usersToFetch) {
                        try {
                            const userConversations = await getConversations(contact.id);
                            if (userConversations && Array.isArray(userConversations)) {
                                allConversations = [...allConversations, ...userConversations];
                            }
                        } catch (error) {
                            console.error(`Error al obtener conversaciones para ${contact.name}:`, error);
                        }
                    }
                    
                    // Remove duplicates and normalize
                    const uniqueConversations = Array.from(new Map(allConversations.map(conv => [conv.id, conv])).values());
                    if (uniqueConversations && uniqueConversations.length > 0) {
                        const normalizedConversations = uniqueConversations.map(conv => ({
                            ...conv,
                            unread_count: Number(conv.unread_count || 0)
                        }));
                        
                        // Sort by date and unread status
                        const sortedConversations = normalizedConversations.sort((a, b) => {
                            // First sort by unread messages (higher first)
                            const aUnread = Number(a.unread_count || 0);
                            const bUnread = Number(b.unread_count || 0);
                            if (aUnread !== bUnread) {
                                return bUnread - aUnread;
                            }
                            // Then by update date (most recent first)
                            if (a.updated_at && b.updated_at) {
                                return new Date(b.updated_at) - new Date(a.updated_at);
                            }
                            return 0;
                        });
                        
                        console.log(`🔄 Cargadas ${sortedConversations.length} conversaciones ordenadas`);
                        dispatch({ type: "fetch_conversations_success", conversations: sortedConversations });
                    } else {
                        console.log("No se encontraron conversaciones para ningún contacto");
                        dispatch({ type: "fetch_conversations_success", conversations: [] });
                    }
                } catch (error) {
                    console.error("Error al obtener conversaciones:", error);
                    dispatch({ type: "fetch_conversations_failure", error: error.message });
                }
            };
            fetchAllConversations();
        } else if (states.chatState.wsConnected && states.chatState.conversations && states.chatState.conversations.length > 0) {
            console.log(`WebSocket conectado y ${states.chatState.conversations.length} conversaciones ya cargadas`);
        } else if (!states.chatState.wsConnected) {
            console.log("WebSocket no conectado, esperando conexión...");
        }
    }, [dispatch, states.chatState.contacts, states.chatState.wsConnected, states.chatState.conversations]);
    
    const processedAndSortedList = useMemo(() => {
        console.log("🔄 (useMemo) Recalculando lista de contactos procesada y ordenada...");
        const { conversations, contacts } = states.chatState;

        // Debug: Mostrar datos disponibles
        console.log("📊 DEBUG - Datos disponibles:");
        console.log(`📊 Contactos: ${contacts?.length || 0}`, contacts?.slice(0, 2));
        console.log(`📊 Conversaciones: ${conversations?.length || 0}`, conversations?.slice(0, 2));

        if (conversations && conversations.length > 0 && contacts && contacts.length > 0) {
            console.log("🔗 Iniciando vinculación de contactos con conversaciones...");
            let contactsWithConversations = [];
            
            // Crear un mapa de contactos por teléfono para búsqueda más eficiente
            const contactsByPhone = new Map();
            contacts.forEach(contact => {
                // Intentar extraer el teléfono del contacto
                const phone = contact.phone || contact.id; // Usar phone si existe, sino usar id
                contactsByPhone.set(phone, contact);
                console.log(`📞 Mapeando contacto: ${contact.name} -> ${phone}`);
            });

            conversations.forEach(conv => {
                console.log(`🔍 Procesando conversación: ${conv.id.substring(0, 8)}, external_id: ${conv.external_id}`);
                
                // Buscar contacto por external_id (que debería ser el teléfono)
                let existingContact = contactsByPhone.get(conv.external_id);
                
                // Si no se encuentra, intentar buscar por coincidencia parcial
                if (!existingContact) {
                    console.log(`🔍 No se encontró contacto directo para ${conv.external_id}, buscando coincidencias...`);
                    existingContact = contacts.find(contact => {
                        // Buscar por ID, teléfono, o coincidencia parcial
                        return contact.id === conv.external_id || 
                               contact.phone === conv.external_id ||
                               (contact.phone && conv.external_id && contact.phone.includes(conv.external_id)) ||
                               (contact.phone && conv.external_id && conv.external_id.includes(contact.phone));
                    });
                }
                
                if (existingContact) {
                    console.log(`✅ Contacto encontrado: ${existingContact.name} vinculado con conversación ${conv.id.substring(0, 8)}`);
                    contactsWithConversations.push({
                        ...existingContact,
                        unread: Number(conv.unread_count || 0),
                        lastChat: conv.last_message || "Click to start conversation",
                        time: new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        conversationId: conv.id,
                        updated_at: conv.updated_at
                    });
                } else {
                    console.log(`⚠️ No se encontró contacto para conversación ${conv.id.substring(0, 8)}, creando contacto virtual`);
                    contactsWithConversations.push({
                        id: conv.external_id || `virtual-${conv.id}`,
                        name: `Usuario ${conv.external_id || conv.id.substring(0, 8)}`,
                        unread: Number(conv.unread_count || 0),
                        lastChat: conv.last_message || "Click to start conversation",
                        time: new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        conversationId: conv.id,
                        updated_at: conv.updated_at,
                        initAvatar: {
                            variant: 'soft-primary',
                            title: (conv.external_id || 'U').charAt(0).toUpperCase()
                        }
                    });
                }
            });
            
            // Agregar contactos que no tienen conversaciones
            contacts.forEach(contact => {
                const hasConversation = contactsWithConversations.some(c => c.id === contact.id);
                if (!hasConversation) {
                    console.log(`📝 Agregando contacto sin conversación: ${contact.name}`);
                    contactsWithConversations.push({
                        ...contact,
                        unread: 0,
                        lastChat: "Click to start conversation",
                        time: new Date(contact.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        conversationId: null, // Sin conversación
                        updated_at: contact.created_at || new Date(0).toISOString()
                    });
                }
            });
            
            console.log(`📋 Total de contactos procesados: ${contactsWithConversations.length}`);
            console.log(`📋 Contactos con conversación: ${contactsWithConversations.filter(c => c.conversationId).length}`);
            console.log(`📋 Contactos sin conversación: ${contactsWithConversations.filter(c => !c.conversationId).length}`);
            
            return [...contactsWithConversations].sort((a, b) => {
                if ((a.unread || 0) !== (b.unread || 0)) {
                    return (b.unread || 0) - (a.unread || 0);
                }
                if (a.updated_at && b.updated_at) {
                    return new Date(b.updated_at) - new Date(a.updated_at);
                }
                if (a.updated_at && !b.updated_at) return -1;
                if (!a.updated_at && b.updated_at) return 1;
                return 0;
            });
        } else if (contacts && contacts.length > 0) {
            console.log("📝 Solo hay contactos, sin conversaciones");
            return contacts.map(c => ({ 
                ...c, 
                unread: 0, 
                lastChat: "Click to start conversation", 
                time: new Date(c.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                conversationId: null, // Sin conversación
                updated_at: c.created_at || new Date(0).toISOString() 
            })).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
        }
        console.log("📝 No hay datos para procesar");
        return [];
    }, [states.chatState.conversations, states.chatState.contacts]);

    useEffect(() => {
        // Solo actualizar si processedAndSortedList tiene contenido válido o si necesitamos limpiar la lista
        if (processedAndSortedList.length === 0 && list.length === 0) {
            // Ambas listas están vacías, no hacer nada
            return;
        }
        
        if (processedAndSortedList.length === 0 && list.length > 0) {
            // processedAndSortedList está vacía pero list tiene contenido
            // Esto podría ser temporal durante el recálculo, no actualizar
            console.log("📋 Evitando actualización temporal con lista vacía");
            return;
        }

        const listSignature = list.map(i => `${i.id}-${i.updated_at}-${i.unread}`).join(',');
        const processedListSignature = processedAndSortedList.map(i => `${i.id}-${i.updated_at}-${i.unread}`).join(',');

        if (list.length !== processedAndSortedList.length || listSignature !== processedListSignature) {
            console.log("📋 Actualizando estado 'list' con nueva lista procesada y ordenada.");
            console.log(`📋 Cambio: ${list.length} -> ${processedAndSortedList.length} elementos`);
            setList(processedAndSortedList);
        }
    }, [processedAndSortedList]); // Removida dependencia 'list' para evitar loops

    const displayList = useMemo(() => {
        if (searchValue.trim() === "") {
            return list; 
        }
        return list.filter(item =>
            item.name && item.name.toString().toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [list, searchValue]);

    const Conversation = async (contactData) => { 
        console.log(`🎯 Seleccionando conversación para contacto: ${contactData.name}, ID: ${contactData.id}`);
        console.log(`🎯 ConversationId: ${contactData.conversationId || 'No disponible'}`);
        
        // Set user information without triggering conversation fetching
        dispatch({ 
            type: "set_user", 
            userId: contactData.id, 
            avatar: contactData.avatar || contactData.initAvatar, 
            userName: contactData.name, 
            status: contactData.status 
        });

        if (contactData.conversationId) {
            console.log(`🎯 Estableciendo conversación actual: ${contactData.conversationId}`);
            
            // Set current conversation - this should trigger message loading in ChatBody
            dispatch({ 
                type: "set_current_conversation", 
                conversationId: contactData.conversationId 
            });
            
            // Mark messages as read if there are unread messages
            if (contactData.unread > 0) {
                try {
                    console.log(`🎯 Marcando ${contactData.unread} mensajes como leídos`);
                    await markMessagesAsRead(contactData.conversationId);
                    
                    // Update the conversation in the global state to reflect read status
                    const conversationToUpdate = states.chatState.conversations.find(
                        conv => conv.id === contactData.conversationId
                    );
                    
                    if (conversationToUpdate) {
                        dispatch({
                            type: "update_conversation",
                            conversation: {
                                ...conversationToUpdate,
                                unread_count: 0 
                            }
                        });
                        console.log(`🎯 Conversación actualizada: mensajes marcados como leídos`);
                    }
                } catch (error) {
                    console.error("❌ Error al marcar mensajes como leídos:", error);
                }
            }
        } else {
            console.warn(`⚠️ No conversationId found for contact ${contactData.name}, intentando crear conversación...`);
            
            // Intentar crear una nueva conversación para este contacto
            try {
                // Usar el teléfono del contacto como external_id
                const externalId = contactData.phone || contactData.id;
                console.log(`🔄 Creando nueva conversación para ${contactData.name} con external_id: ${externalId}`);
                
                // Crear conversación usando el WebSocket
                const newConversationData = {
                    user_id: contactData.id,
                    external_id: externalId,
                    platform: 'web'
                };
                
                const newConversation = await wsClient.createConversation(newConversationData);
                
                if (newConversation && newConversation.conversation) {
                    console.log(`✅ Nueva conversación creada: ${newConversation.conversation.id}`);
                    
                    // Agregar la nueva conversación al estado global
                    dispatch({
                        type: "fetch_conversations_success",
                        conversations: [...(states.chatState.conversations || []), newConversation.conversation]
                    });
                    
                    // Establecer como conversación actual
                    dispatch({ 
                        type: "set_current_conversation", 
                        conversationId: newConversation.conversation.id 
                    });
                    
                    console.log(`🎯 Nueva conversación establecida como actual: ${newConversation.conversation.id}`);
                } else {
                    console.error("❌ No se pudo crear la conversación - respuesta inválida");
                }
            } catch (error) {
                console.error("❌ Error al crear nueva conversación:", error);
                // Fallback: establecer el usuario sin conversación
                console.log("🔄 Fallback: estableciendo usuario sin conversación activa");
            }
        }

        // Handle mobile view
        if (width <= 991) {
            dispatch({ type: "start_chat" });
            dispatch({ type: "top_nav_toggle" });
        }
        
        console.log(`✅ Conversación seleccionada exitosamente`);
    }

    const searchOnChange = (event) => {
        setSearchValue(event.target.value); 
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
                        <a className="btn btn-icon btn-rounded btn-primary me-1" onClick={invitePeople} >
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
                            displayList.map((elem) => ( 
                                <ListGroup.Item 
                                    onClick={() => Conversation(elem)} 
                                    key={elem.conversationId || elem.id} 
                                    className={classNames({"unread-highlight": elem.unread > 0})}
                                    style={elem.unread > 0 ? {
                                        backgroundColor: "rgba(0, 123, 255, 0.15)", 
                                        borderLeft: "3px solid #007bff",
                                        fontWeight: "bold"
                                    } : {}}
                                    data-unread={elem.unread > 0 ? 'true' : 'false'}
                                    data-conversation-id={elem.conversationId || 'none'}
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
                                                            {elem.unread > 1 ? `${elem.unread} nuevos` : 'Nuevo'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="user-last-chat" title={elem.lastChat}>
                                                    {elem.lastChat && elem.lastChat.length > 30 
                                                        ? `${elem.lastChat.substring(0, 30)}...` 
                                                        : elem.lastChat || "Click to start conversation"}
                                                </div>
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
