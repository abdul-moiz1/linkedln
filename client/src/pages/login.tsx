import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Shield, Mail, Loader2, ArrowLeft } from "lucide-react";
import { SiGoogle, SiLinkedin } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
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
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

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
        description: "Google sign-in is not configured. Please use LinkedIn to sign in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
      setIsLoading(false);
    }
  };

  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
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
        description: "Email sign-in is not configured. Please use LinkedIn to sign in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
      
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: "Account created!",
          description: "Welcome aboard. Let's create your first carousel!",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Welcome back!",
          description: "You're now signed in.",
        });
      }
      navigate("/create");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center gap-2 cursor-pointer mb-6" 
            onClick={() => navigate("/")}
            data-testid="login-logo"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">
            Log in to create, save, and download your carousels.
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Please sign in to create and save your carousels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEmailMode ? (
              <>
                {isFirebaseConfigured && (
                  <Button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full gap-3 py-6 text-base font-medium"
                    data-testid="button-google-login"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <SiGoogle className="w-5 h-5" />
                    )}
                    Continue with Google
                  </Button>
                )}

                <Button
                  onClick={handleLinkedInLogin}
                  disabled={isLoading}
                  className="w-full gap-3 py-6 text-base font-medium bg-[#0A66C2] hover:bg-[#004182]"
                  data-testid="button-linkedin-login"
                >
                  <SiLinkedin className="w-5 h-5" />
                  Continue with LinkedIn
                </Button>

                {isFirebaseConfigured && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">or</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setIsEmailMode(true)}
                      variant="ghost"
                      className="w-full gap-3 py-6 text-base font-medium"
                      data-testid="button-email-option"
                    >
                      <Mail className="w-5 h-5" />
                      Continue with Email
                    </Button>
                  </>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
                  <Shield className="w-4 h-4" />
                  Secure OAuth authentication
                </div>
              </>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEmailMode(false)}
                  className="gap-1 -ml-2 text-slate-600"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-6 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center text-sm text-slate-600">
                  {isSignUp ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        className="text-blue-600 hover:underline font-medium"
                        data-testid="button-switch-signin"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(true)}
                        className="text-blue-600 hover:underline font-medium"
                        data-testid="button-switch-signup"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
