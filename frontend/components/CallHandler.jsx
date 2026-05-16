import React, { useEffect, useRef, useState } from "react";
import { Phone, Video, PhoneOff, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import useCallStore from "../src/store/useCallStore";
import useAuthStore from "../src/store/useAuthStore";
import { getSocket } from "../lib/socket";

export default function CallHandler() {
    const { call, localStream, remoteStream, peerConnection, setLocalStream, setRemoteStream, setPeer, clearCall } = useCallStore();
    const { authUser } = useAuthStore();
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, call?.type, isVideoOff]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Handle incoming ICE candidates & answers
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleIceCandidate = async (candidate) => {
            const pc = useCallStore.getState().peerConnection;
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            }
        };

        const handleCallAccepted = async (signal) => {
            const pc = useCallStore.getState().peerConnection;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                useCallStore.setState({ call: { ...useCallStore.getState().call, hasAccepted: true } });
            }
        };

        socket.on("iceCandidate", handleIceCandidate);
        socket.on("callAccepted", handleCallAccepted);

        return () => {
            socket.off("iceCandidate", handleIceCandidate);
            socket.off("callAccepted", handleCallAccepted);
        };
    }, []);

    // Handle initiating outgoing calls
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

    // Cleanup on call end
    useEffect(() => {
        if (!call) {
            setIsConnecting(false);
            setIsMuted(false);
            setIsVideoOff(false);
        }
    }, [call]);

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
            alert("Could not access camera/microphone. Please check permissions.");
            return null;
        }
    };

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
    };

    const rejectCall = () => {
        const socket = getSocket();
        if (call?.caller) {
            socket.emit("rejectCall", { to: call.caller });
        }
        clearCall();
    };

    const endCall = () => {
        const socket = getSocket();
        const toUser = call.isReceivingCall ? call.caller : call.userToCall;
        if (toUser) {
            socket.emit("endCall", { to: toUser });
        }
        clearCall();
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks()[0].enabled = isMuted;
            setIsMuted(!isMuted);
        }
    };

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
                            <p className="text-white/60">00:00</p>
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
