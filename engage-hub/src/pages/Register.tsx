import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, Lock, User, Github } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const validateForm = () => {
    const errors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!fullName) errors.fullName = "Full name is required";
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is invalid";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Min 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Required";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "No match";
    }

    if (!termsAccepted) errors.terms = "Accept terms required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register(fullName, email, password, confirmPassword);
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true, state: { showWelcome: true } });
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="h-screen w-full flex bg-transparent overflow-hidden">

      {/* LEFT SIDE - Visual & Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-zinc-900 flex-col justify-between p-12 text-white h-full">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/10 opacity-70" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />

        {/* Logo Area - Clickable */}
        <Link
          to="/"
          className="relative z-10 flex items-center gap-3 w-fit hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">QuizGen</span>
        </Link>

        {/* Hero Content */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Unlock your <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Potential
            </span>
          </h1>
          <p className="text-lg text-zinc-400">
            Join thousands of learners creating, sharing, and mastering quizzes with the power of AI.
          </p>
        </div>

        {/* Quote/Footer */}
        <div className="relative z-10 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <p className="italic text-zinc-300">"The best way to predict the future is to create it."</p>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      {/* Fixed Layout: 
          1. h-full ensures it takes full height.
          2. justify-center forces vertical centering regardless of padding.
          3. p-8 provides a safety zone, but Flexbox does the positioning.
      */}
      <div className="w-full lg:w-1/2 flex items-center justify-center h-full p-8 relative">
        <div className="w-full max-w-md flex flex-col justify-center space-y-5 animate-fade-in-scale">

          <div className="text-center space-y-1 lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Create Account</h2>
            <p className="text-sm text-muted-foreground">Enter your details below to get started.</p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs lg:text-sm">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-9 h-9 lg:h-10 transition-all focus:ring-2 focus:ring-primary/20"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
              {formErrors.fullName && <p className="text-xs text-red-500">{formErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs lg:text-sm">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9 h-9 lg:h-10 transition-all focus:ring-2 focus:ring-primary/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
            </div>

            {/* Grid for Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs lg:text-sm">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-9 lg:h-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {formErrors.password && <p className="text-xs text-red-500">{formErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirm-password" className="text-xs lg:text-sm">Confirm</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-9 lg:h-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {formErrors.confirmPassword && <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
              <div className="grid gap-1 leading-none">
                <label
                  htmlFor="terms"
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Agree to <a href="#" className="text-primary hover:underline">Terms</a> & <a href="#" className="text-primary hover:underline">Privacy</a>
                </label>
                {formErrors.terms && <p className="text-[10px] text-red-500">{formErrors.terms}</p>}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold h-10 lg:h-11 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all mt-2"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Social & Login - Compacted */}
          <div className="space-y-3 pt-1">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <GoogleLoginButton mode="register" />
            </div>

            <div className="text-center text-xs lg:text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;