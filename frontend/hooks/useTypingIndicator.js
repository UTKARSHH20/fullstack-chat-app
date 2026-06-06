import { useRef, useCallback, useEffect } from "react";
import { getSocket } from "../lib/socket";

/**
 * Custom hook for optimizing real-time chat typing indicator event transmissions.
 * Throttles outgoing "typing" events to mitigate network congestion and debounces
 * "stopTyping" occurrences to ensure accurate remote client state synchronization.
 *
 * @param {string} receiverId - The unique database ID of the message recipient.
 * @returns {Object} Control method wrapper containing the throttled handler.
 */
export default function useTypingIndicator(receiverId) {
    // Tracks the active debounce timeout handles to capture input termination
    const timeoutRef = useRef(null);
    
    // Reference lock flag to throttle repetitive outward socket streams
    const isTypingEmitRef = useRef(false);

    // GSSoC Issue #51 Fix
    const lastEmitRef = useRef(0);

    /**
     * Evaluates active user keystrokes and coordinates throttled state transmissions.
     * Prevents flood overflows by blocking outgoing keystroke events during active intervals.
     */
    const emitTyping = useCallback(() => {
    const socket = getSocket();
        
        // Prevent event execution if socket links or receiver targets are unmapped
        if (!socket || !receiverId) return;

    if (!socket || !receiverId) return;

    const now = Date.now();

    if (now - lastEmitRef.current > 1000) {
        socket.emit("typing", { receiverId });
        lastEmitRef.current = now;
        isTypingEmitRef.current = true;
    }

    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { receiverId });
        isTypingEmitRef.current = false;
    }, 2500);
}, [receiverId]);

    /**
     * UNMOUNT CLEANUP
     * Safely clears memory hooks and guarantees clean state tear downs if the 
     * user closes the conversation channel mid-keystroke.
     */
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { emitTyping };
}