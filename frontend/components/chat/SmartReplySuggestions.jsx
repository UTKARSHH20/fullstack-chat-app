import { useMemo } from "react";

export default function SmartReplySuggestions({ suggestions, loading, onSelect }) {
    const suggestionButtons = useMemo(() => suggestions || [], [suggestions]);

    if (loading) {
        return (
            <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="loading loading-spinner loading-xs" />
                    <span className="text-xs text-base-content/60">Loading suggestions…</span>
                </div>
            </div>
        );
    }

    if (suggestionButtons.length === 0) {
        return null;
    }

    return (
        <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
                {suggestionButtons.map((reply) => (
                    <button
                        key={reply}
                        type="button"
                        onClick={() => onSelect(reply)}
                        className="btn btn-xs btn-outline btn-secondary"
                    >
                        {reply}
                    </button>
                ))}
            </div>
        </div>
    );
}
