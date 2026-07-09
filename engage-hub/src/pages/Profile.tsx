import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User,
  Settings,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Edit2,
  Camera,
  Bell,
  Shield,
  Palette,
  LogOut,
  Award,
  Flame,
  Star,
  Zap,
  Upload
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { calculateLevel } from "@/lib/levelUtils";
import { useToast } from "@/hooks/use-toast";
import { TOPICS } from "@/lib/topics";
import { RecentlyCompleted } from "@/components/RecentlyCompleted";
import { StatsOverview } from "@/components/StatsOverview";
import { Achievements } from "@/components/Achievements";
import { MyCreatedQuizzes } from "@/components/MyCreatedQuizzes";
import { Combobox } from "@/components/ui/combobox";
import heroImage from "@/assets/hero-bg.jpg";

const Profile = () => {
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get user interests from preferences - MUST be before editFormData
  const userInterests = user?.preferences?.interests || [];

  // Edit profile state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // XP state for Level Progress card
  const [xp, setXP] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch XP with cache
  useEffect(() => {
    const fetchXP = async () => {
      try {
        const { default: cacheService } = await import('@/lib/cacheService');
        const cachedStats: any = cacheService.get('comprehensive_stats');

        if (cachedStats) {
          setXP(cachedStats.data?.xp_score || 0);
          setLoadingStats(false);
        }

        const statsRes = await api.getComprehensiveStats();
        const statsData: any = statsRes;
        setXP(statsData.data?.xp_score || 0);
        cacheService.set('comprehensive_stats', statsRes);
      } catch (error) {
        console.error('Failed to fetch XP:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchXP();
  }, []);

  // Auto-scroll to section when hash is present
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#activity' || hash === '#achievements' || hash === '#MyQuizzes') {
      setTimeout(() => {
        const element = document.getElementById('activity-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Calculate level from XP
  const levelInfo = calculateLevel(xp);
  const [editFormData, setEditFormData] = useState({
    full_name: user?.full_name || '',
    bio: '',
    preferences: {
      interests: userInterests
    }
  });

  // Quiz creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quizForm, setQuizForm] = useState({
    category: '',
    title: '',
    level: 'easy' as 'easy' | 'medium' | 'hard',
    num_questions: 10,
    duration_seconds: 600,
    additional_instructions: '',
    language: 'English'
  });

  const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Japanese", "Chinese"];

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

  // Predefined preference options from topics
  const availablePreferences = TOPICS;

  // Get user's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Avatar image must be smaller than 5MB",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await api.uploadAvatar(selectedFile);
      toast({
        title: "Success!",
        description: "Avatar uploaded successfully",
      });
      setShowAvatarDialog(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      // Refresh user data to get new avatar
      await checkAuth();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddPreference = (preference: string) => {
    if (!editFormData.preferences.interests.includes(preference)) {
      setEditFormData({
        ...editFormData,
        preferences: {
          interests: [...editFormData.preferences.interests, preference]
        }
      });
    }
  };

  const handleRemovePreference = (preference: string) => {
    setEditFormData({
      ...editFormData,
      preferences: {
        interests: editFormData.preferences.interests.filter(p => p !== preference)
      }
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(editFormData);
      toast({
        title: "Success!",
        description: "Profile updated successfully",
      });
      setShowEditDialog(false);
      // Refresh user data
      await checkAuth();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const userProfile = {
    name: user?.full_name || "User",
    email: user?.email || "",
    username: `@${user?.email?.split('@')[0] || 'user'}`,
    avatar: user?.avatar || getInitials(user?.full_name || "U"),
    bio: "Quiz enthusiast | Science lover | Always learning",
    level: 24,
    xp: 5420,
    xpToNextLevel: 8000,
    joinDate: "March 2024",
    totalQuizzes: 145,
    averageScore: 87,
    bestCategory: "Physics",
    streak: 12,
    longestStreak: 28,
    rank: 247,
  };

  const categoryStats = [
    { name: "Academic", quizzes: 65, avgScore: 89, color: "gradient-primary" },
    { name: "Entertainment", quizzes: 48, avgScore: 84, color: "gradient-secondary" },
    { name: "General Knowledge", quizzes: 32, avgScore: 88, color: "gradient-accent" },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <div className="relative mb-8">
            <div className="h-48 rounded-2xl overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Darker overlay for text readability */}
                <div className="absolute inset-0 bg-background/80 dark:bg-background/60" />

                {/* Colorful Gradient Overlay - Stronger opacity */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-secondary/60 to-accent/60 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />

                {/* Decorative Colored Orbs/Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-20 w-40 h-40 bg-secondary/30 rounded-full blur-2xl translate-y-1/2" />
                <div className="absolute top-10 right-1/4 w-20 h-20 bg-accent/40 rounded-full blur-xl" />
              </div>
            </div>
            <div className="absolute -bottom-16 left-8 flex items-end gap-6">
              <div className="relative">
                {/* Check avatar_file first (uploaded), then avatar (URL from OAuth) */}
                {/* Check avatar_file first (uploaded), then avatar (URL from OAuth) */}
                {(!imageError && (user?.avatar_file || (user?.avatar && user.avatar.startsWith('http')))) ? (
                  <img
                    src={user.avatar_file || user.avatar}
                    alt={user.full_name}
                    onError={() => setImageError(true)}
                    className="w-32 h-32 rounded-2xl border-4 border-background shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] ring-2 ring-primary/20 object-cover bg-card"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-card flex items-center justify-center text-muted-foreground border-4 border-background shadow-xl">
                    <User className="w-16 h-16" />
                  </div>
                )}
                <button
                  onClick={() => setShowAvatarDialog(true)}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full gradient-secondary flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-20 mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{userProfile.name}</h1>
              <p className="text-muted-foreground">{userProfile.email}</p>

              {/* Bio Section */}
              {user?.bio && (
                <p className="text-sm text-foreground mt-2">{user.bio}</p>
              )}

              {/* Preferences Section */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preferences</h3>
                {userInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userInterests.map((interest: string, index: number) => (
                      <span
                        key={index}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-foreground font-medium text-sm hover:scale-105 transition-transform"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No preferences set yet</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEditFormData({
                  full_name: user?.full_name || '',
                  bio: user?.bio || '',
                  preferences: {
                    interests: userInterests
                  }
                });
                setShowEditDialog(true);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Level Progress */}
          <Card className="bg-background/60 border-border/50 card-shadow mb-8 bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      Level {loadingStats ? '...' : levelInfo.level}
                    </p>
                    <p className="text-muted-foreground">Quiz Champion</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {loadingStats ? '...' : `${xp} / ${levelInfo.nextLevelXP} XP`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {loadingStats ? '...' : `${levelInfo.nextLevelXP - xp} XP to next level`}
                  </p>
                </div>
              </div>
              <Progress
                value={loadingStats ? 0 : levelInfo.progressPercentage}
                className="h-4"
              />
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <StatsOverview className="mb-8" />

          {/* Tabs */}
          <Tabs
            id="activity-section"
            defaultValue={
              window.location.hash === '#activity' ? 'activity' :
                window.location.hash === '#MyQuizzes' ? 'myquizzes' :
                  'achievements'
            }
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 gap-8 bg-transparent p-0">
              <TabsTrigger
                value="achievements"
                className="h-14 data-[state=active]:bg-card/80 border-2 border-transparent hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 data-[state=active]:scale-105 data-[state=active]:border-primary/60 data-[state=active]:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] rounded-xl"
              >
                Achievements
              </TabsTrigger>
              <TabsTrigger
                value="myquizzes"
                className="h-14 data-[state=active]:bg-card/80 border-2 border-transparent hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 data-[state=active]:scale-105 data-[state=active]:border-primary/60 data-[state=active]:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] rounded-xl"
              >
                My Created Quizzes
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="h-14 data-[state=active]:bg-card/80 border-2 border-transparent hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 data-[state=active]:scale-105 data-[state=active]:border-primary/60 data-[state=active]:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] rounded-xl"
              >
                Activity History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="achievements">
              <Achievements />
            </TabsContent>

            <TabsContent value="myquizzes">
              <MyCreatedQuizzes
                onCreateClick={() => setShowCreateDialog(true)}
                refreshTrigger={refreshKey}
                layout="grid"
              />
            </TabsContent>

            <TabsContent value="activity">
              <RecentlyCompleted limit={999999} layout="grid" />
            </TabsContent>


          </Tabs>
        </div>
      </main>

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

            {/* 3-Column Grid: Difficulty, Number of Questions & Duration */}
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

            {/* Additional Instructions - Full Width */}
            <div className="grid gap-2">
              <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
              <Input
                id="instructions"
                placeholder="Any specific requirements..."
                value={quizForm.additional_instructions}
                onChange={(e) => setQuizForm({ ...quizForm, additional_instructions: e.target.value })}
              />
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

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
            <DialogDescription>
              Choose an image to upload as your profile avatar (max 5MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-32 h-32 rounded-xl object-cover border-4 border-primary/20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Choose Different Image
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select an image
                  </p>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAvatarDialog(false);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="gradient-primary text-white"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Upload Avatar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullname">Full Name</Label>
              <Input
                id="edit-fullname"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Input
                id="edit-bio"
                value={editFormData.bio}
                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                placeholder="Enter your bio"
              />
            </div>
            <div className="space-y-2">
              <Label>Preferences</Label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPreference(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={saving}
              >
                <option value="">Select a preference to add...</option>
                {availablePreferences
                  .filter(pref => !editFormData.preferences.interests.includes(pref))
                  .map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
              </select>
              {/* Selected Preferences */}
              {editFormData.preferences.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editFormData.preferences.interests.map((interest: string) => (
                    <span
                      key={interest}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-foreground font-medium text-sm flex items-center gap-2"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => handleRemovePreference(interest)}
                        className="hover:text-destructive transition-colors"
                        disabled={saving}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="gradient-primary text-white"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
