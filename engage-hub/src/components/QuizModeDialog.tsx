import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Clock, BookOpen, ChevronRight } from "lucide-react";

interface QuizModeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quizId: string;
    level: string;
}

export const QuizModeDialog = ({ open, onOpenChange, quizId, level }: QuizModeDialogProps) => {
    const navigate = useNavigate();
    const [selectedMode, setSelectedMode] = useState<string | null>(null);

    const getTimePerQuestion = (difficulty: string) => {
        const difficultyLower = difficulty.toLowerCase();
        if (difficultyLower === 'easy') return '10 seconds';
        if (difficultyLower === 'medium') return '20 seconds';
        if (difficultyLower === 'hard') return '30 seconds';
        return '20 seconds'; // default
    };

    const modes = [
        {
            id: 'fast-paced',
            title: 'Fast Paced',
            subtitle: 'Challenge yourself',
            description: `${getTimePerQuestion(level)} per question`,
            icon: Zap,
            color: 'violet',
            gradient: 'from-violet-500 to-purple-500',
            bgColor: 'bg-violet-500/10',
            borderColor: 'border-violet-500/20',
            textColor: 'text-violet-600 dark:text-violet-400',
        },
        {
            id: 'time-based',
            title: 'Time Based',
            subtitle: 'Classic mode',
            description: 'Complete quiz within total time limit',
            icon: Clock,
            color: 'orange',
            gradient: 'from-orange-500 to-amber-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
            textColor: 'text-orange-600 dark:text-orange-400',
        },
        {
            id: 'learning-based',
            title: 'Learning Based',
            subtitle: 'Practice mode',
            description: 'No timer, no XP points earned',
            icon: BookOpen,
            color: 'blue',
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            textColor: 'text-blue-600 dark:text-blue-400',
        },
    ];

    const handleStartQuiz = () => {
        if (selectedMode) {
            navigate(`/quiz/start/${quizId}?type=${selectedMode}`);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Choose Quiz Mode</DialogTitle>
                    <DialogDescription>
                        Select how you'd like to take this quiz
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {modes.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = selectedMode === mode.id;

                        return (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`
                                    w-full p-4 rounded-xl border-2 transition-all duration-200
                                    flex items-start gap-4 text-left
                                    hover:shadow-md hover:scale-[1.02]
                                    ${isSelected
                                        ? `${mode.borderColor} ${mode.bgColor} shadow-md`
                                        : 'border-border/50 hover:border-primary/30'
                                    }
                                `}
                            >
                                <div className={`
                                    p-3 rounded-lg shrink-0
                                    ${isSelected ? mode.bgColor : 'bg-muted'}
                                `}>
                                    <Icon className={`w-6 h-6 ${isSelected ? mode.textColor : 'text-muted-foreground'}`} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg">{mode.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${mode.bgColor} ${mode.textColor}`}>
                                            {mode.subtitle}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                                </div>

                                {isSelected && (
                                    <div className="shrink-0">
                                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${mode.gradient} flex items-center justify-center`}>
                                            <svg
                                                className="w-4 h-4 text-white"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="3"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStartQuiz}
                        disabled={!selectedMode}
                        className="flex-1 gradient-primary text-white"
                    >
                        Start Quiz
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
