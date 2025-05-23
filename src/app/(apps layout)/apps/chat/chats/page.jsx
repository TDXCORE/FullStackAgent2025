'use client'
import { useEffect, useState } from 'react';
import ContactList from './ContactList';
import ChatBody from './ChatBody';
import ChatInfo from './ChatInfo';
import ChatFooter from '../ChatFooter';
import classNames from 'classnames';
import InvitePeopleModal from '../InvitePeopleModal';
import ChatHeader from '../ChatHeader';
import { useWindowWidth } from '@react-hook/window-size';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { createConversation, getConversations } from '@/services/chatService';
import DebugTools from '../DebugTools';

const Chats = () => {
    const { states, dispatch } = useGlobalStateContext();
    const [showInfo, setShowInfo] = useState(true);
    const [invitePeople, setInvitePeople] = useState(false);
    const [loading, setLoading] = useState(false);

    const windowWidth = useWindowWidth();
    useEffect(() => {
        if (windowWidth <= 1199) {
            setShowInfo(false);
        }
        else {
            setShowInfo(true)
        }
    }, [windowWidth]);

    // When a user is selected, get or create a conversation
    useEffect(() => {
        const initializeConversation = async () => {
            if (states.chatState.userId) {
                try {
                    setLoading(true);
                    dispatch({ type: "fetch_conversations_request" });
                    
                    // Get existing conversations for this user
                    const conversations = await getConversations(states.chatState.userId);
                    dispatch({ type: "fetch_conversations_success", conversations });
                    
                    // If no conversations exist, create one
                    if (conversations.length === 0) {
                        const newConversationData = {
                            user_id: states.chatState.userId, // Asegúrate que este sea el ID del usuario que crea o al que se asigna
                            external_id: `web-${Date.now()}`, // ID externo único
                            // Podrías añadir otros campos necesarios aquí, por ejemplo:
                            // created_by: states.chatState.userId, // Si es diferente de user_id
                            // status: 'active', // O el estado inicial por defecto
                            source: 'web' // O como se llame el campo para el tipo 'web'
                        };
                        const newConversation = await createConversation(newConversationData);
                        
                        // Add the new conversation to the state
                        dispatch({ 
                            type: "fetch_conversations_success", 
                            conversations: [newConversation] 
                        });
                        
                        // Set as current conversation
                        dispatch({ 
                            type: "set_current_conversation", 
                            conversationId: newConversation.id 
                        });
                    } else {
                        // Use the first conversation
                        dispatch({ 
                            type: "set_current_conversation", 
                            conversationId: conversations[0].id 
                        });
                    }
                    
                    setLoading(false);
                } catch (error) {
                    console.error("Error initializing conversation:", error);
                    dispatch({ type: "fetch_conversations_failure", error: error.message });
                    setLoading(false);
                }
            }
        };
        
        initializeConversation();
    }, [states.chatState.userId, dispatch]);

    return (
        <>
            <div className="hk-pg-body py-0">
                <div className={classNames("chatapp-wrap", { "chatapp-info-active": showInfo }, { "chatapp-slide": states.chatState.startChat })}>  {/* In class { "chatapp-slide": startChating } */}
                    <div className="chatapp-content">
                    <ContactList invitePeople={() => setInvitePeople(!invitePeople)} />
                        <div className="chatapp-single-chat">
                            <ChatHeader infoState={showInfo} infoToggle={() => setShowInfo(!showInfo)} invitePeople={() => setInvitePeople(!invitePeople)} />
                            <ChatBody />
                            <ChatFooter />
                            <ChatInfo infoToggle={() => setShowInfo(!showInfo)} />
                        </div>
                        {/* Invite People */}
                        <InvitePeopleModal show={invitePeople} onClose={() => setInvitePeople(!invitePeople)} />
                    </div>
                </div>
            </div>
            <DebugTools />
        </>
    )
}

export default Chats
