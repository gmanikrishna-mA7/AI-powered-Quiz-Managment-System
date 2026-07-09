import { Brain } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-background/60 border-t border-border/50 backdrop-blur-sm">
      {/* max-w-3xl makes it narrower horizontally as requested */}
      <div className="container max-w-3xl mx-auto px-6 py-8">
        
        {/* Row 1: Logo & Description */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              QuizGen
            </span>
          </Link>

          {/* Description */}
          <p className="text-muted-foreground text-sm text-center md:text-right max-w-xs">
            AI-powered quiz platform. Challenge yourself, track progress, and excel!
          </p>
        </div>

        {/* Horizontal Line Separator */}
        <div className="border-t border-border/50 my-6"></div>

        {/* Row 2: Copyright */}
        <div className="text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} QuizGen. All rights reserved. Powered by AI.</p>
        </div>

      </div>
    </footer>
  );
};