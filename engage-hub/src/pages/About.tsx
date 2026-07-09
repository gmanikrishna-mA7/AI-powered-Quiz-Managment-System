import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain, Zap, Target, Users, Sparkles, Globe, Volume2, Calendar,
  Library, Layers, ChevronRight, Flame, Puzzle, MessageCircle,
  Clock, Rocket, Shield, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const coreFeatures = [
    {
      icon: Brain,
      title: "AI-Powered Quizzes",
      description: "Powered by Google Gemini AI to generate unique, contextual questions tailored to any topic in seconds.",
      gradient: "from-violet-500 to-purple-600",
      delay: "0s"
    },
    {
      icon: Globe,
      title: "Multilingual Support",
      description: "Create and take quizzes in Hindi, German, Spanish, French, and 10+ more languages.",
      gradient: "from-blue-500 to-cyan-500",
      delay: "0.1s"
    },
    {
      icon: Volume2,
      title: "Text-to-Speech",
      description: "Listen to questions read aloud in the correct accent—perfect for accessibility and language learning.",
      gradient: "from-emerald-500 to-teal-500",
      delay: "0.2s"
    },
    {
      icon: Users,
      title: "Live Multiplayer",
      description: "Host real-time quiz battles with friends, classmates, or colleagues. Compete on live leaderboards!",
      gradient: "from-orange-500 to-red-500",
      delay: "0.3s"
    },
    {
      icon: Flame,
      title: "Daily Challenges",
      description: "Complete 3 unique daily activities to earn XP: Lightning Quiz, Scrambled Words, and Two Truths One Lie.",
      gradient: "from-pink-500 to-rose-500",
      delay: "0.4s"
    },
    {
      icon: Library,
      title: "5000+ Pre-Built Quizzes",
      description: "Explore a vast library spanning 50+ categories—from academics to entertainment—ready to play instantly.",
      gradient: "from-amber-500 to-yellow-500",
      delay: "0.5s"
    },
    {
      icon: Layers,
      title: "3 Quiz Modes",
      description: "Choose your style: Time-Based for paced learning, Fast-Paced for adrenaline, or Learning Mode for practice.",
      gradient: "from-indigo-500 to-blue-600",
      delay: "0.6s"
    }
  ];

  const dailyChallenges = [
    {
      icon: Zap,
      title: "Lightning Quiz",
      description: "Answer rapid-fire questions against the clock. How many can you get right in 60 seconds?",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30"
    },
    {
      icon: Puzzle,
      title: "Scrambled Words",
      description: "Unscramble jumbled letters to form words. Test your vocabulary and pattern recognition!",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    },
    {
      icon: MessageCircle,
      title: "Two Truths One Lie",
      description: "Spot the false statement among three. Sharpen your critical thinking skills!",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30"
    }
  ];

  const aiSteps = [
    { icon: Target, title: "Choose Topic", description: "Select any category or enter your own topic" },
    { icon: Sparkles, title: "AI Generation", description: "Gemini AI creates unique, accurate questions" },
    { icon: Shield, title: "Validation", description: "Multi-layer checks ensure quality and accuracy" },
    { icon: Rocket, title: "Ready to Play", description: "Your personalized quiz is ready in seconds" }
  ];

  return (
    <div className="min-h-screen bg-transparent overflow-hidden">

      {/* Hero Section */}
      <section className="relative pt-28 pb-24 px-6 overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-20 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-10 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Powered by Google Gemini AI
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in">
            Master Any Topic with{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
              Instant AI Quizzes
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            The AI-powered quiz platform that makes learning engaging, personalized, and accessible—
            in any language, on any device.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="px-6 py-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">5000+</div>
              <div className="text-sm text-muted-foreground">Pre-Built Quizzes</div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">15+</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">50+</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">∞</div>
              <div className="text-sm text-muted-foreground">AI Quizzes</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8 py-6 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/categories#explore">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 rounded-xl border-2">
                Explore Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-card/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                Learn Better
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-generated quizzes to live multiplayer battles, QuizGen has it all.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {coreFeatures.map((feature, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl animate-fade-in"
                style={{ animationDelay: feature.delay }}
              >
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
                {/* Hover glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How AI Works Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Powered by Gemini
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How AI Creates Your{" "}
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                Perfect Quiz
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From topic to questions in seconds—here's how our AI magic works.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-4 gap-6">
            {aiSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm h-full">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-bold text-violet-500 mb-2">Step {index + 1}</div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {/* Arrow connector */}
                {index < aiSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-6 h-6 text-violet-500/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Challenges Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-card/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-medium mb-4">
              <Calendar className="w-4 h-4" />
              Daily Fun
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Complete the{" "}
              <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                Daily 3 Challenge
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every day, tackle 3 unique brain games to earn XP, climb leaderboards, and keep your streak alive!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {dailyChallenges.map((challenge, index) => (
              <Card
                key={index}
                className={`group overflow-hidden ${challenge.bg} ${challenge.border} border-2 hover:scale-[1.03] transition-all duration-300`}
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-20 h-20 rounded-full ${challenge.bg} ${challenge.border} border-2 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <challenge.icon className={`w-10 h-10 ${challenge.color}`} />
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${challenge.color}`}>{challenge.title}</h3>
                  <p className="text-muted-foreground">{challenge.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/fun-activities">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white px-8 rounded-xl">
                Play Daily Challenges <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Accessibility Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium mb-4">
                <Volume2 className="w-4 h-4" />
                Accessibility First
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Learning Without{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Barriers
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We believe everyone deserves access to quality education. That's why QuizGen is built with accessibility at its core.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Volume2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Text-to-Speech</h4>
                    <p className="text-muted-foreground text-sm">Every question can be read aloud in the correct language and accent—perfect for visual impairments or language learners.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">15+ Languages</h4>
                    <p className="text-muted-foreground text-sm">Generate quizzes in Hindi, German, Spanish, French, Japanese, and many more. Learn in your native language!</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Learning Mode</h4>
                    <p className="text-muted-foreground text-sm">No timers, no pressure. Take your time to understand each question at your own pace.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Card */}
            <div className="relative">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]" />
              <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-card/80 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Reading question...</div>
                        <div className="h-2 bg-emerald-500/20 rounded-full mt-2 overflow-hidden">
                          <div className="h-full w-2/3 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card/80 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">Question in Hindi:</div>
                      <div className="text-lg font-medium">भारत की राजधानी क्या है?</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {["🇮🇳 Hindi", "🇩🇪 German", "🇪🇸 Spanish", "🇫🇷 French"].map((lang, i) => (
                        <div key={i} className="p-3 rounded-lg bg-card/60 border border-border/50 text-center text-sm">
                          {lang}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-violet-500/10 to-blue-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
              Start Learning?
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
                Browse Quizzes
              </Button>
            </Link>
            <Link to="/fun-activities">
              <Button size="lg" variant="ghost" className="gap-2 text-lg px-10 py-7 rounded-xl">
                Try Daily Challenges
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
