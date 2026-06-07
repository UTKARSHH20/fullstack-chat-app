import { useEffect, useState } from "react";

export default function ListeningStatusSelector({ currentTrack, currentArtist, isListening, onSave, onClear, disabled = false }) {
    const [enabled, setEnabled] = useState(Boolean(isListening));
    const [track, setTrack] = useState(currentTrack || "");
    const [artist, setArtist] = useState(currentArtist || "");

    useEffect(() => {
        setEnabled(Boolean(isListening));
        setTrack(currentTrack || "");
        setArtist(currentArtist || "");
    }, [currentTrack, currentArtist, isListening]);

    const handleToggle = () => {
        if (enabled) {
            onClear();
            setEnabled(false);
            return;
        }
        setEnabled(true);
    };

    const handleSave = () => {
        if (!track.trim() || !artist.trim()) return;
        onSave({
            currentTrack: track.trim(),
            currentArtist: artist.trim(),
            isListening: true,
        });
    };

    const handleClear = () => {
        setTrack("");
        setArtist("");
        setEnabled(false);
        onClear();
    };

    return (
        <div className="rounded-2xl border border-base-200 bg-base-100 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-semibold">Listening Status</p>
                    <p className="text-xs text-base-content/50 mt-1">
                        Share the song you are currently listening to with your contacts.
                    </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm">Enabled</span>
                    <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={enabled}
                        disabled={disabled}
                        onChange={handleToggle}
                    />
                </label>
            </div>

            <div className="grid gap-3">
                <label className="input-group">
                    <span>Song</span>
                    <input
                        type="text"
                        value={track}
                        onChange={(e) => setTrack(e.target.value)}
                        disabled={!enabled || disabled}
                        placeholder="Blinding Lights"
                        className="input input-bordered w-full"
                    />
                </label>
                <label className="input-group">
                    <span>Artist</span>
                    <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        disabled={!enabled || disabled}
                        placeholder="The Weeknd"
                        className="input input-bordered w-full"
                    />
                </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleClear}
                    disabled={disabled || !enabled}
                >
                    Clear
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                    disabled={disabled || !enabled || !track.trim() || !artist.trim()}
                >
                    Save Listening Status
                </button>
            </div>
        </div>
    );
}
