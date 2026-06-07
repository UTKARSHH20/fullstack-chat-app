import { useEffect } from "react";
import { Activity, Clock3, Sparkles, TrendingUp } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    AreaChart,
    Area,
    Cell,
} from "recharts";
import useAnalyticsStore from "../src/store/useAnalyticsStore";

const getHeatColor = (count, maxCount) => {
    if (maxCount === 0 || count === 0) return "#e5e7eb";
    const intensity = Math.min(1, count / maxCount);
    const hue = 220 - 120 * intensity;
    return `hsl(${hue}, 85%, ${50 - intensity * 15}%)`;
};

const ConversationInsightsPage = () => {
    const { heatmap, isLoadingHeatmap, fetchConversationHeatmap } = useAnalyticsStore();

    useEffect(() => {
        fetchConversationHeatmap();
    }, [fetchConversationHeatmap]);

    const hourlyActivity = heatmap?.hourlyActivity ?? [];
    const dailyActivity = heatmap?.dailyActivity ?? [];
    const peakHour = heatmap?.peakHour ?? "N/A";
    const weeklyMessages = heatmap?.weeklyMessages ?? 0;
    const mostActiveConversation = heatmap?.mostActiveConversation;
    const maxHourlyCount = Math.max(0, ...hourlyActivity.map((item) => item.count));

    const averageMessagesPerDay = dailyActivity.length
        ? Math.round(dailyActivity.reduce((sum, item) => sum + item.count, 0) / dailyActivity.length)
        : 0;

    return (
        <div className="min-h-screen bg-base-200 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Conversation Insights</h1>
                        <p className="text-sm text-base-content/60 mt-1">
                            Analyze message activity, discover your most active chat windows, and track weekly trends.
                        </p>
                    </div>
                    <div className="badge badge-lg badge-primary gap-2">
                        <Activity className="w-4 h-4" />
                        Live analytics
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body">
                            <div className="flex items-center gap-3 mb-4">
                                <Clock3 className="w-6 h-6 text-primary" />
                                <h2 className="card-title text-base">Peak Activity</h2>
                            </div>
                            <p className="text-4xl font-semibold">{peakHour}</p>
                            <p className="mt-2 text-sm text-base-content/70">Most active messaging window.</p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles className="w-6 h-6 text-secondary" />
                                <h2 className="card-title text-base">Most Active Chat</h2>
                            </div>
                            {mostActiveConversation ? (
                                <>
                                    <p className="text-xl font-semibold">
                                        {mostActiveConversation.partner?.name || "Conversation"}
                                    </p>
                                    <p className="mt-2 text-sm text-base-content/70">
                                        {mostActiveConversation.messageCount} messages in the last week.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-base-content/70">No active conversations found yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="w-6 h-6 text-accent" />
                                <h2 className="card-title text-base">Weekly Messages</h2>
                            </div>
                            <p className="text-4xl font-semibold">{weeklyMessages}</p>
                            <p className="mt-2 text-sm text-base-content/70">Messages recorded in the last 7 days.</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="card-title">Hourly Heatmap</h2>
                                    <p className="text-sm text-base-content/70">See when messages spike during the day.</p>
                                </div>
                                <span className="badge badge-outline">24h</span>
                            </div>

                            {isLoadingHeatmap ? (
                                <div className="min-h-65 flex items-center justify-center">
                                    <span className="loading loading-spinner loading-lg"></span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={hourlyActivity} margin={{ top: 10, right: 0, left: -10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                                        <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            formatter={(value) => [`${value} messages`, "Count"]}
                                            labelFormatter={(label) => `Hour ${label}:00`}
                                        />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                            {hourlyActivity.map((entry) => (
                                                <Cell key={entry.hour} fill={getHeatColor(entry.count, maxHourlyCount)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-sm border border-base-200">
                        <div className="card-body">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="card-title">Weekly Activity</h2>
                                    <p className="text-sm text-base-content/70">Daily message trends for the current week.</p>
                                </div>
                                <span className="badge badge-outline">7 days</span>
                            </div>

                            {isLoadingHeatmap ? (
                                <div className="min-h-65 flex items-center justify-center">
                                    <span className="loading loading-spinner loading-lg"></span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={dailyActivity} margin={{ top: 10, right: 0, left: -10, bottom: 10 }}>
                                        <defs>
                                            <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.12} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                        <Tooltip formatter={(value) => [`${value} messages`, "Count"]} />
                                        <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#weeklyGradient)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-sm border border-base-200">
                    <div className="card-body">
                        <h2 className="card-title">Activity Summary</h2>
                        <div className="grid gap-3 md:grid-cols-3 mt-4">
                            <div className="rounded-2xl border border-base-200 bg-base-200 p-4">
                                <p className="text-sm text-base-content/70">Average per day</p>
                                <p className="text-2xl font-semibold mt-2">{averageMessagesPerDay}</p>
                            </div>
                            <div className="rounded-2xl border border-base-200 bg-base-200 p-4">
                                <p className="text-sm text-base-content/70">Most active day</p>
                                <p className="text-2xl font-semibold mt-2">
                                    {dailyActivity.reduce((best, item) => item.count > best.count ? item : best, { day: "N/A", count: 0 }).day}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-base-200 bg-base-200 p-4">
                                <p className="text-sm text-base-content/70">Data refreshed</p>
                                <p className="text-2xl font-semibold mt-2">Auto</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConversationInsightsPage;
