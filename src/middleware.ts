import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const roleRoutes: Record<string, string[]> = {
  admin: ["/admin"],
  student: ["/student"],
  teacher: ["/teacher"],
  parent: ["/parent"],
};

const publicAuthRoutes = [
  "/community",
  "/settings/community",
  "/list",
  "/api",
  "/profile",
  "/messages",
  "/notifications",
  "/tickets",
];

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role?.toLowerCase();
  const url = req.nextUrl;
  const pathname = url.pathname;
  const hostname = req.headers.get("host") || "";

  let currentHost = hostname.replace(`:${url.port}`, "");
  const isLocalhost = currentHost.endsWith("localhost");

  let subdomain = null;
  if (isLocalhost && currentHost !== "localhost") {
    subdomain = currentHost.replace(".localhost", "");
  }

  if (subdomain && subdomain !== "www") {
    return NextResponse.rewrite(new URL(`/teacher-courses/${subdomain}${pathname}`, req.url));
  }

  if (role && pathname === "/") {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }

  if (role && pathname.startsWith("/student/rivalry/")) {
    return NextResponse.next();
  }

  for (const [userRole, prefixes] of Object.entries(roleRoutes)) {
    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {

        if (!role) {
          return NextResponse.redirect(new URL("/", req.url));
        }

        if (role !== userRole) {
          return NextResponse.redirect(new URL(`/${role}`, req.url));
        }
        return NextResponse.next();
      }
    }
  }

  for (const prefix of publicAuthRoutes) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 || segments.length === 2) {

    const firstSegment = segments[0];
    const isSystemRoute =
      firstSegment.includes(".") ||
      ["_next", "api", "favicon.ico", "robots.txt", "sitemap.xml"].includes(firstSegment);

    if (!isSystemRoute) {

      if (!role) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [

    "/((?!_next|.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    "/(api|trpc)(.*)",
  ],
};
