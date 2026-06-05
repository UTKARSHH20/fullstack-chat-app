import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

/**
 * Custom hook for managing native browser voice recording functionality.
 * Handles media streams, audio chunking, encoding to Base64, and prevents hardware memory leaks.
 *
 * @returns {Object} Recording state and control functions.
 */
export default function useRecording() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBase64, setAudioBase64] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    
    // Added flag to prevent ghost-saving audio when explicitly canceled or abandoned
    const isCanceledRef = useRef(false);
    // GSSoC Issue #55 Fix
    const isCancelledRef = useRef(false);

    /**
     * Cleans up all active media tracks to release hardware microphone access.
     * Crucial for preventing red-dot microphone indicator leaks in the browser tab.
     */
    const stopMediaTracks = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
    }, []);

    /**
     * Initializes the microphone stream, sets up the MediaRecorder,
     * and starts the interval timer for the recording UI.
     */
    const startRecording = async () => {
        try {
            // Reset states before starting a fresh recording
            isCanceledRef.current = false;
            audioChunksRef.current = [];
            setAudioBase64(null);

            isCancelledRef.current = false;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Only process and save the audio payload if it wasn't explicitly canceled
                if (!isCanceledRef.current) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                    const reader = new FileReader();
                    reader.onloadend = () => setAudioBase64(reader.result);
                    reader.readAsDataURL(audioBlob);
                }
                // Always ensure hardware tracks are released when recording halts
                stopMediaTracks();
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

            // Start the UI timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Microphone access error:", error);
            toast.error("Microphone access denied or unavailable");
        }
    };

    /**
     * Gracefully stops the active recording, saves the encoded file to state,
     * and halts the UI timer.
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop(); // Triggers the onstop event (saves file)
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        isCanceledRef.current = true;
        isCancelledRef.current = true;
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        clearInterval(timerRef.current);
        setAudioBase64(null);
        audioChunksRef.current = [];
    }, [isRecording]);

    /**
     * Clears the generated Base64 audio string from state.
     */
    const clearAudio = useCallback(() => {
        setAudioBase64(null);
    }, []);

    /**
     * UNMOUNT CLEANUP
     * Prevents React memory leaks (updating unmounted states) and hardware leaks
     * (leaving the microphone listening in the background) if the component unmounts
     * while actively recording.
     */
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                isCanceledRef.current = true; // Don't save abandoned recordings
                mediaRecorderRef.current.stop();
                stopMediaTracks();
            }
        };
    }, [stopMediaTracks]);

    return {
        isRecording,
        recordingTime,
        audioBase64,
        startRecording,
        stopRecording,
        cancelRecording,
        clearAudio
    };
}