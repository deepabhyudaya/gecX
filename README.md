# gecX — College Management & Campus Engagement Platform

## Live: [gecx.dev](https://gecx.dev)

### YouTube Tutorial: [Watch on YouTube](https://www.youtube.com/watch?v=GW8rWpjusWE)

> A unified, role-based campus operating system that blends academic administration, community interaction, course learning, and competitive gamification into one modern Next.js application. AI and War features integrated soon.

---


## Preview

**Admin Dashboard** — Admin overview with user cards, AI insights, attendance analytics and event calendar.

![Admin Dashboard](<Image Gallery/AdminDashboard.png>)

---

## Problem Statement

Colleges and universities typically juggle disconnected tools for:

- **Academic records** — attendance, results, exams, assignments, timetables
- **Administration** — student/teacher/parent directories, approvals, announcements
- **Communication** — class groups, direct messages, public forums
- **Engagement** — events, leaderboards, rewards, rivalries

This fragmentation creates data silos, manual overhead for staff, poor visibility for parents, and a boring digital experience for students that fails to drive participation.

---

## Solution Overview

`gecX` brings every campus workflow into a single platform. It provides role-aware dashboards for **admins, teachers, students and parents**, a shared community layer, and a gamified economy (`GecX` points, karma, badges, seasons, branch/student wars) to turn campus life into an engaging, measurable experience.

The architecture is:

- **Next.js App Router** with server components and server actions
- **PostgreSQL + Prisma ORM** for structured academic and social data
- **Clerk** for authentication and role claims
- **PWA + Capacitor** for installable web and mobile experiences
- **Docker** for reproducible deployments

---

## Features

### Academic & Administration

- **Role-based dashboards** for admin, teacher, student and parent
- **Students, teachers, parents, classes, grades, subjects, lessons** directory management
- **Attendance tracking** for students and teachers with analytics charts
- **Exams, assignments and results** with Kanban-style views
- **Announcements and events** with calendar integration
- **Public tickets and support** for campus help requests
- **Course builder and approvals** for teachers and admins

### Communication & Community

- **Community feed** with posts, comments, likes, reports and reels
- **Direct messaging** between users
- **Group and server-style chat rooms** with channels, roles, emojis and stickers
- **Follow/follower system** with follow requests
- **User profiles** and username-based public URLs

### Gamification & Engagement

- `GecX` currency, wallet and transaction history
- **Karma** system with tracking and history
- **Badges and honor badges** (admin-set and community-earned)
- **Seasons, leaderboards and branch/student rankings**
- **Branch Wars (`ClassRivalry`) and Student Wars (`StudentRivalry`)** with war types, bouts, lore and spectator betting
- **Avatar, username color and theme shops** for profile customization

### AI & Quality-of-Life (Upcoming)

- **AI Campus Insights** stub powered by Google Gemini for attendance/result summaries
- **Global search** across users, lists and campus data
- **Event themes** that override UI appearance for campus festivals
- **Dark/light theme** support with persistent user preferences

### Platform

- **Progressive Web App** (PWA) support via `next-pwa`
- **Mobile app build** scaffolding via Capacitor
- **Docker / docker-compose** setup for PostgreSQL + Next.js

---

## Screenshots

> Screenshots from the `Image Gallery/` folder showing the current gecX UI.

| Screen | Description |
|--------|-------------|
| ![Admin Dashboard](<Image Gallery/AdminDashboard.png>) | Admin overview with user cards, AI insights, attendance analytics and event calendar |
| ![Admin Settings](<Image Gallery/AdminSettings.png>) | Admin configuration panel for campus, seasons, economy and karma rules |
| ![Courses](<Image Gallery/Courses.png>) | Course listing, details and enrollment pages |
| ![Direct Messages](<Image Gallery/DMs.png>) | Private one-to-one chat interface |
| ![Attendance](<Image Gallery/DragAndDropAttendance.png>) | Drag-and-drop attendance tracking for teachers |
| ![Community Feed](<Image Gallery/Feed.png>) | Posts, comments, reels and user profiles |
| ![Groups](<Image Gallery/Groups.png>) | Group chat rooms and topic communities |
| ![Leaderboard](<Image Gallery/Leaderboard.png>) | Season and all-time karma/GecX rankings |
| ![Loops](<Image Gallery/Loops.png>) | Short-form reels and campus video loops |
| ![Marketplace Avatars](<Image Gallery/MarketplaceAvatars.png>) | Avatar shop for profile customization |
| ![Marketplace Themes](<Image Gallery/MarketplaceThemes.png>) | Theme shop for UI personalization |
| ![Profile Cards](<Image Gallery/ProfileCards.png>) | User profiles, badges and public cards |
| ![Servers](<Image Gallery/Servers.png>) | Server-style chat rooms with channels, roles and emojis |
| ![Settings](<Image Gallery/Settings.png>) | User settings and preferences |
| ![Support Tickets](<Image Gallery/SupportTickets.png>) | Public ticket and support request center |

Static UI icons used in the app are located under `public/` (`announcement.png`, `assignment.png`, `attendance.png`, `calendar.png`, `exam.png`, `message.png`, `student.png`, `teacher.png`, etc.).

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org/) 14 (App Router) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS, [Radix UI](https://www.radix-ui.com/), shadcn/ui components |
| Styling utilities | `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate` |
| Animation | `motion` |
| Icons | `lucide-react` |
| State & Forms | `react-hook-form`, `zod`, `@hookform/resolvers` |
| ORM & DB | Prisma + PostgreSQL |
| Auth | Clerk (`@clerk/nextjs`) |
| Real-time | Ably |
| AI | Google Generative AI (`@google/generative-ai`) |
| Charts | `recharts` |
| Calendar | `react-big-calendar` |
| File uploads | Cloudinary (`next-cloudinary`) |
| Rich text | BlockNote, Quill, `react-markdown` |
| Theme | `next-themes` |
| Dev tools | ESLint, TypeScript, `ts-node` |
| Deployment | Docker, Node.js 18 |

---

## Installation Instructions

### Prerequisites

- Node.js 18+ and `npm` or `pnpm`
- PostgreSQL 15+ (local or Docker)
- Clerk account and a Cloudinary account (optional, for uploads)

### 1. Clone and install dependencies

```bash
git clone https://github.com/deepabhyudaya/technoviz-summer-of-code
cd gecx
pnpm install
```

### 2. Configure environment variables

Create a `.env` file at the project root and add at least:

```env
# Database
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydb

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Cloudinary (optional, for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Ably (for real-time messaging)
ABLY_API_KEY=...

# Google Gemini (for AI insights)
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Where to get these values

#### `DATABASE_URL`

- **Option 1 — Docker (recommended for local development):**
  - The included `docker-compose.yml` starts a PostgreSQL container.
  - The container is named `postgres_db` and exposes port `5432`.
  - Update `docker-compose.yml` and set:
    ```env
    DATABASE_URL=postgresql://myuser:mypassword@postgres_db:5432/mydb
    ```
- **Option 2 — Local PostgreSQL:**
  - Install PostgreSQL 15+ and create a database, e.g. `mydb`.
  - Create a user with a password or use the default `postgres` user.
  - Format:
    ```env
    DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
    # Example: postgresql://postgres:postgres@localhost:5432/gecx
    ```
- **Option 3 — Cloud provider (Neon, Supabase, Railway, etc.):**
  - Create a new project/database.
  - Copy the connection string (usually starts with `postgresql://` or `postgres://`).
  - Ensure the string includes the correct username, password, host and database name.

#### Clerk variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`)

1. Go to [https://clerk.com](https://clerk.com) and sign up.
2. Create a new application.
3. In the left sidebar, go to **Configure → API Keys**.
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`
5. Add `http://localhost:3000` to **Configure → Allowed redirect origins / URLs** for local development.
6. To get the webhook secret:
   - Go to **Configure → Webhooks** in the Clerk dashboard.
   - Click **Add endpoint**.
   - Set the endpoint URL to `http://localhost:3000/api/webhooks/clerk` for local dev (or your production URL).
   - Subscribe to `user.created`, `user.updated` and `user.deleted` events.
   - Copy the **Signing secret** → `CLERK_WEBHOOK_SECRET`.
#### How to create an admin (or any user) inside Clerk

The app uses **Clerk public metadata** to know each user's role. The Next.js middleware (`src/middleware.ts`) reads `sessionClaims.metadata.role` and redirects users to `/admin`, `/teacher`, `/student` or `/parent`.

**Steps from the Clerk dashboard:**

1. Open your Clerk application dashboard.
2. Go to **Users** in the left sidebar.
3. Click **Add user** to create the first admin, or click an existing user to edit them.
4. Fill in the required details (email, password or OAuth provider).
5. Once the user exists, open the user's detail page and click the **Public metadata** tab.
6. Add the following JSON and save:
   ```json
   {
     "role": "admin"
   }
   ```
   Valid roles are: `admin`, `teacher`, `student`, `parent`.
7. Sign out and sign back in; Clerk will include this role in the session, and `gecX` will redirect you to `/admin`.

**How session metadata works in gecX:**

`gecX` relies on Clerk's **public user metadata** to decide what a user can see and do. Clerk includes public metadata inside the session token, and the app reads it from `auth().sessionClaims.metadata`.

1. **Where the role is stored**  
   In Clerk, go to a user's **Public metadata** tab and set:
   ```json
   { "role": "admin" }
   ```

2. **Expose public metadata in the Clerk session token**  
   The metadata must be added as a custom claim so `auth().sessionClaims.metadata` is populated. In the Clerk dashboard:
   - Go to **Configure → Sessions → Customize session token**.
   - Token name: `__session` (default).
   - In the **Claims** editor add:
     ```json
     {
       "metadata": "{{user.public_metadata}}"
     }
     ```
   - Save.
   - Clerk will now expose the user's public metadata as `sessionClaims.metadata` in the Next.js server context.

3. **Where the role is read**  
   Multiple places in the codebase read the role the same way. Examples:
   - `src/middleware.ts`:
     ```ts
     const role = (sessionClaims?.metadata as { role?: string })?.role?.toLowerCase();
     ```
   - Server actions such as `src/actions/academic-subject.actions.ts`:
     ```ts
     const { sessionClaims } = auth();
     const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
     if (role !== "admin") throw new Error("Unauthorized: Admin access required");
     ```
   - React server components such as `src/components/Announcements.tsx`:
     ```ts
     const role = (sessionClaims?.metadata as { role?: string })?.role;
     ```

4. **Role-to-route mapping**  
   The middleware uses the role to protect routes:
   - `/admin/*` → only `admin`
   - `/teacher/*` → only `teacher`
   - `/student/*` → only `student`
   - `/parent/*` → only `parent`
   - `/`, `/community`, `/list`, `/messages`, `/profile`, `/notifications`, `/tickets` and username profiles → any authenticated user

5. **Token refresh / stale sessions**  
   Session claims are cached in the token at sign-in. If you change a user's role in the Clerk dashboard, the user must **sign out and sign back in** before the new role takes effect. To force a fresh token in development, delete the `__session` cookie or run `localStorage.clear()` and sign in again.

6. **How to verify the role is in the session**  
   Add this temporary debug snippet to any server component or server action:
   ```ts
   import { auth } from "@clerk/nextjs/server";

   export default async function DebugPage() {
     const { sessionClaims, userId } = auth();
     console.log("userId:", userId);
     console.log("sessionClaims:", JSON.stringify(sessionClaims, null, 2));
     return <pre>{JSON.stringify(sessionClaims, null, 2)}</pre>;
   }
   ```
   If `metadata.role` is missing, the metadata was either not saved correctly or the token was issued before the change.

7. **Auto-sync to the database**  
   The Clerk webhook at `src/app/api/webhooks/clerk/route.ts` only **auto-creates an `Admin` record in the database** when `role === "admin"`. Teachers, students and parents are normally created through the in-app forms (`/list/teachers`, `/list/students`, etc.) so all required fields (name, surname, class, grade, etc.) are filled. You can still set their `role` in Clerk metadata once they are created.

**Creating or updating a user via the Clerk Backend API:**

```bash
# Update an existing user's public metadata
curl -X PATCH https://api.clerk.com/v1/users/<USER_ID>/metadata \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"public_metadata": {"role": "admin"}}'
```

#### Cloudinary variables (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

1. Sign up at [https://cloudinary.com](https://cloudinary.com) (or log in).
2. Open your **Cloud Console** dashboard.
3. Your **Cloud name** is shown at the top-left → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
4. Go to **Settings → API Keys**.
5. Generate or copy an existing key pair:
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
6. If you do not plan to upload images immediately, you can leave these empty; the app will fall back to placeholders.

#### Ably (`ABLY_API_KEY`)

1. Sign up at [https://ably.com](https://ably.com).
2. Create a new app (or open an existing one).
3. Go to **App → API Keys**.
4. Copy a key with `Publish`, `Subscribe` and `Presence` permissions.
5. Paste the full key (e.g. `xABCxA.1234567:xxxxxxxxxxxxxxxx...`) into `ABLY_API_KEY`.

#### Google Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`)

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Click **Create API key**.
4. Select or create a Google Cloud project if prompted.
5. Copy the generated key → `GOOGLE_GENERATIVE_AI_API_KEY`.
6. This key is only needed for the AI campus-insights feature; without it the feature returns placeholder responses.

### 3. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Seed the database (optional)

```bash
npx prisma db seed
```

### 5. Start the development server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Docker alternative

A `docker-compose.yml` is included that spins up PostgreSQL and the Next.js app:

```bash
docker-compose up --build
```

---

## Usage Guide

### First run

1. Open `http://localhost:3000` and sign in via Clerk.
2. The middleware reads the user's `role` claim from Clerk metadata and redirects them to the correct dashboard:
   - `/admin` — Admin
   - `/teacher` — Teacher
   - `/student` — Student
   - `/parent` — Parent
3. Common routes such as `/community`, `/list`, `/messages`, `/profile`, `/notifications`, `/tickets` and username-based profiles (e.g. `/someusername`) are shared across roles.

### Admin

- Manage campus entities from `/list/*` (students, teachers, classes, subjects, grades, etc.)
- Review course proposals, public tickets, seasons, rivalries and event themes
- Configure GecX economy, karma rules, streak settings and avatar pricing
- View AI-generated campus insights on the admin dashboard

### Teacher

- View class schedules on the teacher dashboard
- Build courses in `/teacher/courses/builder`
- Review course enrollments and approve/reject students
- Record bouts and manage branch/student wars

### Student

- View personal schedule and calendar
- Browse and enroll in courses
- Propose and compete in student wars
- Earn karma and GecX, customize avatars/colors and climb the leaderboard

### Parent

- See the schedule and academic data of linked children
- Receive announcements and event updates

### Public tickets / support

- Any authenticated user can create support tickets
- Admins triage and respond through `/admin/public-tickets` or `/admin/tickets`

---

## Future Scope

- **Full AI assistant** for admins and teachers (attendance risk alerts, automated report summaries)
- **Real-time war rooms** with Socket.io/Ably live scoreboards for branch and student wars
- **Complete mobile apps** via Capacitor for iOS and Android
- **Push notifications** for attendance, war updates and announcements
- **Payment integration** for GecX marketplace and campus fees
- **Advanced analytics dashboard** with exportable reports
- **Single Sign-On (SSO)** and deeper LMS integrations
- **Offline-first PWA** features for low-connectivity campuses

---

## License

This project is private and maintained by the `gecX` team.
