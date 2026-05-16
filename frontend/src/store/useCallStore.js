import { create } from "zustand";
import { getSocket } from "../../lib/socket";

const useCallStore = create((set, get) => ({
    localStream: null,
    remoteStream: null,
    call: null, // { isReceivingCall, caller, signalData, name, type, hasAccepted, hasEnded, isCalling }
    peerConnection: null,

    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),
    setCall: (callData) => set({ call: callData }),
    
    initCall: (callerInfo) => {
        set({ call: { ...callerInfo, isReceivingCall: true, hasAccepted: false, hasEnded: false } });
    },

    startOutgoingCall: (toUser, toUserName, type) => {
        set({ call: { userToCall: toUser, name: toUserName, type, isReceivingCall: false, hasAccepted: false, hasEnded: false } });
    },

    clearCall: () => {
        const { localStream, peerConnection } = get();
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        if (peerConnection) {
            peerConnection.close();
        }
        set({
            localStream: null,
            remoteStream: null,
            call: null,
            peerConnection: null,
        });
    },

    // Optional: socket subscription for calls if we want it separated
    subscribeToCalls: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on("incomingCall", ({ from, name, signal, type }) => {
            // If already in a call, we might want to reject, but for now just set it
            const currentCall = get().call;
            if (currentCall && !currentCall.hasEnded) {
                // Busy
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
        });
    },

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
