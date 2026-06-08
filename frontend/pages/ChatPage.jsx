import React, { Component, useState, useRef, useEffect } from "react";
import useChatStore from "../src/store/useChatStore";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { ArrowDown } from "lucide-react";

/**
 * Local React Error Boundary Class Component.
 * Intercepts unhandled rendering runtime errors thrown by malformed message payloads
 * down the component tree, preventing a total application crash.
 */
class ChatLayoutErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the safe fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ChatLayoutErrorBoundary caught an uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Elegant DaisyUI Fallback UI when rendering errors crash the active feed
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-base-300 p-6 text-center">
                    <div className="max-w-md bg-base-100 p-8 rounded-2xl shadow-xl border border-base-content/10">
                        <h2 className="text-xl font-bold text-error mb-2">Conversation Feed Unavailable</h2>
                        <p className="text-sm text-base-content/70 mb-4">
                            An error occurred while displaying this chat layout. This is usually caused by a corrupted or unsupported message format payload.
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn btn-sm btn-outline btn-error rounded-full"
                        >
                            Reload Interface
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * ChatPage Component Layout Shell.
 * Orchestrates the responsive dual-panel view between the sidebar and active windows.
 * Wrapped securely in a layout boundary to handle malformed message streams gracefully.
 *
 * @returns {React.JSX.Element}
 */
export default function ChatPage() {
    const { setSelectedUser, selectedUser, messages } = useChatStore();
    const chatSelected = !!selectedUser;

    // Track state of the unread message alert badge
    const [showScrollBadge, setShowScrollBadge] = useState(false);
    
    // Core layout references to evaluate container sizing metrics
    const containerRef = useRef(null);
    const prevMessagesLengthRef = useRef(messages?.length || 0);

    /**
     * Scroll Evaluation Handler
     * Analyzes viewport scroll offsets dynamically. If the user scrolls close to the bottom,
     * it dismisses the pending message notification badge.
     */
    const handleScrollTracking = () => {
        if (!containerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        
        // Compute precise distance in pixels from the absolute container bottom
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // Threshold limit: If user scrolls within 150px of the bottom, clear the alert badge
        if (distanceFromBottom < 150) {
            setShowScrollBadge(false);
        }
    };

    /**
     * Programmatic Snap-to-Bottom Router
     * Forces the scroll viewport container coordinates to align perfectly with the newest message.
     */
    const snapToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: "smooth"
            });
            setShowScrollBadge(false);
        }
    };

    /**
     * Real-time Incoming Message Inspector
     * Evaluates whether a new incoming message should snap the view downwards or lock position
     * to preserve the user's reading context.
     */
    useEffect(() => {
        if (!containerRef.current || !messages || messages.length === 0) return;

        // Capture historical vs active array boundaries
        const prevLength = prevMessagesLengthRef.current;
        const currentLength = messages.length;
        prevMessagesLengthRef.current = currentLength;

        // If messages were loaded via pagination or initialized, don't execute snap
        if (currentLength <= prevLength) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        
        // Calculate the previous layout distance boundary from the bottom
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // UX SCROLL LOCK THRESHOLD:
        // If the user is reading history (> 300px away from bottom), lock scroll and flash floating badge
        if (distanceFromBottom > 300) {
            setShowScrollBadge(true);
        } else {
            // If close enough to bottom, cleanly snap view downward to render new content
            setTimeout(() => snapToBottom(), 50);
        }
    }, [messages]);

    /**
     * Automatically clears out-dated badge configurations whenever the user switches conversations
     */
    useEffect(() => {
        setShowScrollBadge(false);
        prevMessagesLengthRef.current = 0;
        setTimeout(() => snapToBottom(), 100);
    }, [selectedUser]);

    return (
        <ChatLayoutErrorBoundary>
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
        </ChatLayoutErrorBoundary>
    );
}