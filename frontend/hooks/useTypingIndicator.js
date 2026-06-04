import { useRef } from "react";
import { getSocket } from "../lib/socket";

// Custom hook for emitting typing / stopTyping socket events with debounce
export default function useTypingIndicator(receiverId) {
    const timeoutRef = useRef(null);

    // GSSoC Issue #51 Fix
    const lastEmitRef = useRef(0);
    const emitTyping = () => {
        const socket = getSocket();
        if (!socket || !receiverId) return;

        const now = Date.now();
        if (now - lastEmitRef.current > 1000) {
            socket.emit("typing", { receiverId });
            lastEmitRef.current = now;
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { receiverId });
        }, 2000);
    };

    return { emitTyping };
}
