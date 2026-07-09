import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home,
  Share2,
  Star,
  Zap
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const { toast } = useToast();

  const [fetchedData, setFetchedData] = useState<any>(null);
  const [loading, setLoading] = useState(!location.state);

  const resultsData = location.state || fetchedData;

  // Fetch attempt if no state and attemptId exists
  useEffect(() => {
    if (!location.state && attemptId) {
      const fetchAttempt = async () => {
        try {
          const response: any = await api.getQuizHistoryById(parseInt(attemptId));
          const data = response.data; // ResponseFormatter wrapper

          // Map API response to Results format
          const mappedResults = {
            quizId: data.quiz_id,
            quizTitle: data.title,
            category: data.category,
            score: data.percentage, // Percentage is used as 'score' in Results logic
            correctAnswers: data.questions.filter((q: any) => q.is_correct).length,
            totalQuestions: data.total_questions,
            timeTaken: "N/A", // Not stored in history currently
            difficulty: data.level,
            xpEarned: 0, // Not stored in history detail currently
            quizType: data.quiz_type || 'time-based',
            questions: data.questions.map((q: any, idx: number) => ({
              id: idx,
              question: q.text,
              yourAnswer: q.user_answer,
              correctAnswer: q.correct_answer,
              correct: q.is_correct
            }))
          };

          setFetchedData(mappedResults);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load quiz results."
          });
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      };

      fetchAttempt();
    } else if (!location.state && !attemptId) {
      navigate('/dashboard');
    }
  }, [location.state, attemptId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent pt-32 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  if (!resultsData) {
    return null; // Will redirect
  }

  // Use passed or fetched data
  const results = {
    quizId: resultsData.quizId,
    quizTitle: resultsData.quizTitle,
    category: resultsData.category,
    score: resultsData.score,
    correctAnswers: resultsData.correctAnswers,
    totalQuestions: resultsData.totalQuestions,
    timeTaken: resultsData.timeTaken,
    difficulty: resultsData.difficulty,
    xpEarned: resultsData.xpEarned,
    quizType: resultsData.quizType || 'time-based',
  };

  const questions = resultsData.questions || [];
  const isLearningBased = results.quizType === 'learning-based';

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Outstanding! 🎉";
    if (score >= 70) return "Great Job! 👏";
    if (score >= 50) return "Good Effort! 💪";
    return "Keep Practicing! 📚";
  };

  const handleShare = () => {
    // Copy full link as requested
    const shareText = `${window.location.origin}/quiz/${results.quizId}`;
    navigator.clipboard.writeText(shareText).then(() => {
      toast({
        title: "Link Copied!",
        description: `Copied to clipboard: ${shareText}`,
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy link to clipboard."
      });
    });
  };

  return (
    <div className="min-h-screen bg-transparent">
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Score Header */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Quiz Complete!</h1>
            <p className="text-xl text-muted-foreground mb-8">{results.quizTitle}</p>

          </div>

          {/* Stats Grid */}
          {/* Stats Grid */}
          {!attemptId && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <Card className="border-border/50 card-shadow text-center animate-fade-in-scale" style={{ animationDelay: "0.1s" }}>
                <CardContent className="p-6">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {isLearningBased ? 'N/A' : results.timeTaken}
                  </p>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 card-shadow text-center animate-fade-in-scale" style={{ animationDelay: "0.2s" }}>
                <CardContent className="p-6">
                  <Target className="w-8 h-8 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{results.difficulty}</p>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 card-shadow text-center animate-fade-in-scale" style={{ animationDelay: "0.3s" }}>
                <CardContent className="p-6">
                  <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {isLearningBased ? 'N/A' : `+${results.xpEarned}`}
                  </p>
                  <p className="text-sm text-muted-foreground">XP Earned</p>
                </CardContent>
              </Card>

              <Card className="border-border/50 card-shadow text-center animate-fade-in-scale" style={{ animationDelay: "0.4s" }}>
                <CardContent className="p-6">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {results.correctAnswers}/{results.totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground">Correct Answers</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link to="/categories">
              <Button className="gradient-primary text-white px-8 py-6 text-lg">
                <RotateCcw className="w-5 h-5 mr-2" />
                Try Another Quiz
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="px-8 py-6 text-lg">
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button variant="outline" className="px-8 py-6 text-lg" onClick={handleShare}>
              <Share2 className="w-5 h-5 mr-2" />
              Share Quiz
            </Button>
          </div>

          {/* Question Review */}
          <Card className="border-border/50 card-shadow max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Question Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-lg border ${q.correct
                    ? "border-success/30 bg-success/5"
                    : "border-destructive/30 bg-destructive/5"
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${q.correct ? "bg-success text-white" : "bg-destructive text-white"
                      }`}>
                      {q.correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">
                        Q{index + 1}. {q.question}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Your Answer: <span className={q.correct ? "text-success font-semibold" : "text-destructive font-semibold"}>
                            {q.yourAnswer}
                          </span>
                        </span>
                        {!q.correct && (
                          <span className="text-muted-foreground">
                            Correct Answer: <span className="text-success font-semibold">{q.correctAnswer}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Performance Breakdown */}
          <Card className="border-border/50 card-shadow max-w-4xl mx-auto mt-8">
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <span className="text-sm font-semibold">{results.score}%</span>
                </div>
                <Progress value={results.score} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Speed (based on time)</span>
                  <span className="text-sm font-semibold">Good</span>
                </div>
                <Progress value={75} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>    </div>
  );
};

export default Results;