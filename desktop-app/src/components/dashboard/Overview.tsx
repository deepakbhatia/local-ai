import React, { useMemo } from 'react';
import { useCollectionsStore } from '../../store/collections';
import { useAskStore } from '../../store/ask';
import { useWriteStore } from '../../store/write';
import {
    FileText,
    Layers,
    MessageSquare,
    Zap,
    Plus,
    MessageCircle,
    PenLine,
    ArrowRight,
    Search
} from 'lucide-react';
import { clsx } from 'clsx';
import { useDateFormat } from '../../hooks/useDateFormat';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description: string;
    trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend }) => (
    <div className="bg-surface border border-border p-6 rounded-xl hover:shadow-md transition-all duration-300 group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-accent/5 rounded-lg text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                {icon}
            </div>
            {trend && (
                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full uppercase tracking-tighter italic">
                    {trend}
                </span>
            )}
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
        <div className="text-sm font-semibold text-text-primary mb-1">{title}</div>
        <div className="text-xs text-text-muted">{description}</div>
    </div>
);

export const Overview: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    const collections = useCollectionsStore(state => state.collections);
    const sessions = useAskStore(state => state.sessions);
    const drafts = useWriteStore(state => state.drafts);
    const { formatTime } = useDateFormat();

    const stats = useMemo(() => {
        const totalDocs = collections.reduce((acc, col) => acc + col.documentCount, 0);
        const totalCollections = collections.length;

        // Questions asked today
        const today = new Date().setHours(0, 0, 0, 0);
        const questionsToday = sessions.reduce((acc, session) => {
            const todayMsgs = session.messages.filter(m => m.role === 'user' && m.timestamp >= today);
            return acc + todayMsgs.length;
        }, 0);

        // Recent activity: combined last 5 chat messages and last 5 drafts
        type ActivityItem = { type: 'ask' | 'write'; content: string; timestamp: number; sessionTitle: string };

        const askActivities: ActivityItem[] = sessions
            .flatMap(s => s.messages.filter(m => m.role === 'user').map(m => ({
                type: 'ask' as const,
                content: m.content,
                timestamp: m.timestamp,
                sessionTitle: s.title
            })));

        const writeActivities: ActivityItem[] = drafts.map(d => ({
            type: 'write' as const,
            content: d.title,
            timestamp: d.updatedAt,
            sessionTitle: 'Draft'
        }));

        const recentActivity = [...askActivities, ...writeActivities]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        return {
            totalDocs,
            totalCollections,
            questionsToday,
            recentActivity
        };
    }, [collections, sessions, drafts]);

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Hero Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">LocalMind Control</h1>
                    <p className="text-text-secondary">Your offline second brain is indexed and ready.</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Knowledge Base"
                    value={stats.totalDocs}
                    icon={<FileText size={20} />}
                    description="Documents fully indexed"
                    trend="+2 today"
                />
                <StatCard
                    title="Collections"
                    value={stats.totalCollections}
                    icon={<Layers size={20} />}
                    description="Themed data sets"
                />
                <StatCard
                    title="AI Inquiries"
                    value={stats.questionsToday}
                    icon={<MessageSquare size={20} />}
                    description="Questions solved today"
                    trend={`${stats.questionsToday > 0 ? 'Active' : 'Idle'}`}
                />
                <StatCard
                    title="Response Speed"
                    value="0.3s"
                    icon={<Zap size={20} />}
                    description="Avg. local latency"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Quick Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Quick Actions</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => onNavigate('collections')}
                            className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:border-accent group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div className="text-start font-semibold">New Collection</div>
                            </div>
                            <ArrowRight size={16} className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => onNavigate('ask')}
                            className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:border-accent group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
                                    <Search size={20} />
                                </div>
                                <div className="text-start font-semibold">Ask Documents</div>
                            </div>
                            <ArrowRight size={16} className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => onNavigate('write')}
                            className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:border-accent group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
                                    <PenLine size={20} />
                                </div>
                                <div className="text-start font-semibold">Start Writing</div>
                            </div>
                            <ArrowRight size={16} className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Recent Activity</h3>
                    <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
                        {stats.recentActivity.map((activity, i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors cursor-pointer">
                                <div className="flex items-center gap-4 truncate">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-white",
                                        activity.type === 'ask' ? "bg-blue-500" : "bg-purple-500"
                                    )}>
                                        {activity.type === 'ask' ? <MessageCircle size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="truncate">
                                        <div className="text-sm font-semibold truncate max-w-md">{activity.content}</div>
                                        <div className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">{activity.sessionTitle} • {formatTime(activity.timestamp)}</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-text-muted" />
                            </div>
                        ))}
                        {stats.recentActivity.length === 0 && (
                            <div className="p-12 text-center text-text-muted">
                                No recent activity yet. Start by asking a question!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);
