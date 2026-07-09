import { Button } from "@/components/ui/button";
import {
    Clock,
    ListChecks,
    CalendarDays,
    Share2,
    Copy,
    Layers
} from "lucide-react";
import { useState } from "react";
import { QuizModeDialog } from "@/components/QuizModeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface QuizCardProps {
    quiz_id: string;
    title: string;
    topic: string;
    level: string;
    num_questions: number;
    duration_seconds: number;
    created_at?: string | null;
    language?: string;
}

export const QuizCard = ({
    quiz_id,
    title,
    topic,
    level,
    num_questions,
    duration_seconds,
    created_at,
    language
}: QuizCardProps) => {

    const [copied, setCopied] = useState(false);
    const [showModeDialog, setShowModeDialog] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Default to English if language is not provided (backwards compatibility)
    const displayLanguage = language || 'English';

    const handleCopyId = () => {
        navigator.clipboard.writeText(quiz_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copied!",
            description: "Quiz ID copied to clipboard",
        });
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/quiz/${quiz_id}`;
        navigator.clipboard.writeText(shareUrl);
        toast({
            title: "Link Copied!",
            description: "Quiz share link copied to clipboard",
        });
    };

    const getLevelStyle = (level: string) => {
        const levelLower = (level || '').toLowerCase();
        if (levelLower === 'easy') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        if (levelLower === 'medium') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
        if (levelLower === 'hard') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
    };

    const getLanguageFlag = (lang: string) => {
        const l = lang.toLowerCase();
        if (l === 'hindi') return '🇮🇳';
        if (l === 'spanish') return '🇪🇸';
        if (l === 'french') return '🇫🇷';
        if (l === 'german') return '🇩🇪';
        if (l === 'italian') return '🇮🇹';
        if (l === 'portuguese') return '🇵🇹';
        if (l === 'russian') return '🇷🇺';
        if (l === 'japanese') return '🇯🇵';
        if (l === 'chinese') return '🇨🇳';
        return '🇬🇧'; // Default to UK flag for English/Others
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-card backdrop-blur-sm group relative w-full rounded-xl border border-border/50 p-5 transition-all duration-300 hover:shadow-lg hover:border-primary hover:-translate-y-1">

            {/* Top Right: Actions */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                    onClick={handleCopyId}
                    className="p-1.5 text-muted-foreground/60 hover:text-primary transition-colors rounded-md hover:bg-background/80"
                    title="Copy Quiz ID"
                >
                    {copied ? <span className="text-[10px] font-bold text-green-500">Copied</span> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/50 select-text border-l border-r border-border/50 px-2 h-4">
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-wider opacity-70">ID</span>
                    <span>{quiz_id}</span>
                </div>

                <button
                    onClick={handleShare}
                    className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors rounded-full hover:bg-background/80"
                    title="Share Quiz Link"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">

                {/* Content */}
                <div className="flex-1 space-y-2.5 pr-2 sm:pr-0">

                    {/* Title & Level */}
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-foreground tracking-tight line-clamp-1">
                            {title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getLevelStyle(level)}`}>
                            {level || 'Normal'}
                        </span>
                    </div>

                    {/* Topic & Language */}
                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-primary/60" />
                            <span>{topic || 'General Knowledge'}</span>
                        </div>
                        <span className="text-border/60">|</span>
                        <div className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-0.5 rounded-full">
                            <span>{getLanguageFlag(displayLanguage)}</span>
                            <span>{displayLanguage}</span>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary/70" />
                            <span>{Math.floor((duration_seconds || 0) / 60)} mins</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <ListChecks className="w-3.5 h-3.5 text-primary/70" />
                            <span>{num_questions} Qs</span>
                        </div>

                        {created_at && (
                            <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-primary/70" />
                                <span>{formatDate(created_at)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Start Button */}
                <div className="flex sm:flex-col justify-end items-end sm:min-w-[120px]">
                    <Button
                        size="sm"
                        onClick={() => {
                            if (!user) {
                                navigate("/login", { state: { from: location } });
                            } else {
                                setShowModeDialog(true);
                            }
                        }}
                        className="gradient-primary text-white shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all w-full sm:w-32"
                    >
                        {user ? "Start Quiz" : "Login to Start"}
                    </Button>
                </div>
            </div>

            {/* Quiz Mode Selection Dialog */}
            <QuizModeDialog
                open={showModeDialog}
                onOpenChange={setShowModeDialog}
                quizId={quiz_id}
                level={level}
            />
        </div>
    );
};