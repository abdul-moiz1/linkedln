import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { LogIn } from "lucide-react";

export default function Home() {
  const handleLogin = () => {
    // Redirect to LinkedIn OAuth authorization endpoint
    window.location.href = "/auth/linkedin";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <SiLinkedin className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">LinkedIn OAuth Demo</CardTitle>
          <CardDescription className="text-base">
            Demonstrate LinkedIn OAuth2 authentication flow with OpenID Connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>This application demonstrates:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>OAuth2 authorization flow</li>
              <li>Profile data retrieval via /v2/userinfo</li>
              <li>LinkedIn post sharing capability</li>
              <li>Secure session management</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full gap-2"
            size="lg"
            data-testid="button-login-linkedin"
          >
            <SiLinkedin className="w-5 h-5" />
            Sign in with LinkedIn
            <LogIn className="w-4 h-4 ml-auto" />
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you'll be redirected to LinkedIn's secure login page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
