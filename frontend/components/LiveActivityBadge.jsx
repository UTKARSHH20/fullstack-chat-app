import { getLiveActivityLabel } from "../src/lib/statusMoods";

export default function LiveActivityBadge({ currentActivity, compact = false }) {
    if (!currentActivity) return null;

    const label = getLiveActivityLabel(currentActivity);
    if (!label) return null;

    return (
        <div className={`rounded-2xl border border-base-200 bg-base-100 ${compact ? "px-2 py-1 text-[10px]" : "p-3 text-sm"}`}>
            <p className={`flex items-center gap-2 font-semibold ${compact ? "text-xs text-info" : "text-sm text-info"}`}>
                <span>{label.split(" ")[0]}</span>
                <span>{label.replace(/^\S+\s*/, "")}</span>
            </p>
            {!compact && (
                <p className="mt-1 text-sm text-base-content/60">
                    Active now
                </p>
            )}
        </div>
    );
}
