import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2 } from "lucide-react";
import { SiGoogle, SiLinkedin } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: user, isLoading: isLoadingUser } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoadingUser && user) {
      navigate("/create");
    }
  }, [user, isLoadingUser, navigate]);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Required",
        description: "Google sign-in is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const idToken = await userCredential.user.getIdToken();
      const response = await fetch("/api/auth/firebase/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to verify authentication with server");
      }
      
      // Clear all cached data and invalidate queries to ensure fresh data for new user
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Welcome!",
        description: "You're now signed in. Let's create a carousel!",
      });
      navigate("/create");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in with Google";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Required",
        description: "Email sign-in is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken();
      const response = await fetch("/api/auth/firebase/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to verify authentication with server");
      }
      
      // Clear all cached data and invalidate queries to ensure fresh data for new user
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Welcome back!",
        description: "You're now signed in.",
      });
      navigate("/create");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Required",
        description: "Password reset is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { auth } = await import("@/lib/firebase");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
      toast({
        title: "Reset failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center cursor-pointer mb-6" 
            onClick={() => navigate("/")}
            data-testid="login-logo"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2" data-testid="text-login-title">
            Welcome Back
          </h1>
          <p className="text-slate-600 dark:text-slate-400" data-testid="text-login-subtitle">
            Log in to create, save, and download your carousels.
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center" data-testid="text-card-title">Sign In</CardTitle>
            <CardDescription className="text-center" data-testid="text-card-subtitle">
              Use your account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFirebaseConfigured && (
              <div className="space-y-3">
                <Button
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading || isLoading}
                  variant="outline"
                  className="w-full gap-3 py-6 text-base font-medium"
                  data-testid="button-google-login"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <SiGoogle className="w-5 h-5 text-red-500" />
                  )}
                  Continue with Google
                </Button>

                <Button
                  onClick={handleLinkedInLogin}
                  disabled={isGoogleLoading || isLoading}
                  variant="outline"
                  className="w-full gap-3 py-6 text-base font-medium border-slate-200"
                  data-testid="button-linkedin-login"
                >
                  <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
                  Continue with LinkedIn
                </Button>
              </div>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">or</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:underline font-medium"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-6 text-base font-medium"
                data-testid="button-signin"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-600 hover:underline font-medium"
                data-testid="link-signup"
              >
                Sign Up
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
