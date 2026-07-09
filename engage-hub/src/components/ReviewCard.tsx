import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
    Copy, 
    CheckCircle2, 
    XCircle, 
    CalendarDays, 
    ExternalLink, 
    Hash,
    Zap,
    Timer,
    BookOpen,
    Layers
} from "lucide-react";
import { useState } from "react";

interface ReviewCardProps {
    attempt_id: number;
    quiz_id: string;
    title: string;
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
    quiz_type?: string; 
}

export const ReviewCard = ({ 
    attempt_id, 
    quiz_id, 
    title, 
    score, 
    total_questions, 
    percentage, 
    completed_at,
    quiz_type
}: ReviewCardProps) => {
    
    const [copied, setCopied] = useState(false);

    const handleCopyId = () => {
        navigator.clipboard.writeText(quiz_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric'
        });
    };

    // Configuration for Quiz Types
    const getQuizTypeConfig = (type?: string) => {
        // STRICT CHECK: If no type is provided, return null to hide the badge
        if (!type) return null;

        const effectiveType = type.toLowerCase().replace(' ', '-');
        
        switch (effectiveType) {
            case 'fast-paced':
                return { 
                    style: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-200/20', 
                    icon: <Zap className="w-3 h-3" />, 
                    label: 'Fast Paced' 
                };
            case 'learning-based':
                return { 
                    style: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-200/20', 
                    icon: <BookOpen className="w-3 h-3" />, 
                    label: 'Learning Based' 
                };
            case 'time-based':
                return { 
                    style: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-200/20', 
                    icon: <Timer className="w-3 h-3" />, 
                    label: 'Time Based' 
                };
            default:
                // Fallback for unknown types if they exist in DB
                return { 
                    style: 'text-muted-foreground bg-muted border-border', 
                    icon: <Layers className="w-3 h-3" />, 
                    label: type 
                };
        }
    };

    const typeConfig = getQuizTypeConfig(quiz_type);

    // Determine Status Color
    const isPassing = percentage >= 60;
    const statusColor = isPassing ? "text-emerald-500" : "text-rose-500";
    const statusBg = isPassing ? "bg-emerald-500/10" : "bg-rose-500/10";
    const StatusIcon = isPassing ? CheckCircle2 : XCircle;

    return (
        <div className="bg-card/80 group relative w-full rounded-xl border border-border/50 bg-background/50 p-4 hover:bg-muted/30 transition-all duration-300 hover:shadow-md hover:border-primary/20">
            
            {/* Top Right: Copyable Quiz ID */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50 select-text border border-border/50 rounded px-1.5 py-0.5 bg-background/50">
                    <Hash className="w-3 h-3" />
                    <span>{quiz_id}</span>
                </div>
                <button 
                    onClick={handleCopyId}
                    className="p-1 text-muted-foreground/60 hover:text-primary transition-colors"
                    title="Copy Quiz ID"
                >
                    {copied ? <span className="text-[10px] font-bold text-green-500">Copied</span> : <Copy className="w-3 h-3" />}
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {/* Header Section */}
                <div className="pr-20 space-y-1"> 
                    <h4 className="font-bold text-foreground text-base line-clamp-1" title={title}>
                        {title}
                    </h4>
                    
                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {/* CONDITIONAL RENDER: Only show if typeConfig is not null */}
                        {typeConfig && (
                            <>
                                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wide ${typeConfig.style}`}>
                                    {typeConfig.icon}
                                    {typeConfig.label}
                                </span>
                                <span>•</span>
                            </>
                        )}

                        <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(completed_at)}
                        </span>
                        
                        <span>•</span>
                        
                        <span className={`flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${statusBg} ${statusColor}`}>
                            <StatusIcon className="w-3 h-3" />
                            {isPassing ? "Passed" : "Failed"}
                        </span>
                    </div>
                </div>

                {/* Middle: Score & Progress */}
                <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Score: <span className="text-foreground">{score}/{total_questions}</span></span>
                            <span className={statusColor}>{percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${isPassing ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom: Action Link */}
                <div className="flex justify-end pt-1">
                    <Link to={`/quiz/review/${attempt_id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-primary/10 hover:text-primary group-hover:underline decoration-primary/50 underline-offset-4">
                            Review Answers
                            <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};