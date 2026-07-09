import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Brain, Beaker, Atom, BookOpen, Film, Music, Gamepad2, Trophy, Globe,
  Landmark, Newspaper, Lightbulb, Code, Briefcase, Heart, Palette, Tv,
  Target, Cpu, BookText, Languages, Puzzle, Sparkles, Smile, Compass, Layers, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TOPICS, SUBTOPICS } from "@/lib/topics";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { QuizCard } from "@/components/QuizCard";
import Explore from "./Explore";
import { cn } from "@/lib/utils";

const Categories = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Tab State: 'categories' | 'quizzes'
  const [activeTab, setActiveTab] = useState<'categories' | 'quizzes'>('categories');
  const [categorySearchTerm, setCategorySearchTerm] = useState("");

  // Check hash on mount/update
  useEffect(() => {
    if (location.hash === '#explore') {
      setActiveTab('quizzes');
    }
  }, [location.hash]);

  // State for quiz counts per subtopic
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // State for popup
  const [showPopup, setShowPopup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>("");
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Icon mapping for main topics
  const topicIcons: Record<string, any> = {
    "Academic & Education": BookOpen,
    "Competitive Exams": Target,
    "Technology & Computing": Code,
    "General Knowledge": Globe,
    "Business & Finance": Briefcase,
    "Health & Medicine": Heart,
    "Arts & Humanities": Palette,
    "Entertainment & Pop Culture": Tv,
    "Sports & Games": Trophy,
    "Gaming": Gamepad2,
    "Lifestyle & Society": Smile,
    "Science & Innovation": Atom,
    "Languages": Languages,
    "Logical & Aptitude Reasoning": Puzzle,
    "Coding & Interview Prep": Code,
    "AI, Ethics & Future": Sparkles,
    "Fun & Casual": Lightbulb,
  };

  // Icon mapping for subtopics
  const getSubtopicIcon = (topicName: string, subtopicName: string): any => {
    const iconMap: Record<string, any> = {
      "Physics": Atom, "Chemistry": Beaker, "Biology": Brain, "Mathematics": BookOpen,
      "Movies": Film, "Music": Music, "Sports": Trophy, "Gaming": Gamepad2,
      "Geography": Globe, "History": Landmark, "Current Affairs": Newspaper,
      "Programming Languages": Code, "Artificial Intelligence": Sparkles, "Cyber Security": Cpu,
    };
    return iconMap[subtopicName] || topicIcons[topicName] || BookText;
  };

  // Fetch quiz counts for all subtopics on mount
  useEffect(() => {
    const fetchAllCounts = async () => {
      const { default: cacheService } = await import('@/lib/cacheService');
      const cachedCounts = cacheService.get<Record<string, number>>('quiz_counts');

      if (cachedCounts) {
        setQuizCounts(cachedCounts);
        setLoadingCounts(false);
      }

      const counts: Record<string, number> = {};

      for (const topic of TOPICS) {
        const subtopics = SUBTOPICS[topic as keyof typeof SUBTOPICS];
        if (!subtopics) continue;

        for (const subtopic of subtopics) {
          try {
            const response = await api.countQuizzesByCategory(topic, subtopic);
            const key = `${topic}::${subtopic}`;
            counts[key] = response.count || 0;
          } catch (error) {
            counts[`${topic}::${subtopic}`] = cachedCounts?.[`${topic}::${subtopic}`] || 0;
          }
        }
      }

      setQuizCounts(counts);
      cacheService.set('quiz_counts', counts, 5 * 60 * 1000);
      setLoadingCounts(false);
    };

    fetchAllCounts();
  }, []);

  // Handle subtopic click
  const handleSubtopicClick = async (category: string, subtopic: string) => {
    setSelectedCategory(category);
    setSelectedSubtopic(subtopic);
    setShowPopup(true);
    setLoadingQuizzes(true);
    setAvailableQuizzes([]);

    try {
      const { default: cacheService } = await import('@/lib/cacheService');
      const cacheKey = `quizzes_${category}_${subtopic}`;
      const cachedQuizzes = cacheService.get<any[]>(cacheKey);

      if (cachedQuizzes) {
        setAvailableQuizzes(cachedQuizzes);
        setLoadingQuizzes(false);
      }

      const response = await api.getQuizzesByCategory(category, subtopic);
      const quizzes = response.quizzes || [];

      setAvailableQuizzes(quizzes);
      cacheService.set(cacheKey, quizzes, 5 * 60 * 1000);
      setLoadingQuizzes(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load quizzes",
        description: "Could not fetch quiz list for this topic"
      });
      setLoadingQuizzes(false);
    }
  };

  const SubcategoryCard = ({ category, topic, subtopic, variant }: { category: any, topic: string, subtopic: string, variant: 'primary' | 'secondary' | 'accent' }) => {
    const key = `${topic}::${subtopic}`;
    const count = quizCounts[key] || 0;

    const styles = {
      primary: {
        gradient: 'gradient-primary',
        text: 'text-primary',
        bgWithOpacity: 'bg-primary/20',
        border: 'hover:border-primary/50',
        textGroupHover: 'group-hover:text-primary',
        bgIcon: 'bg-primary/20',
        textIcon: 'text-primary'
      },
      secondary: {
        gradient: 'gradient-secondary',
        text: 'text-secondary',
        bgWithOpacity: 'bg-secondary/20',
        border: 'hover:border-secondary/50',
        textGroupHover: 'group-hover:text-secondary',
        bgIcon: 'bg-secondary/20',
        textIcon: 'text-secondary'
      },
      accent: {
        gradient: 'gradient-accent',
        text: 'text-accent',
        bgWithOpacity: 'bg-accent/20',
        border: 'hover:border-accent/50',
        textGroupHover: 'group-hover:text-accent',
        bgIcon: 'bg-accent/20',
        textIcon: 'text-accent'
      }
    };

    const currentStyle = styles[variant];

    return (
      <div className="h-full block" onClick={() => handleSubtopicClick(topic, subtopic)}>
        <Card className={`group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 ${currentStyle.border} relative overflow-hidden backdrop-blur-sm bg-card/80 h-full`}>
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500 ${currentStyle.bgIcon} ${currentStyle.textIcon}`}>
            <category.icon className="w-24 h-24" />
          </div>

          <CardContent className="p-6 h-full flex flex-col relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl ${currentStyle.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className={`text-xl font-bold text-foreground mb-2 line-clamp-2 ${currentStyle.textGroupHover} transition-colors`}>{category.name}</h3>
            <p className="text-sm text-muted-foreground">
              {loadingCounts ? "Loading..." : `${count} quizzes available`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl px-4 md:px-6">

          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore <span className="text-foreground">Content</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse by deep categories or explore individual quizzes directly.
            </p>
          </div>

          {/* Custom Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-8 bg-transparent p-0">
              <button
                onClick={() => setActiveTab('quizzes')}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-xl text-base font-medium transition-all duration-300 border-2 border-transparent",
                  activeTab === 'quizzes'
                    ? "bg-card/80 text-foreground border-primary/60 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60 hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:scale-105"
                )}
              >
                <Compass className="w-5 h-5" />
                Explore Quizzes
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-xl text-base font-medium transition-all duration-300 border-2 border-transparent",
                  activeTab === 'categories'
                    ? "bg-card/80 text-foreground border-primary/60 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60 hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:scale-105"
                )}
              >
                <Layers className="w-5 h-5" />
                Quiz Categories
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'quizzes' ? (
              /* Explore Quizzes Content: We render the Explore component here. 
                 It has its own container styling, so it might nest. We'll adjust Explore.tsx later if needed. 
                 Since user asked to "put the above created component their", we just embed it.
                 NOTE: The user previously added padding to Explore.tsx, which might double up here.
                 I will pass a className prop to Explore if it accepted one, but standard practice says just render it. */
              <div className="-mt-24"> {/* Negative margin to counteract Explore's built-in top padding if possible, or just accept it */}
                <Explore />
              </div>
            ) : (
              /* Categories Content */
              <div className="space-y-16">

                {/* Search Bar for Categories */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Browse Categories</h2>
                    <p className="text-muted-foreground">Find specific topics and subtopics</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      className="pl-9"
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dynamic Category Sections */}
                {TOPICS.map((topic, topicIndex) => {
                  const subtopics = SUBTOPICS[topic as keyof typeof SUBTOPICS];
                  if (!subtopics || subtopics.length === 0) return null;

                  // Filtering Logic
                  const lowerTerm = categorySearchTerm.toLowerCase();
                  const matchesTopic = topic.toLowerCase().includes(lowerTerm);

                  // If topic matches, show all. If not, filter subtopics.
                  const filteredSubtopics = matchesTopic
                    ? subtopics
                    : subtopics.filter(sub => sub.toLowerCase().includes(lowerTerm));

                  // If no subtopics match (and topic doesn't match), hide section
                  if (filteredSubtopics.length === 0) return null;

                  const TopicIcon = topicIcons[topic] || BookText;
                  const variant: 'primary' | 'secondary' | 'accent' = topicIndex % 3 === 0 ? "primary" : topicIndex % 3 === 1 ? "secondary" : "accent";
                  const gradientClass = `gradient-${variant}`;

                  return (
                    <section key={topic}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-xl ${gradientClass} flex items-center justify-center`}>
                          <TopicIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-foreground">{topic}</h2>
                          <p className="text-muted-foreground">Explore {filteredSubtopics.length} subcategories</p>
                        </div>
                      </div>
                      <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarGutter: 'stable' }}>
                        {filteredSubtopics.map((subtopic, index) => {
                          const SubtopicIcon = getSubtopicIcon(topic, subtopic);
                          const category = { name: subtopic, icon: SubtopicIcon };
                          return (
                            <div key={index} className="flex-shrink-0 w-64 h-52">
                              <SubcategoryCard
                                category={category}
                                topic={topic}
                                subtopic={subtopic}
                                variant={variant}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Quiz Selection Popup (Only relevant for Categories tab) */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <span className="text-primary">{selectedSubtopic}</span> Quizzes
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedCategory}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-2 space-y-4 p-1">
            {loadingQuizzes ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading quizzes...</p>
              </div>
            ) : availableQuizzes.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-muted/20">
                <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No quizzes available for this topic yet.</p>
                <Button className="mt-4" variant="outline" onClick={() => setShowPopup(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableQuizzes.map((quiz, index) => (
                  <QuizCard
                    key={quiz.quiz_id || index}
                    quiz_id={quiz.quiz_id || 'unknown'}
                    title={quiz.title || 'Untitled Quiz'}
                    topic={quiz.topic || selectedSubtopic}
                    level={quiz.level || 'Medium'}
                    num_questions={quiz.num_questions || 10}
                    duration_seconds={quiz.duration_seconds || 600}
                    created_at={quiz.created_at || null}
                    language={quiz.language}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;