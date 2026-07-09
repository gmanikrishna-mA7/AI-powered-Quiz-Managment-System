import { Hero } from "@/components/Hero";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap, Flame,
  Target, Sparkles, Rocket, ChevronRight, ArrowRight,
  Puzzle, MessageCircle, BookOpen, Gamepad2, Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show landing page if user is authenticated (redirect is in progress)
  if (user) {
    return null;
  }

  const howItWorks = [
    { icon: Target, title: "Choose a Topic", description: "Pick from 50+ categories or enter your own" },
    { icon: Sparkles, title: "AI Generates Quiz", description: "Gemini creates unique questions instantly" },
    { icon: Rocket, title: "Play & Learn", description: "Take the quiz, get feedback, track progress" }
  ];

  const dailyChallenges = [
    { icon: Zap, title: "Lightning Quiz", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { icon: Puzzle, title: "Scrambled Words", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: MessageCircle, title: "Two Truths One Lie", color: "text-rose-500", bg: "bg-rose-500/10" }
  ];

  const categories = [
    { icon: BookOpen, title: "Academic", description: "Physics, Chemistry, Biology, Math", count: "1500+", gradient: "from-violet-500 to-purple-600" },
    { icon: Gamepad2, title: "Entertainment", description: "Movies, Music, Sports, Gaming", count: "1200+", gradient: "from-pink-500 to-rose-500" },
    { icon: Lightbulb, title: "General Knowledge", description: "History, Geography, Trivia", count: "2300+", gradient: "from-amber-500 to-orange-500" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Explore Categories Section */}
      <section className="pt-8 pb-24 px-6 bg-transparent bg-gradient-to-b from-background via-card/30 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Explore{" "}
              <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
                Categories
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Dive into 50+ categories spanning academics, entertainment, and beyond.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {categories.map((category, index) => (
              <Card
                key={index}
                className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl"
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <category.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{category.description}</p>
                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {category.count} Quizzes
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/categories#explore">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 rounded-xl border-2">
                Explore All 50+ Categories <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 bg-transparent bg-gradient-to-b from-background via-card/30 to-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Simple & Powerful
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It{" "}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              From topic to quiz in seconds—AI makes it effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm h-full hover:bg-card/80 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-bold text-primary mb-2">Step {index + 1}</div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-8 h-8 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Challenge Teaser */}
      <section className="py-24 px-6 bg-transparent bg-gradient-to-b from-background via-card/30 to-background">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 p-1">
            <div className="rounded-[22px] bg-background/95 backdrop-blur-sm p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-medium mb-4">
                    <Flame className="w-4 h-4" />
                    Daily Fun
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Complete the{" "}
                    <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                      Daily 3 Challenge
                    </span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Every day, tackle 3 unique brain games to earn XP, climb leaderboards, and keep your streak alive!
                  </p>
                  <Link to="/fun-activities">
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white px-8 rounded-xl">
                      Play Daily Challenges <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {dailyChallenges.map((challenge, index) => (
                    <div
                      key={index}
                      className={`flex flex-col items-center p-4 rounded-2xl ${challenge.bg} border border-border/50`}
                    >
                      <div className={`w-12 h-12 rounded-xl ${challenge.bg} flex items-center justify-center mb-3`}>
                        <challenge.icon className={`w-6 h-6 ${challenge.color}`} />
                      </div>
                      <span className={`text-xs font-medium text-center ${challenge.color}`}>{challenge.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-transparent bg-gradient-to-b from-background via-card/30 to-background">

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Start{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
              Learning?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of learners who are already using QuizGen to make learning fun, engaging, and effective.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-lg px-10 py-7 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 transition-opacity shadow-xl shadow-primary/30">
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/categories#explore">
              <Button size="lg" variant="outline" className="gap-2 text-lg px-10 py-7 rounded-xl border-2">
                Explore Quizzes
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="ghost" className="gap-2 text-lg px-10 py-7 rounded-xl">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
