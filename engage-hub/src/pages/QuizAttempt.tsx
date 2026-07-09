import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, RefreshCcw, Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

// Helper to manage local storage keys
const getStorageKey = (quizId: string, key: string) => `quiz_${quizId}_${key}`;

const QuizAttempt = () => {
    const { quizId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { setQuizActive, setQuizSubmitHandler } = useQuizNavigation();

    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // For time-based mode
    const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number | null>(null); // For fast-paced per-question timer
    const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<{ [key: number]: number }>({}); // Track time spent on each question for fast-paced
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);


    // --- 1. DATA FETCHING & STATE RESTORATION ---
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                let response;
                let isFromCSV = false;
                try {
                    response = await api.getQuizQuestions(quizId!);
                } catch (dbError) {
                    response = await api.getQuizQuestionsFromCSV(quizId!);
                    isFromCSV = true;
                }

                let quizData;
                // ... (Parsing logic remains the same) ...
                if (isFromCSV && response.success && response.quiz_info) {
                    quizData = {
                        quiz_id: response.quiz_info.quiz_id,
                        title: response.quiz_info.title,
                        category: response.quiz_info.category,
                        level: response.quiz_info.level,
                        quiz_type: response.quiz_info.quiz_type, // Fetch Type
                        duration_seconds: parseInt(response.quiz_info.duration_seconds) || 600,
                        language: response.quiz_info.language || 'English',
                        questions: response.questions.map((q: any) => ({
                            text: q.question_text,
                            options: Object.values(q.options),
                            correct_answer: q.correct_answer
                        }))
                    };
                } else if (response.success && (response.data || response.quiz_id)) {
                    const quizInfo = response.data || response;
                    quizData = {
                        quiz_id: quizInfo.quiz_id,
                        title: quizInfo.title,
                        category: quizInfo.category,
                        level: quizInfo.level || quizInfo.difficulty_level,
                        quiz_type: quizInfo.quiz_type, // Fetch Type
                        duration_seconds: quizInfo.duration_seconds,
                        language: quizInfo.language || 'English',
                        questions: quizInfo.questions.map((q: any) => ({
                            text: q.text || q.question_text,
                            options: Array.isArray(q.options) ? q.options : Object.values(q.options),
                            correct_answer: q.correct_answer
                        }))
                    };
                } else {
                    throw new Error('Invalid response format');
                }

                // Override quiz_type if provided in URL query parameter
                const urlQuizType = searchParams.get('type');
                if (urlQuizType) {
                    quizData.quiz_type = urlQuizType;
                }

                setQuiz(quizData);
                setQuestions(quizData.questions || []);

                // --- RESTORE ANSWERS ---
                const savedAnswers = localStorage.getItem(getStorageKey(quizId!, 'answers'));
                if (savedAnswers) {
                    setSelectedAnswers(JSON.parse(savedAnswers));
                }

                // --- TIMER SETUP (Persistence) ---
                const quizType = quizData.quiz_type || 'time-based';

                if (quizType !== 'learning-based') {
                    const savedEndTime = localStorage.getItem(getStorageKey(quizId!, 'endTime'));
                    const now = Date.now();

                    if (savedEndTime) {
                        // Calculate remaining time based on stored target time
                        const remaining = Math.floor((parseInt(savedEndTime) - now) / 1000);
                        if (remaining <= 0) {
                            setTimeRemaining(0);
                        } else {
                            setTimeRemaining(remaining);
                        }
                    } else {
                        // First start: Set target time
                        let duration = quizData.duration_seconds || 600;

                        // For fast-paced mode, calculate total time based on difficulty
                        if (quizType === 'fast-paced') {
                            const level = (quizData.level || 'medium').toLowerCase();
                            let timePerQuestion = 20; // default medium
                            if (level === 'easy') timePerQuestion = 10;
                            else if (level === 'hard') timePerQuestion = 30;

                            duration = timePerQuestion * quizData.questions.length;
                        }

                        const targetTime = now + (duration * 1000);
                        localStorage.setItem(getStorageKey(quizId!, 'endTime'), targetTime.toString());
                        setTimeRemaining(duration);
                    }
                }

            } catch (error) {
                console.error('Failed to fetch quiz:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load quiz.' });
                navigate("/dashboard");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [quizId, toast, navigate]);

    // --- 1.5. REGISTER QUIZ AS ACTIVE & SETUP NAVIGATION BLOCKING ---
    useEffect(() => {
        if (!loading && !quizCompleted) {
            // Register quiz as active
            setQuizActive(true);

            // Register submit handler that context can call
            const submitHandler = async () => { await handleSubmitQuiz(); };
            setQuizSubmitHandler(submitHandler);

            // Prevent accidental browser navigation/refresh
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            // Cleanup
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                setQuizActive(false);
            };
        }
    }, [loading, quizCompleted]); // Removed setQuizActive and setQuizSubmitHandler to prevent re-renders

    // --- 2. TIMER TICK LOGIC ---
    useEffect(() => {
        if (loading || quizCompleted) return;

        const quizType = quiz?.quiz_type || 'time-based';
        if (quizType === 'learning-based') return; // No timer for learning mode

        // If timeRemaining is null, wait for initialization
        if (timeRemaining === null) return;

        if (timeRemaining <= 0) {
            handleSubmitQuiz();
            return;
        }

        const timer = setInterval(() => {
            // Re-calculate based on Date.now() to prevent drift and handle tab switching
            const savedEndTime = localStorage.getItem(getStorageKey(quizId!, 'endTime'));
            if (savedEndTime) {
                const now = Date.now();
                const remaining = Math.ceil((parseInt(savedEndTime) - now) / 1000);

                if (remaining <= 0) {
                    setTimeRemaining(0);
                    clearInterval(timer);
                    handleSubmitQuiz();
                } else {
                    setTimeRemaining(remaining);
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, quizCompleted, loading, quiz, quizId]);

    // --- 2.5. PER-QUESTION TIMER FOR FAST-PACED MODE ---
    useEffect(() => {
        if (loading || quizCompleted) return;

        const quizType = quiz?.quiz_type || 'time-based';
        if (quizType !== 'fast-paced') return;

        // Calculate time per question based on difficulty
        const level = (quiz?.level || 'medium').toLowerCase();
        let timePerQuestion = 20; // default medium
        if (level === 'easy') timePerQuestion = 10;
        else if (level === 'hard') timePerQuestion = 30;

        // Initialize timer for current question
        if (questionTimeRemaining === null) {
            setQuestionTimeRemaining(timePerQuestion);
            return;
        }

        // Auto-advance when time runs out
        if (questionTimeRemaining <= 0) {
            // Track time spent on this question (full time allocated)
            const level = (quiz?.level || 'medium').toLowerCase();
            let timePerQuestion = 20;
            if (level === 'easy') timePerQuestion = 10;
            else if (level === 'hard') timePerQuestion = 30;

            setTimeSpentPerQuestion(prev => ({
                ...prev,
                [currentQuestionIndex]: timePerQuestion // Full time used
            }));

            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setQuestionTimeRemaining(timePerQuestion); // Reset for next question
            } else {
                // Last question, submit quiz
                handleSubmitQuiz();
            }
            return;
        }

        // Countdown timer
        const timer = setInterval(() => {
            setQuestionTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [questionTimeRemaining, currentQuestionIndex, quizCompleted, loading, quiz, questions.length]);

    // --- 2.6. RESET QUESTION TIMER WHEN MOVING TO NEXT QUESTION IN FAST-PACED MODE ---
    useEffect(() => {
        if (loading || quizCompleted) return;

        const quizType = quiz?.quiz_type || 'time-based';
        if (quizType !== 'fast-paced') return;

        // Reset question timer when index changes (for manual navigation)
        const level = (quiz?.level || 'medium').toLowerCase();
        let timePerQuestion = 20;
        if (level === 'easy') timePerQuestion = 10;
        else if (level === 'hard') timePerQuestion = 30;

        setQuestionTimeRemaining(timePerQuestion);
    }, [currentQuestionIndex, quiz, loading, quizCompleted]);

    // --- 2.7. TRACK TIME SPENT WHEN MANUALLY MOVING TO NEXT QUESTION IN FAST-PACED MODE ---
    const handleNextFastPaced = () => {
        if (isFastPaced && questionTimeRemaining !== null) {
            // Calculate time spent on current question
            const level = (quiz?.level || 'medium').toLowerCase();
            let timePerQuestion = 20;
            if (level === 'easy') timePerQuestion = 10;
            else if (level === 'hard') timePerQuestion = 30;

            const timeSpent = timePerQuestion - questionTimeRemaining;
            setTimeSpentPerQuestion(prev => ({
                ...prev,
                [currentQuestionIndex]: timeSpent
            }));
        }
    };


    // --- 3. HANDLERS ---

    // Determine Logic based on Type
    const getQuizType = () => quiz?.quiz_type || 'time-based';
    const isFastPaced = getQuizType() === 'fast-paced';
    const isLearning = getQuizType() === 'learning-based';


    // --- TTS HOOK ---
    const { speak, cancel, isSpeaking } = useTextToSpeech();

    // Stop speaking when moving to next/prev question
    useEffect(() => {
        cancel();
        return () => cancel();
    }, [currentQuestionIndex, cancel]);

    const handleSpeakQuestion = (question: any) => {
        if (isSpeaking) {
            cancel();
            return;
        }

        const language = quiz?.language || 'English';

        let textToSpeak = `Question. ${question.text}. `;
        question.options.forEach((opt: string, idx: number) => {
            textToSpeak += `Option ${String.fromCharCode(65 + idx)}. ${opt}. `;
        });

        speak(textToSpeak, language);
    };


    const handleAnswerSelect = (answer: string) => {
        // Prevent changing answers during submission
        if (isSubmitting) return;

        const newAnswers = { ...selectedAnswers, [currentQuestionIndex]: answer };
        setSelectedAnswers(newAnswers);

        // Save to local storage immediately
        localStorage.setItem(getStorageKey(quizId!, 'answers'), JSON.stringify(newAnswers));
    };

    const handleNext = () => {
        cancel(); // Stop speaking
        if (isFastPaced) {
            handleNextFastPaced(); // Track time before moving
        }
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        cancel(); // Stop speaking
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const clearQuizData = () => {
        localStorage.removeItem(getStorageKey(quizId!, 'endTime'));
        localStorage.removeItem(getStorageKey(quizId!, 'answers'));
    };

    const confirmSubmit = () => {
        setShowConfirmDialog(true);
    };

    const handleSubmitQuiz = async () => {
        if (quizCompleted || isSubmitting) return; // Prevent double submit

        setShowConfirmDialog(false); // Close dialog
        setIsSubmitting(true); // Start loading state

        // Calculate final stats
        const score = questions.reduce((acc, q, idx) => selectedAnswers[idx] === q.correct_answer ? acc + 1 : acc, 0);
        const totalQuestions = questions.length;
        const scorePercentage = Math.round((score / totalQuestions) * 100);

        // Calculate time taken
        let timeTaken = 0;
        if (!isLearning) {
            if (isFastPaced) {
                // For fast-paced: sum up time spent on all questions
                // Add time spent on current question (last question before submit)
                const level = (quiz?.level || 'medium').toLowerCase();
                let timePerQuestion = 20;
                if (level === 'easy') timePerQuestion = 10;
                else if (level === 'hard') timePerQuestion = 30;

                const currentQuestionTime = timePerQuestion - (questionTimeRemaining || 0);
                const updatedTimeSpent = {
                    ...timeSpentPerQuestion,
                    [currentQuestionIndex]: currentQuestionTime
                };

                // Sum all time spent
                timeTaken = Object.values(updatedTimeSpent).reduce((sum, time) => sum + time, 0);
            } else {
                // For time-based: use original calculation
                const duration = quiz?.duration_seconds || 600;
                const currentRemaining = timeRemaining || 0;
                timeTaken = duration - currentRemaining;
            }
        }

        // Calculate XP based on difficulty: easy=5, medium=10, hard=15 per correct answer
        const difficulty = quiz?.difficulty?.toLowerCase() || 'medium';
        const xpPerQuestion = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;
        const xpEarned = score * xpPerQuestion;

        try {
            await api.saveQuizAttempt(quizId!, selectedAnswers, timeTaken, quiz?.quiz_type);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false); // Reset on error
            return;
        }

        // Clear persistence
        clearQuizData();
        setQuizCompleted(true);
        setIsSubmitting(false); // Reset loading state

        // Deactivate quiz in context (allows navigation)
        setQuizActive(false);

        // Format time taken for display
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Navigate to results page with quiz data
        navigate('/results', {
            state: {
                quizId: quizId,
                quizTitle: quiz?.title || 'Quiz',
                category: quiz?.category || 'General',
                score: scorePercentage,
                correctAnswers: score,
                totalQuestions: totalQuestions,
                timeTaken: timeFormatted,
                timeInSeconds: timeTaken,
                difficulty: quiz?.difficulty || 'Medium',
                xpEarned: xpEarned,
                quizType: quiz?.quiz_type || 'time-based', // Pass quiz type to results page
                questions: questions.map((q, idx) => ({
                    id: q.id,
                    question: q.question,
                    correct: selectedAnswers[idx] === q.correct_answer,
                    yourAnswer: selectedAnswers[idx] || 'Not answered',
                    correctAnswer: q.correct_answer,
                })),
            },
        });
    };

    const handleRetake = () => {
        clearQuizData();
        window.location.reload();
    };

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    // --- COMPLETED VIEW ---
    if (quizCompleted) {
        const score = questions.reduce((acc, q, idx) => selectedAnswers[idx] === q.correct_answer ? acc + 1 : acc, 0);
        const percentage = Math.round((score / questions.length) * 100);

        return (
            <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
                <main className="flex-1 flex items-center justify-center p-4 pt-24 md:pt-28 relative overflow-hidden">
                    <div className="absolute w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] top-10 -left-20 pointer-events-none" />
                    <div className="w-full max-w-3xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl max-h-full flex flex-col">
                        <div className="text-center mb-4 shrink-0">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h2 className="text-2xl font-bold text-foreground">Quiz Completed</h2>
                            <p className="text-muted-foreground">Score: {percentage}%</p>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {questions.map((q, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border text-sm ${selectedAnswers[idx] === q.correct_answer ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <p className="font-medium truncate">{q.text}</p>
                                    <div className="flex justify-between text-xs mt-1">
                                        <span>You: {selectedAnswers[idx] || '-'}</span>
                                        {selectedAnswers[idx] !== q.correct_answer && <span className="text-green-500">Ans: {q.correct_answer}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 mt-4 shrink-0">
                            <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 h-10">Back</Button>
                            <Button onClick={handleRetake} className="flex-1 h-10 gradient-primary text-white">Retake</Button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    // --- ACTIVE QUIZ VIEW ---
    return (
        <div className="h-screen w-screen bg-transparent flex flex-col overflow-hidden font-sans">
            <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 pt-20 md:pt-20 overflow-hidden relative">

                <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] top-0 -left-20 pointer-events-none" />
                <div className="absolute w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] bottom-0 -right-20 pointer-events-none" />

                <div className="w-full max-w-5xl h-full flex flex-col bg-card/95 backdrop-blur-3xl border border-white/10 dark:border-white/5 rounded-2xl shadow-xl relative overflow-hidden">

                    {/* Header */}
                    <div className="shrink-0 px-6 py-4 border-b border-white/5 bg-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                                    Question {String(currentQuestionIndex + 1).padStart(2, '0')}/{questions.length}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase">{getQuizType().replace('-', ' ')}</span>
                            </div>

                            {/* Timer Visibility */}
                            {!isLearning && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${(isFastPaced ? questionTimeRemaining : timeRemaining) && (isFastPaced ? questionTimeRemaining : timeRemaining)! < 60
                                    ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse'
                                    : 'bg-background/40 border-white/10 text-foreground'
                                    }`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="font-mono font-bold">
                                        {isFastPaced
                                            ? formatTime(questionTimeRemaining)
                                            : formatTime(timeRemaining)
                                        }
                                    </span>
                                </div>
                            )}
                            {isLearning && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm bg-blue-500/10 border-blue-500/30 text-blue-400">
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                    <span>Practice</span>
                                </div>
                            )}
                        </div>
                        <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col justify-center">
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="flex items-center justify-center gap-3 mb-6 relative">
                                <h2 className="text-lg md:text-xl font-medium leading-relaxed text-foreground text-center">
                                    {currentQuestion?.text}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSpeakQuestion(currentQuestion)}
                                    className={`shrink-0 rounded-full h-8 w-8 hover:bg-primary/10 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
                                    title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                                >
                                    {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {currentQuestion?.options.map((option: string, idx: number) => {
                                    const isSelected = selectedAnswers[currentQuestionIndex] === option;
                                    const isCorrect = option === currentQuestion.correct_answer;

                                    // DISABLE immediate feedback for fast-paced mode
                                    // User should not see correct answers until quiz is complete
                                    const showImmediateResult = false; // Changed from: isFastPaced && !!selectedAnswers[currentQuestionIndex]

                                    // Base styles
                                    let baseStyle = "border-white/10 hover:border-primary/50 hover:bg-white/5";
                                    let badgeStyle = "bg-white/5 text-muted-foreground";
                                    let icon = null;

                                    if (showImmediateResult) {
                                        // --- FAST PACED LOGIC (Show Right/Wrong) --- DISABLED
                                        if (isSelected && isCorrect) {
                                            baseStyle = "border-green-500 bg-green-500/10";
                                            badgeStyle = "bg-green-500 text-white";
                                            icon = <CheckCircle className="absolute right-3 w-4 h-4 text-green-500" />;
                                        } else if (isSelected && !isCorrect) {
                                            baseStyle = "border-red-500 bg-red-500/10";
                                            badgeStyle = "bg-red-500 text-white";
                                            icon = <AlertCircle className="absolute right-3 w-4 h-4 text-red-500" />;
                                        } else if (!isSelected && isCorrect) {
                                            baseStyle = "border-green-500/40 bg-green-500/5 border-dashed";
                                            badgeStyle = "text-green-500 border-green-500/30";
                                        } else {
                                            baseStyle = "opacity-40 border-transparent";
                                        }
                                    } else {
                                        // --- TIME BASED / LEARNING / FAST-PACED LOGIC (Standard Select) ---
                                        // Just show selection, don't reveal answer
                                        if (isSelected) {
                                            baseStyle = "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]";
                                            badgeStyle = "bg-primary text-primary-foreground";
                                            icon = <div className="absolute right-3 w-3 h-3 rounded-full bg-primary" />;
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(option)}
                                            className={`
                                                group relative px-4 py-3 rounded-xl border transition-all duration-200
                                                flex items-center gap-3 w-full text-left
                                                ${baseStyle}
                                            `}
                                        >
                                            <div className={`
                                                w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold border transition-colors
                                                ${badgeStyle}
                                            `}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm md:text-base font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                {option}
                                            </span>
                                            {icon}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-white/5 backdrop-blur-sm flex justify-between items-center">
                        <Button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0 || isFastPaced}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground h-9"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>

                        <Button
                            onClick={() => handleSpeakQuestion(currentQuestion)}
                            variant="ghost"
                            size="sm"
                            className={`ml-1 h-9 transition-all duration-200 ${isSpeaking ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/50' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105'}`}
                        >
                            {isSpeaking ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                            {isSpeaking ? "Stop" : "Listen"}
                        </Button>

                        <div className="flex gap-2">
                            <div className="hidden lg:flex items-center gap-1 mr-6">
                                {questions.map((_, i) => (
                                    <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === currentQuestionIndex ? 'bg-primary scale-125' : selectedAnswers[i] ? 'bg-primary/60' : 'bg-white/10'}`} />
                                ))}
                            </div>

                            {currentQuestionIndex === questions.length - 1 ? (
                                <Button
                                    onClick={confirmSubmit}
                                    disabled={isSubmitting}
                                    size="sm"
                                    className="gradient-primary text-white h-9 px-6 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        "Finish"
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleNext}
                                    size="sm"
                                    className={`h-9 px-6 transition-all ${selectedAnswers[currentQuestionIndex] ? 'gradient-primary text-white shadow-md' : 'bg-secondary text-secondary-foreground'}`}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">
                            Submit Quiz?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-base">
                            Are you sure you want to submit your quiz? This action cannot be undone.
                            {Object.keys(selectedAnswers).length < questions.length && (
                                <span className="block mt-2 text-yellow-500 font-medium">
                                    ⚠️ You have {questions.length - Object.keys(selectedAnswers).length} unanswered question(s).
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 hover:bg-white/5">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSubmitQuiz}
                            className="gradient-primary text-white shadow-lg shadow-primary/20"
                        >
                            Yes, Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default QuizAttempt;