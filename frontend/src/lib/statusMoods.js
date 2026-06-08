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
