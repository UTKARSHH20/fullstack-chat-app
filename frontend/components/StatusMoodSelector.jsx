import { STATUS_MOOD_OPTIONS, getStatusMoodLabel } from "../src/lib/statusMoods";

export default function StatusMoodSelector({ value, onChange, disabled = false }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">Status Mood</p>
                    <p className="text-xs text-base-content/50">Choose an activity badge to show alongside your presence.</p>
                </div>
                {value ? (
                    <span className="badge badge-outline badge-md">{getStatusMoodLabel(value)}</span>
                ) : (
                    <span className="text-xs text-base-content/40">No mood set</span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_MOOD_OPTIONS.map(({ value: moodValue, emoji, label }) => (
                    <button
                        key={moodValue}
                        type="button"
                        onClick={() => onChange(moodValue)}
                        disabled={disabled}
                        className={`btn btn-sm rounded-2xl text-left whitespace-normal break-words ${
                            value === moodValue
                                ? "btn-primary"
                                : "btn-outline"
                        }`}
                    >
                        <span className="text-base mr-2">{emoji}</span>
                        <span className="text-xs font-medium">{label}</span>
                    </button>
                ))}
            </div>

            {value && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    disabled={disabled}
                    className="btn btn-ghost btn-xs"
                >
                    Clear mood
                </button>
            )}
        </div>
    );
}
