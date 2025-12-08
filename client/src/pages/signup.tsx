import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: user, isLoading: isLoadingUser } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoadingUser && user) {
      navigate("/create");
    }
  }, [user, isLoadingUser, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!isFirebaseConfigured) {
      toast({
        title: "Configuration Required",
        description: "Sign up is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
      }

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
        title: "Account created!",
        description: "Welcome aboard. Let's create your first carousel!",
      });
      navigate("/create");
    } catch (error: unknown) {
      let errorMessage = "Failed to create account";
      if (error instanceof Error) {
        if (error.message.includes("email-already-in-use")) {
          errorMessage = "This email is already registered. Please sign in instead.";
        } else if (error.message.includes("invalid-email")) {
          errorMessage = "Please enter a valid email address.";
        } else if (error.message.includes("weak-password")) {
          errorMessage = "Password is too weak. Please use a stronger password.";
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            data-testid="signup-logo"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2" data-testid="text-signup-title">
            Create Your Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400" data-testid="text-signup-subtitle">
            Join us to create stunning LinkedIn carousels.
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center" data-testid="text-card-title">Sign Up</CardTitle>
            <CardDescription className="text-center" data-testid="text-card-subtitle">
              Create a new account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-confirm-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-base font-medium"
                data-testid="button-create-account"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-medium"
                  data-testid="link-signin"
                >
                  Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
