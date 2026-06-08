import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import useCallStore from "../src/store/useCallStore"; // Adjust path if needed based on your folder structure
import useAuthStore from "../src/store/useAuthStore";
import { getSocket } from "../lib/socket";

/**
 * CallHandler Component
 * Orchestrates the WebRTC UI, media streams, peer connections, and timeout fallbacks.
 * Mounts globally to intercept and render active voice/video calls across any route.
 */
export default function CallHandler() {
    const { call, localStream, remoteStream, peerConnection, setLocalStream, setRemoteStream, setPeer, clearCall } = useCallStore();
    const { authUser } = useAuthStore();
    
    // Media element references for rendering video/audio streams
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Local UI states for media controls and connection UX
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    
    const callTimerRef = useRef(null);

    /**
     * Call Duration Tracker
     * Starts incrementing the active call clock once a peer connection is fully established and accepted.
     */
    useEffect(() => {
        if (call?.hasAccepted && remoteStream) {
            callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
        return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
    }, [call?.hasAccepted, remoteStream]);

    /**
     * Resets the call duration back to zero when the call completely unmounts or clears.
     */
    useEffect(() => {
        if (!call) setCallDuration(0);
    }, [call]);

    /**
     * Binds the local user's hardware media stream (camera) to the local video HTML element.
     */
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, call?.type, isVideoOff]);

    /**
     * Binds the incoming remote peer's media stream to the main video HTML element.
     */
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    /**
     * Core WebSocket listener setup for handling WebRTC signaling data.
     * Manages incoming ICE candidates for NAT traversal and remote connection acceptance.
     */
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        /**
         * Injects network routing candidates into the active peer connection.
         */
        const handleIceCandidate = async (candidate) => {
            const pc = useCallStore.getState().peerConnection;
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            } else {
                useCallStore.getState().addIceCandidate(candidate);
            }
        };

        /**
         * Resolves the WebRTC handshake when the remote peer accepts the call.
         * CRITICAL FIX: Destroys the 30-second UX fallback timeout to prevent accidental hangups.
         */
        const handleCallAccepted = async (signal) => {
            const pc = useCallStore.getState().peerConnection;
            if (pc) {
                // Finalize the remote connection description
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                useCallStore.setState({ call: { ...useCallStore.getState().call, hasAccepted: true } });
                
                // UX TIMEOUT FIX: The user answered! Clear the 30-second abort timer so the call continues.
                const { callTimeoutId } = useCallStore.getState();
                if (callTimeoutId) {
                    clearTimeout(callTimeoutId);
                    useCallStore.setState({ callTimeoutId: null });
                }
                
                // Flush buffered ICE candidates
                const candidates = useCallStore.getState().remoteIceCandidates;
                for (const candidate of candidates) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("ICE candidate error:", e) }
                }
                useCallStore.getState().clearIceCandidates();
            }
        };

        socket.on("iceCandidate", handleIceCandidate);
        socket.on("callAccepted", handleCallAccepted);

        return () => {
            socket.off("iceCandidate", handleIceCandidate);
            socket.off("callAccepted", handleCallAccepted);
        };
    }, []);

    /**
     * Auto-initiates an outgoing WebRTC offer if the local user is the caller.
     */
    useEffect(() => {
        if (call && !call.isReceivingCall && !peerConnection && !isConnecting) {
            setIsConnecting(true);
            const startCall = async () => {
                const stream = await setupMedia(call.type);
                if (!stream) {
                    clearCall();
                    return;
                }
                const pc = createPeer(stream, call.userToCall);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const socket = getSocket();
                socket.emit("callUser", {
                    userToCall: call.userToCall,
                    signalData: pc.localDescription,
                    from: authUser._id,
                    name: authUser.name,
                    type: call.type
                });
            };
            startCall();
        }
    }, [call, peerConnection, isConnecting, authUser]);

    /**
     * Cleans up local UI connection toggles when the call drops or ends.
     */
    useEffect(() => {
        if (!call) {
            setIsConnecting(false);
            setIsMuted(false);
            setIsVideoOff(false);
        }
    }, [call]);

    /**
     * Requests hardware access for the camera and microphone.
     * @param {string} type - 'audio' or 'video'
     * @returns {Promise<MediaStream|null>} The generated media stream
     */
    const setupMedia = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: type === "video", 
                audio: true 
            });
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Failed to get local stream", error);
            toast.error("Could not access camera/microphone. Please check permissions.");
            return null;
        }
    };

    /**
     * Constructs the core RTCPeerConnection object with public STUN servers for NAT traversal.
     * @param {MediaStream} stream - The local hardware stream.
     * @param {string} toUser - Target user ID to route ICE candidates to.
     * @returns {RTCPeerConnection} The initialized peer object.
     */
    const createPeer = (stream, toUser) => {
        const socket = getSocket();
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:global.stun.twilio.com:3478" }
            ]
        });

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("iceCandidate", { to: toUser, candidate: event.candidate });
            }
        };

        setPeer(pc);
        return pc;
    };

    /**
     * Handles the receiving user accepting an incoming call.
     * Generates a WebRTC answer and emits it back to the caller.
     */
    const answerCall = async () => {
        const socket = getSocket();
        const stream = await setupMedia(call.type);
        if (!stream) {
            rejectCall();
            return;
        }

        const pc = createPeer(stream, call.caller);
        await pc.setRemoteDescription(new RTCSessionDescription(call.signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answerCall", { to: call.caller, signal: pc.localDescription });
        useCallStore.setState({ call: { ...call, hasAccepted: true } });

        const candidates = useCallStore.getState().remoteIceCandidates;
        for (const candidate of candidates) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("ICE candidate error:", e) }
        }
        useCallStore.getState().clearIceCandidates();
    };

    /**
     * Declines an incoming call and notifies the caller's socket.
     */
    const rejectCall = () => {
        const socket = getSocket();
        if (call?.caller) {
            socket.emit("rejectCall", { to: call.caller });
        }
        clearCall();
    };

    /**
     * Terminates an active call and tears down the peer connections.
     */
    const endCall = () => {
        const socket = getSocket();
        const toUser = call.isReceivingCall ? call.caller : call.userToCall;
        if (toUser) {
            socket.emit("endCall", { to: toUser });
        }
        clearCall();
    };

    /**
     * Toggles the active state of the local audio track (Mute/Unmute).
     */
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks()[0].enabled = isMuted;
            setIsMuted(!isMuted);
        }
    };

    /**
     * Toggles the active state of the local video track (Camera On/Off).
     */
    const toggleVideo = () => {
        if (localStream && call.type === "video") {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = isVideoOff;
                setIsVideoOff(!isVideoOff);
            }
        }
    };

    if (!call) return null;

    // Incoming call overlay
    if (call.isReceivingCall && !call.hasAccepted) {
        return (
            <div className="fixed inset-0 bg-base-300/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                <div className="bg-base-100 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-ping absolute" />
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center relative z-10">
                            {call.type === "video" ? <Video className="w-10 h-10 text-primary" /> : <Phone className="w-10 h-10 text-primary" />}
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">{call.name}</h2>
                        <p className="text-base-content/60 mt-1">Incoming {call.type} call...</p>
                    </div>
                    <div className="flex gap-4 w-full">
                        <button onClick={rejectCall} className="btn btn-error flex-1 rounded-full text-error-content shadow-lg shadow-error/30">
                            <PhoneOff className="w-5 h-5" /> Decline
                        </button>
                        <button onClick={answerCall} className="btn btn-success flex-1 rounded-full text-success-content shadow-lg shadow-success/30">
                            <Phone className="w-5 h-5" /> Accept
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active call screen (or dialing screen)
    return (
        <div className="fixed inset-0 bg-base-300 z-[100] flex flex-col">
            {/* Main Video Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {remoteStream ? (
                    call.type === "video" ? (
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                <Phone className="w-12 h-12 text-primary" />
                            </div>
                            <p className="text-2xl font-semibold text-white/90">{call.name}</p>
                            <p className="text-white/60">{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</p>
                            <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                            {call.type === "video" ? <Video className="w-10 h-10 text-primary" /> : <Phone className="w-10 h-10 text-primary" />}
                        </div>
                        <p className="text-xl font-semibold text-white/80">{call.isReceivingCall ? "Connecting..." : "Ringing..."}</p>
                    </div>
                )}

                {/* Local Video Picture-in-Picture */}
                {localStream && call.type === "video" && (
                    <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] bg-base-300 rounded-2xl overflow-hidden shadow-2xl border-2 border-base-100/50">
                        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`} />
                        {isVideoOff && (
                            <div className="w-full h-full flex items-center justify-center bg-base-300">
                                <CameraOff className="w-8 h-8 text-base-content/50" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="h-24 bg-base-100 flex items-center justify-center gap-6 shrink-0 shadow-2xl z-10 px-4 pb-safe">
                <button onClick={toggleMute} className={`btn btn-circle btn-lg ${isMuted ? "btn-error text-error-content" : "btn-neutral"}`}>
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                
                {call.type === "video" && (
                    <button onClick={toggleVideo} className={`btn btn-circle btn-lg ${isVideoOff ? "btn-error text-error-content" : "btn-neutral"}`}>
                        {isVideoOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                    </button>
                )}

                <button onClick={endCall} className="btn btn-circle btn-lg btn-error text-error-content shadow-lg shadow-error/30 ml-4">
                    <PhoneOff className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
}