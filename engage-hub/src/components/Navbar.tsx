import { Button } from "@/components/ui/button";
import { Brain, Menu, X, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";
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

const navLinks = [
  { to: "/categories", label: "Categories" },
  { to: "/fun-activities", label: "Arcade" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/profile", label: "Profile" },
  { to: "/about", label: "About" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showQuizWarning, setShowQuizWarning] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [quizSubmitLoading, setQuizSubmitLoading] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isQuizActive, quizSubmitHandler, setQuizActive } = useQuizNavigation();

  // Handle navigation with quiz check
  const handleNavigation = (e: React.MouseEvent, path: string) => {
    if (isQuizActive) {
      e.preventDefault();
      setPendingNavigate(path);
      setShowQuizWarning(true);
    }
  };

  // Confirm quiz submission and navigate
  const confirmQuizSubmitAndNavigate = async () => {
    setQuizSubmitLoading(true);
    try {
      if (quizSubmitHandler) {
        await quizSubmitHandler();
      }
      setShowQuizWarning(false);
      if (pendingNavigate === 'logout') {
        // Show logout dialog after quiz is submitted
        setPendingNavigate(null);
        setShowLogoutDialog(true);
      } else if (pendingNavigate) {
        navigate(pendingNavigate);
        setPendingNavigate(null);
      }
    } finally {
      setQuizSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      setShowLogoutDialog(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity group" onClick={(e) => handleNavigation(e, user ? "/dashboard" : "/")}>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                QuizGen
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavigation(e, link.to)}
                  className="relative text-foreground/80 hover:text-primary transition-colors font-medium py-2 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                // Authenticated: Show Logout Button
                <Button
                  onClick={async () => {
                    if (isQuizActive) {
                      // First show quiz warning
                      setPendingNavigate('logout');
                      setShowQuizWarning(true);
                    } else {
                      setShowLogoutDialog(true);
                    }
                  }}
                  variant="outline"
                  className="font-semibold gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              ) : (
                // Unauthenticated: Show Login/Register Buttons
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="font-semibold hover:bg-muted/80">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="gradient-primary text-primary-foreground font-semibold hover:opacity-90 shadow-lg hover:shadow-primary/30 transition-all">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden py-4 space-y-2 border-t border-border/50 animate-fade-in">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block py-3 px-4 text-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all font-medium"
                  onClick={(e) => {
                    if (isQuizActive) {
                      handleNavigation(e, link.to);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {user ? (
                  // Authenticated: Show Logout Button
                  <Button
                    onClick={async () => {
                      setIsOpen(false);
                      if (isQuizActive) {
                        setPendingNavigate('logout');
                        setShowQuizWarning(true);
                      } else {
                        setShowLogoutDialog(true);
                      }
                    }}
                    variant="outline"
                    className="w-full font-semibold gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                ) : (
                  // Unauthenticated: Show Login/Register Buttons
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full font-semibold">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full gradient-primary text-primary-foreground font-semibold">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={logoutLoading ? undefined : setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutLoading}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="gradient-primary text-primary-foreground"
            >
              {logoutLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quiz Auto-Submit Warning Dialog */}
      <AlertDialog open={showQuizWarning} onOpenChange={quizSubmitLoading ? undefined : setShowQuizWarning}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Leave Quiz?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              You are currently taking a quiz. If you leave this page, your quiz will be automatically submitted with your current answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quizSubmitLoading}>Stay on Quiz</AlertDialogCancel>
            <Button
              onClick={confirmQuizSubmitAndNavigate}
              disabled={quizSubmitLoading}
              className="gradient-primary text-white"
            >
              {quizSubmitLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit & Leave"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
