export default function ListeningStatusBadge({ currentTrack, currentArtist, compact = false }) {
    if (!currentTrack || !currentArtist) return null;

    return (
        <div className={`rounded-2xl border border-base-200 bg-base-100 ${compact ? "px-2 py-1 text-[10px]" : "p-3 text-sm"}`}>
            <p className={`flex items-center gap-2 font-semibold ${compact ? "text-xs text-info" : "text-sm text-info"}`}>
                <span>🎵</span>
                Listening To
            </p>
            <p className={`mt-1 font-semibold ${compact ? "text-[11px]" : "text-base"}`}>
                {currentTrack}
            </p>
            <p className={compact ? "text-[10px] text-base-content/60" : "text-sm text-base-content/60"}>
                {currentArtist}
            </p>
        </div>
    );
}
