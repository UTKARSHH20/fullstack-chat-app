export const STATUS_MOOD_OPTIONS = [
    { value: "coding", emoji: "🎯", label: "Coding" },
    { value: "coffee_break", emoji: "☕", label: "Coffee Break" },
    { value: "studying", emoji: "📚", label: "Studying" },
    { value: "gaming", emoji: "🎮", label: "Gaming" },
    { value: "working", emoji: "💼", label: "Working" },
    { value: "sleeping", emoji: "😴", label: "Sleeping" },
    { value: "music", emoji: "🎵", label: "Music" },
    { value: "away", emoji: "🏝️", label: "Away" },
];

export const STATUS_MOOD_LABELS = Object.fromEntries(
    STATUS_MOOD_OPTIONS.map(({ value, emoji, label }) => [value, `${emoji} ${label}`])
);

export const getStatusMoodLabel = (value) => STATUS_MOOD_LABELS[value] || "";

export const LIVE_ACTIVITY_OPTIONS = [
    { value: "typing", emoji: "💬", label: "Typing Message" },
    { value: "viewing_images", emoji: "📸", label: "Viewing Images" },
    { value: "recording_voice_note", emoji: "🎤", label: "Recording Voice Note" },
    { value: "searching_users", emoji: "🔍", label: "Searching Users" },
    { value: "viewing_profile", emoji: "📂", label: "Viewing Profile" },
    { value: "updating_settings", emoji: "⚙️", label: "Updating Settings" },
    { value: "reading_messages", emoji: "📥", label: "Reading Messages" },
];

export const LIVE_ACTIVITY_LABELS = Object.fromEntries(
    LIVE_ACTIVITY_OPTIONS.map(({ value, emoji, label }) => [value, `${emoji} ${label}`])
);

export const getLiveActivityLabel = (value) => LIVE_ACTIVITY_LABELS[value] || "";
