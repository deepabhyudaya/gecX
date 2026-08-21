"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

const FullPageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background/90 backdrop-blur-md text-foreground p-6">
    <div className="relative flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full border-2 border-t-foreground border-r-foreground/30 border-b-foreground/10 border-l-foreground/10 animate-spin" />
      <div className="absolute top-3.5 flex items-center justify-center">
        <GraduationCap className="h-5 w-5 text-foreground/70" />
      </div>
      <div className="text-sm font-medium tracking-wide text-muted-foreground animate-pulse mt-2">
        Loading gecX...
      </div>
    </div>
  </div>
);

const LoginPage = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gecx_equipped_theme");
      if (!stored) return;
      const { vars, mode } = JSON.parse(stored) as {
        vars: Record<string, string>;
        mode: "light" | "dark";
      };
      const htmlEl = document.documentElement;

      Object.entries(vars).forEach(([key, value]) => {
        if (key === "backgroundImage") {
          document.body.style.backgroundImage = value;
        } else {
          htmlEl.style.setProperty(key, value);
        }
      });
      htmlEl.style.colorScheme = mode;

      htmlEl.classList.remove("light", "dark");
      htmlEl.classList.add(mode);
    } catch {

    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const role = (user?.publicMetadata.role as string)?.toLowerCase();
      if (role) {
        setIsRedirecting(true);

        if (role === "admin") {
          fetch("/api/sync-admin", { method: "POST" })
            .then(() => router.push(`/${role}`))
            .catch(() => router.push(`/${role}`));
        } else {
          router.push(`/${role}`);
        }
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || isRedirecting) return <FullPageLoader />;

  if (isSignedIn && user?.publicMetadata.role) return <FullPageLoader />;

  if (isSignedIn && !user?.publicMetadata.role) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background/90 backdrop-blur-md text-foreground p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access restricted</h2>
            <p className="text-muted-foreground text-sm">
              Your account exists, but no role has been assigned yet.
              Please contact your administrator.
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full h-11 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-semibold transition-all"
            >
              Retry Login
            </button>
          </div>
          <div className="pt-4">
            <a href="/api/auth/logout" className="text-sm text-foreground hover:underline">Sign out</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background/90 backdrop-blur-md text-foreground">
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">

            <span className="text-xl font-bold tracking-tight">gecX</span>
          </div>
        </div>


        <div className="relative z-10 text-muted-foreground/50 text-xs">
          © {new Date().getFullYear()} gecX. All rights reserved.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="md:hidden flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">gecX</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <SignIn.Root>
            <SignIn.Step name="start" className="space-y-4">
              <Clerk.GlobalError className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20" />

              <Clerk.Field name="identifier" className="space-y-1.5">
                <Clerk.Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Username
                </Clerk.Label>
                <Clerk.Input
                  type="text"
                  required
                  className="w-full h-11 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Enter your username"
                />
                <Clerk.FieldError className="text-xs text-red-400" />
              </Clerk.Field>

              <Clerk.Field name="password" className="space-y-1.5">
                <Clerk.Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Password
                </Clerk.Label>
                <div className="relative">
                  <Clerk.Input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full h-11 rounded-lg border border-border bg-card px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Clerk.FieldError className="text-xs text-red-400" />
              </Clerk.Field>

              <SignIn.Action
                submit
                className="w-full h-11 mt-2 rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2"
              >
                <Clerk.Loading>
                  {(isSubmitting) =>
                    isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-primary-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )
                  }
                </Clerk.Loading>
              </SignIn.Action>
            </SignIn.Step>
          </SignIn.Root>

          <div className="pt-8 border-t border-border space-y-4">
            <div className="flex flex-col gap-1 text-center">
              <p className="text-[13px] text-muted-foreground">Need help or a new account?</p>
              <a
                href="/tickets"
                className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 group"
              >
                Raise a Support Ticket
                <svg
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
