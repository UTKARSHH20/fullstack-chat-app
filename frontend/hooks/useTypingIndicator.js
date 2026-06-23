import { useRef, useCallback, useEffect } from "react";
import { getSocket } from "../lib/socket";

export default function useTypingIndicator(receiverId) {
    const timeoutRef = useRef(null);
    const lastEmitRef = useRef(0);
    const previousReceiverRef = useRef(receiverId);

    const emitTyping = useCallback(() => {
        const socket = getSocket();

        if (!socket || !receiverId) return;

        const now = Date.now();

        // throttle typing event emission
        if (now - lastEmitRef.current > 1000) {
            socket.emit("typing", { receiverId });
            lastEmitRef.current = now;
        }

        // clear existing debounce timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // debounce stopTyping event
        timeoutRef.current = setTimeout(() => {
            const activeSocket = getSocket();

            if (!activeSocket) return;

            activeSocket.emit("stopTyping", { receiverId });
        }, 2000);

    }, [receiverId]);

    // handle receiver changes safely
    useEffect(() => {
        const socket = getSocket();

        if (
            previousReceiverRef.current &&
            previousReceiverRef.current !== receiverId &&
            socket
        ) {
            socket.emit("stopTyping", {
                receiverId: previousReceiverRef.current,
            });
        }

        previousReceiverRef.current = receiverId;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        lastEmitRef.current = 0;
    }, [receiverId]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { emitTyping };
}