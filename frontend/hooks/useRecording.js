import { useState, useRef } from "react";
import toast from "react-hot-toast";

// Custom hook for voice recording functionality
export default function useRecording() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBase64, setAudioBase64] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    // GSSoC Issue #55 Fix
    const isCancelledRef = useRef(false);

    const startRecording = async () => {
        try {
            isCancelledRef.current = false;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (isCancelledRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const reader = new FileReader();
                reader.onloadend = () => setAudioBase64(reader.result);
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch {
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        isCancelledRef.current = true;
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        clearInterval(timerRef.current);
        setAudioBase64(null);
        audioChunksRef.current = [];
    };

    const clearAudio = () => setAudioBase64(null);

    return { isRecording, recordingTime, audioBase64, startRecording, stopRecording, cancelRecording, clearAudio };
}
