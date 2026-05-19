import useChatStore from "../src/store/useChatStore";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";

export default function ChatPage() {
    const { setSelectedUser, selectedUser } = useChatStore();
    const chatSelected = !!selectedUser;

    return (
        <div className="h-full flex overflow-hidden bg-base-200 relative">
            <Sidebar
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                isMobileHidden={chatSelected}
            />
            <ChatWindow
                selectedUser={selectedUser}
                onBack={() => setSelectedUser(null)}
                isMobileHidden={!chatSelected}
            />
        </div>
    );
}