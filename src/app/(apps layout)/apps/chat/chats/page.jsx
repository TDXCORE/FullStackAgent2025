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

    // Note: Conversation initialization is now handled in ContactList.jsx
    // This prevents overwriting the complete conversations list when a user is selected

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
