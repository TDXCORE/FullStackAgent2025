
//image
import avatar1 from '@/assets/img/avatar1.jpg';
import avatar8 from '@/assets/img/avatar8.jpg';

export const chatInitialStates = {
    startChat: false,
    avatar: { type: "img", src: avatar8 },
    userId: 2,
    userName: "Huma Therman",
    msg: [],
    contactMsg: [],
    rplyMsg: [],
    status: "Typing",
    //Group states
    grpId: 12,
    grpAvatar: { type: "img", src: avatar1 },
    groupName: "Developers Stage",
    grpStatus: "Active 5min ago",
    grpMsg: [],
    // New states for API integration
    loading: false,
    error: null,
    contacts: [],
    conversations: [],
    currentConversationId: null,
    agentEnabled: true,
    // WebSocket states
    wsConnected: false,
    wsClientId: null
}

const chatReducer = (state = chatInitialStates, action) => {
    switch (action.type) {
        case "start_chat":
            return {
                ...state,
                startChat: !state.startChat
            };
        case "send_msg":
            return {
                ...state,
                msg: [...state.msg, action.msg]
            };
        case "set_user":
            return {
                ...state,
                userId: action.userId,
                avatar: action.avatar,
                userName: action.userName,
                status: action.status
            };
        case "contact_msg":
            return {
                ...state,
                contactMsg: [...state.contactMsg, action.contactMsg]
            };
        case "reply_msg":
            return {
                ...state,
                rplyMsg: [...state.rplyMsg, action.rplyMsg]
            };
        //Chat Group reducers
        case "grp_msg":
            return {
                ...state,
                grpMsg: [...state.grpMsg, action.grpMsg]
            };
        case "select_group":
            return {
                ...state,
                grpId: action.grpId,
                grpAvatar: action.grpAvatar,
                groupName: action.groupName,
                grpStatus: action.grpStatus,
            };
            
        // New actions for API integration
        case "fetch_contacts_request":
            return {
                ...state,
                loading: true
            };
        case "fetch_contacts_success":
            return {
                ...state,
                loading: false,
                contacts: action.contacts
            };
        case "fetch_contacts_failure":
            return {
                ...state,
                loading: false,
                error: action.error
            };
            
        case "fetch_conversations_request":
            return {
                ...state,
                loading: true
            };
        case "fetch_conversations_success":
            // Asegurar que unread_count sea un número en todas las conversaciones
            const normalizedConversations = action.conversations.map(conv => ({
                ...conv,
                unread_count: Number(conv.unread_count || 0)
            }));
            
            // Ordenar conversaciones: primero las no leídas, luego por fecha
            const sortedConversations = [...normalizedConversations].sort((a, b) => {
                // Primero ordenar por mensajes no leídos (mayor a menor)
                if (a.unread_count !== b.unread_count) {
                    return b.unread_count - a.unread_count;
                }
                // Luego por fecha de actualización (más reciente primero)
                if (a.updated_at && b.updated_at) {
                    return new Date(b.updated_at) - new Date(a.updated_at);
                }
                return 0;
            });
            
            console.log("chatReducer: Conversaciones ordenadas:", 
                sortedConversations.map(c => ({
                    id: c.id.substring(0, 8),
                    unread: c.unread_count,
                    updated: c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : 'N/A'
                }))
            );
            
            return {
                ...state,
                loading: false,
                conversations: sortedConversations
            };
        case "fetch_conversations_failure":
            return {
                ...state,
                loading: false,
                error: action.error
            };
            
        case "set_current_conversation":
            return {
                ...state,
                currentConversationId: action.conversationId
            };
            
        case "fetch_messages_request":
            return {
                ...state,
                loading: true
            };
        case "fetch_messages_success":
            return {
                ...state,
                loading: false,
                msg: action.messages
            };
        case "fetch_messages_failure":
            return {
                ...state,
                loading: false,
                error: action.error
            };
            
        case "send_message_request":
            return {
                ...state,
                loading: true
            };
        case "send_message_success":
            return {
                ...state,
                loading: false,
                msg: [...state.msg, action.message]
            };
        case "send_message_failure":
            return {
                ...state,
                loading: false,
                error: action.error
            };
            
        case "update_messages":
            return {
                ...state,
                msg: action.messages
            };
            
        case "toggle_agent":
            return {
                ...state,
                agentEnabled: action.enabled,
                conversations: state.conversations.map(conv => 
                    conv.id === action.conversationId 
                        ? { ...conv, agent_enabled: action.enabled } 
                        : conv
                )
            };
            
        case "update_conversation":
            // Actualizar la conversación específica y mantener el orden (no leídos primero)
            const updatedConversations = state.conversations.map(conv => 
                conv.id === action.conversation.id 
                    ? { ...conv, ...action.conversation } 
                    : conv
            );
            
            // Ordenar las conversaciones: primero las que tienen mensajes no leídos,
            // luego por fecha de actualización más reciente
            const sortedUpdatedConversations = [...updatedConversations].sort((a, b) => {
                // Asegurar que unread_count sea un número
                const aUnread = Number(a.unread_count || 0);
                const bUnread = Number(b.unread_count || 0);
                
                console.log(`Ordenando conversaciones en reducer: ${a.id.substring(0, 8)} (unread: ${aUnread}) vs ${b.id.substring(0, 8)} (unread: ${bUnread})`);
                
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
            
            console.log("Actualizando conversación en reducer:", action.conversation.id, "unread_count:", action.conversation.unread_count);
            console.log("Conversaciones ordenadas:", sortedUpdatedConversations.map(c => ({ id: c.id, unread: c.unread_count })));
            
            return {
                ...state,
                conversations: sortedUpdatedConversations
            };
            
        // WebSocket event handlers
        case "ws_connected":
            return {
                ...state,
                wsConnected: true,
                wsClientId: action.payload.client_id
            };
            
        case "ws_disconnected":
            return {
                ...state,
                wsConnected: false
            };
            
        case "ws_new_message":
            // Si el mensaje pertenece a la conversación actual, añadirlo a los mensajes
            if (action.payload.message.conversation_id === state.currentConversationId) {
                const newMessage = {
                    id: action.payload.message.id,
                    types: action.payload.message.role === 'user' ? 'sent' : 'received',
                    text: action.payload.message.content,
                    time: new Date(action.payload.message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    message_type: action.payload.message.message_type || 'text',
                    media_url: action.payload.message.media_url
                };
                
                return {
                    ...state,
                    msg: [...state.msg, newMessage]
                };
            }
            
            // Actualizar el contador de mensajes no leídos para la conversación
            const updatedConversationsWithNewMessage = state.conversations.map(conv => 
                conv.id === action.payload.message.conversation_id
                    ? { 
                        ...conv, 
                        unread_count: (Number(conv.unread_count) || 0) + 1,
                        last_message: action.payload.message.content,
                        updated_at: action.payload.message.created_at
                      }
                    : conv
            );
            
            // Ordenar las conversaciones: primero las que tienen mensajes no leídos
            const sortedConversationsWithNewMessage = [...updatedConversationsWithNewMessage].sort((a, b) => {
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
                return 0;
            });
            
            return {
                ...state,
                conversations: sortedConversationsWithNewMessage
            };
            
        case "ws_message_deleted":
            return {
                ...state,
                msg: state.msg.filter(m => m.id !== action.payload.message_id)
            };
            
        case "ws_conversation_updated":
            // Actualizar la conversación específica
            const updatedConversationsFromWS = state.conversations.map(conv => 
                conv.id === action.payload.conversation.id
                    ? { ...conv, ...action.payload.conversation }
                    : conv
            );
            
            // Ordenar las conversaciones
            const sortedUpdatedConversationsFromWS = [...updatedConversationsFromWS].sort((a, b) => {
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
                return 0;
            });
            
            return {
                ...state,
                conversations: sortedUpdatedConversationsFromWS
            };
            
        case "ws_conversation_created":
            // Añadir la nueva conversación al principio de la lista
            return {
                ...state,
                conversations: [
                    {
                        ...action.payload.conversation,
                        unread_count: Number(action.payload.conversation.unread_count || 0)
                    },
                    ...state.conversations
                ]
            };
            
        case "ws_user_updated":
            // Actualizar el usuario en la lista de contactos
            return {
                ...state,
                contacts: state.contacts.map(contact => 
                    contact.id === action.payload.user.id
                        ? { 
                            ...contact, 
                            name: action.payload.user.full_name,
                            // Actualizar otros campos según sea necesario
                          }
                        : contact
                )
            };
            
        default:
            return state;
    }
};

export default chatReducer
