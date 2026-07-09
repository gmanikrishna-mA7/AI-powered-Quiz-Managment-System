import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, PlayCircle, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { PreferenceModal } from "@/components/PreferenceModal";
import { Link, useLocation } from "react-router-dom";

import { RecentlyCompleted } from "@/components/RecentlyCompleted";
import { StatsOverview } from "@/components/StatsOverview";
import { MyCreatedQuizzes } from "@/components/MyCreatedQuizzes";
import { ExploreQuizzes } from "@/components/ExploreQuizzes";
import { CategoryPerformance } from "@/components/CategoryPerformance";
import { Combobox } from "@/components/ui/combobox";
import { TOPICS } from "@/lib/topics";
import { QuizIdSearch } from "@/components/QuizIdSearch";
import { ArcadeFunWidget } from "@/components/ArcadeFunWidget";

const PROFILE_CACHE_KEY = 'dashboard_user_profile';
const PROFILE_TIMESTAMP_KEY = 'dashboard_user_profile_timestamp';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('');

  // Welcome Modal Logic
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (location.state?.showWelcome) {
      setShowWelcomeModal(true);
      // Clear state history so refresh doesn't pop it up again (optional, depending on router behavior)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Quiz creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quizForm, setQuizForm] = useState({
    category: '',
    title: '',
    level: 'easy' as 'easy' | 'medium' | 'hard',
    num_questions: 5,
    duration_seconds: 300,
    additional_instructions: '',
    language: 'English'
  });

  const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Japanese", "Chinese"];

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch user profile with caching
  useEffect(() => {
    let isMounted = true;

    const loadCachedProfile = () => {
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const profileData = JSON.parse(cached);
          if (isMounted) {
            setUserName(profileData.full_name || user?.username || '');
          }
        }
      } catch (error) {
        console.error('Failed to load cached profile:', error);
      }
    };

    const fetchProfileData = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.data) {
          const fullName = response.data.full_name || user?.username || '';

          // Update cache
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(response.data));
          localStorage.setItem(PROFILE_TIMESTAMP_KEY, Date.now().toString());

          // Update state
          if (isMounted) {
            setUserName(fullName);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Fallback to username from auth context
        if (isMounted) {
          setUserName(user?.username || '');
        }
      }
    };

    // Load cached data first for instant display
    loadCachedProfile();

    // Fetch fresh data in the background
    if (user) {
      fetchProfileData();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleCreateQuiz = async () => {
    if (!quizForm.category || !quizForm.title) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in category and title"
      });
      return;
    }

    setCreating(true);
    try {
      const response = await api.createQuiz(quizForm);
      toast({
        title: "Quiz Created Successfully! 🎉",
        description: `Quiz ID: ${response.data.quiz_id} with ${response.data.num_questions} questions`
      });
      setShowCreateDialog(false);
      setRefreshKey(prev => prev + 1);
      setQuizForm({
        category: '',
        title: '',
        level: 'easy',
        num_questions: 10,
        duration_seconds: 600,
        additional_instructions: '',
        language: 'English'
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create quiz",
        description: error.response?.data?.error || "An error occurred"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto">

          {/* Welcome Section & Quiz Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome back, {userName || user?.username}!</h1>
              <p className="text-muted-foreground">Ready to challenge yourself today?</p>
            </div>
            <QuizIdSearch />
          </div>

          {/* Preference Selection Modal (for new users) */}
          <PreferenceModal open={showWelcomeModal} onOpenChange={setShowWelcomeModal} />

          {/* Create Quiz Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
                <DialogDescription>
                  Fill in the details to generate a custom quiz
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Category - Full Width */}
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Combobox
                    options={TOPICS.map(topic => ({ value: topic, label: topic }))}
                    value={quizForm.category}
                    onValueChange={(value) => setQuizForm({ ...quizForm, category: value })}
                    placeholder="Select a category..."
                    searchPlaceholder="Search categories..."
                    emptyMessage="No category found."
                  />
                </div>

                {/* Title - Full Width */}
                <div className="grid gap-2">
                  <Label htmlFor="title">Quiz Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., World War II Quiz"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  />
                </div>


                <div className="grid grid-cols-4 gap-4 items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="level">Difficulty</Label>
                    <Select
                      value={quizForm.level}
                      onValueChange={(value) => setQuizForm({ ...quizForm, level: value as 'easy' | 'medium' | 'hard' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="num_questions">Questions</Label>
                    <Input
                      id="num_questions"
                      type="number"
                      min="5"
                      max="50"
                      value={quizForm.num_questions}
                      onChange={(e) => setQuizForm({ ...quizForm, num_questions: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="120"
                      value={Math.round(quizForm.duration_seconds / 60)}
                      onChange={(e) => setQuizForm({ ...quizForm, duration_seconds: parseInt(e.target.value) * 60 })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={quizForm.language}
                      onValueChange={(value) => setQuizForm({ ...quizForm, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleCreateQuiz}
                  disabled={creating}
                  className="gradient-primary text-white"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating...
                    </>
                  ) : (
                    "Create Quiz"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stats Overview */}
          <StatsOverview className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Created Quizzes */}
              <MyCreatedQuizzes
                onCreateClick={() => setShowCreateDialog(true)}
                refreshTrigger={refreshKey}
                limit={1}
                className="bg-background/60"
              />

              {/* Explore Quizzes */}
              <ExploreQuizzes />

              {/* Recent Activity */}
              <RecentlyCompleted limit={2} />
            </div>

            {/* Sidebar - Sticky, Full Height */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Arcade Fun Widget */}
                <ArcadeFunWidget />

                {/* Performance Chart */}
                <CategoryPerformance />

                {/* Quick Actions */}
                <Card className="bg-background/60 border-border/50 card-shadow">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Button
                        className="w-full gradient-primary text-white justify-start"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Create New Quiz
                      </Button>
                    </div>

                    <div>
                      <Link to="/profile#achievements" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Trophy className="w-5 h-5 mr-2" />
                          View Achievements
                        </Button>
                      </Link>
                    </div>

                    <div>
                      <Link
                        to="/categories"
                        className="block w-full justify-start flex items-center border rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        <Target className="w-5 h-5 mr-2" />
                        Browse Categories
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
