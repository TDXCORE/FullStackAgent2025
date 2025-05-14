
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
    agentEnabled: true
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
            return {
                ...state,
                loading: false,
                conversations: action.conversations
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
            const sortedConversations = [...updatedConversations].sort((a, b) => {
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
            console.log("Conversaciones ordenadas:", sortedConversations.map(c => ({ id: c.id, unread: c.unread_count })));
            
            return {
                ...state,
                conversations: sortedConversations
            };
            
        default:
            return state;
    }
};

export default chatReducer
