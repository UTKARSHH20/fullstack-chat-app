import { create } from "zustand";
import { getSocket } from "../../lib/socket";
import toast from "react-hot-toast";

/**
 * Global state management for WebRTC Voice and Video calling.
 * Handles streams, peer connections, socket signaling, and timeout fallback UX.
 */
const useCallStore = create((set, get) => ({
    localStream: null,
    remoteStream: null,
    call: null, // { isReceivingCall, caller, signalData, name, type, hasAccepted, hasEnded, isCalling }
    peerConnection: null,
    remoteIceCandidates: [],
    
    // Tracks the active ringing timeout to prevent memory leaks
    callTimeoutId: null,

    /**
     * Sets the local user's media stream (camera/microphone).
     * @param {MediaStream} stream - The local media stream object.
     */
    setLocalStream: (stream) => set({ localStream: stream }),

    /**
     * Sets the remote peer's incoming media stream.
     * @param {MediaStream} stream - The remote media stream object.
     */
    setRemoteStream: (stream) => set({ remoteStream: stream }),

    /**
     * Updates the core call object state.
     * @param {Object} callData - The active call parameters.
     */
    setCall: (callData) => set({ call: callData }),

    /**
     * Buffers incoming ICE candidates from the remote peer before the connection is established.
     * @param {RTCIceCandidate} candidate - The network routing candidate.
     */
    addIceCandidate: (candidate) => set((state) => ({ 
        remoteIceCandidates: [...state.remoteIceCandidates, candidate] 
    })),

    /**
     * Clears the buffered ICE candidates once they are successfully added to the peer connection.
     */
    clearIceCandidates: () => set({ remoteIceCandidates: [] }),

    /**
     * Stores the active WebRTC RTCPeerConnection instance.
     * @param {RTCPeerConnection} pc - The active connection object.
     */
    setPeer: (pc) => set({ peerConnection: pc }),

    /**
     * Initializes an incoming call payload from the socket server.
     * @param {Object} callerInfo - Details about the incoming caller.
     */
    initCall: (callerInfo) => {
        set({ call: { ...callerInfo, isReceivingCall: true, hasAccepted: false, hasEnded: false } });
    },

    /**
     * Initiates an outgoing call to a specific user and starts a 30-second UX timeout fallback.
     * If the remote user does not answer, the call is automatically aborted.
     * * @param {string} toUser - The ID of the user being called.
     * @param {string} toUserName - The display name of the user being called.
     * @param {string} type - The call type ('audio' or 'video').
     */
    startOutgoingCall: (toUser, toUserName, type) => {
        // Set the outgoing call state
        set({ call: { userToCall: toUser, name: toUserName, type, isReceivingCall: false, hasAccepted: false, hasEnded: false } });

        // Initialize the 30-second UX Timeout Fallback
        const timeoutId = setTimeout(() => {
            const currentCall = get().call;
            
            // If the call hasn't been accepted after 30 seconds, abort the attempt
            if (currentCall && !currentCall.hasAccepted) {
                toast.error("User unavailable");
                get().clearCall();
                
                // Optionally emit a cancel event to clear the remote ringing UI
                const socket = getSocket();
                if (socket) {
                    socket.emit("callCanceled", { to: toUser });
                }
            }
        }, 30000); // 30 seconds

        // Save the timeout ID so it can be cleared if the user answers
        set({ callTimeoutId: timeoutId });
    },

    /**
     * Completely tears down the active call.
     * Halts media tracks, closes peer connections, clears timeouts, and resets the UI state.
     */
    clearCall: () => {
        const { localStream, peerConnection, callTimeoutId } = get();
        
        // Clear the ringing timeout if it's still active
        if (callTimeoutId) {
            clearTimeout(callTimeoutId);
        }

        // Release hardware hardware media tracks
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }

        // Close WebRTC connection
        if (peerConnection) {
            peerConnection.close();
        }

        // Reset global state
        set({
            localStream: null,
            remoteStream: null,
            call: null,
            peerConnection: null,
            remoteIceCandidates: [],
            callTimeoutId: null,
        });
    },

    /**
     * Binds WebSocket listeners for incoming call signaling events.
     */
    subscribeToCalls: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on("incomingCall", ({ from, name, signal, type }) => {
            // Prevent interrupting an ongoing call with a new incoming call
            const currentCall = get().call;
            if (currentCall && !currentCall.hasEnded) {
                socket.emit("rejectCall", { to: from });
                return;
            }
            get().initCall({ caller: from, name, signalData: signal, type });
        });

        socket.on("callEnded", () => {
            get().clearCall();
        });

        socket.on("callRejected", () => {
            get().clearCall();
            toast.error("Call declined");
        });
    },

    /**
     * Unbinds WebSocket listeners to prevent memory leaks on component unmount.
     */
    unsubscribeFromCalls: () => {
        const socket = getSocket();
        if (socket) {
            socket.off("incomingCall");
            socket.off("callEnded");
            socket.off("callRejected");
        }
    }
}));

export default useCallStore;