import { useRef } from "react";
import { getSocket } from "../lib/socket";

// Custom hook for emitting typing / stopTyping socket events with debounce
export default function useTypingIndicator(receiverId) {
    const timeoutRef = useRef(null);

    const emitTyping = () => {
        const socket = getSocket();
        if (!socket || !receiverId) return;

        socket.emit("typing", { receiverId });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { receiverId });
        }, 2000);
    };

    return { emitTyping };
}
