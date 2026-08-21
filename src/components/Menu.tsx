import { currentUser } from "@clerk/nextjs/server";
import { MenuClient } from "./MenuClient";
import { getUnreadCounts } from "@/actions/notification.actions";
import { LayoutDashboard, Users, BookOpen, FolderOpen, MessageSquare, HelpCircle, Settings, Trophy } from "lucide-react";

const menuSections = [
  {
    title: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    items: [
      { icon: "/home.png", label: "Home", href: "/", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/profile.png", label: "Profile", href: "/profile", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/announcement.png", label: "Notifications", href: "/notifications", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/setting.png", label: "Settings", href: "/settings", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "People",
    icon: <Users className="h-4 w-4" />,
    items: [
      { icon: "/teacher.png", label: "Teachers", href: "/list/teachers", visible: ["admin", "teacher"] },
      { icon: "/student.png", label: "Students", href: "/list/students", visible: ["admin", "teacher"] },
      { icon: "/parent.png", label: "Parents", href: "/list/parents", visible: ["admin", "teacher"] },
    ],
  },
  {
    title: "Academics",
    icon: <BookOpen className="h-4 w-4" />,
    items: [
      { icon: "/class.png", label: "Grades", href: "/list/grades", visible: ["admin"] },
      { icon: "/subject.png", label: "Subjects", href: "/list/subjects", visible: ["admin"] },
      { icon: "/class.png", label: "Classes", href: "/list/classes", visible: ["admin", "teacher"] },
      { icon: "/lesson.png", label: "Lessons", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: "/exam.png", label: "Exams", href: "/list/exams", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/assignment.png", label: "Assignments", href: "/list/assignments", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/result.png", label: "Results", href: "/list/results", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/assignment.png", label: "Forms", href: "/list/forms", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/attendance.png", label: "Attendance", href: "/list/attendance", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/calendar.png", label: "Events", href: "/list/events", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "Courses",
    icon: <FolderOpen className="h-4 w-4" />,
    items: [
      { icon: "/assignment.png", label: "Course Builder", href: "/teacher/courses/builder", visible: ["teacher"] },
      { icon: "/assignment.png", label: "Course Approvals", href: "/list/courses/approvals", visible: ["admin"] },
      { icon: "/assignment.png", label: "My Courses", href: "/student/courses/my", visible: ["student"] },
      { icon: "/assignment.png", label: "Course Catalog", href: "/student/courses", visible: ["student"] },
    ],
  },
  {
    title: "Community",
    icon: <MessageSquare className="h-4 w-4" />,
    items: [
      { icon: "/message.png", label: "Messages", href: "/list/messages", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/class.png", label: "My Branch Server", href: "/servers", visible: ["student"] },
      { icon: "/class.png", label: "Servers", href: "/servers", visible: ["admin", "teacher"] },

      { icon: "/announcement.png", label: "Announcements", href: "/list/announcements", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "Support",
    icon: <HelpCircle className="h-4 w-4" />,
    items: [
      { icon: "/message.png", label: "Support Tickets", href: "/support", visible: ["admin", "teacher", "student", "parent"] },
      { icon: "/message.png", label: "Requests", href: "/requests", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "Account",
    icon: <Settings className="h-4 w-4" />,
    items: [
      { icon: "/logout.png", label: "Logout", href: "/logout", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
];

const Menu = async () => {
  const user = await currentUser();
  const role = (user?.publicMetadata.role as string) || "student";
  const counts = await getUnreadCounts() as {
    messages: number; tickets: number; requests: number; teachers: number;
    students: number; parents: number; courses: number; exams: number;
    assignments: number; results: number; enrollments: number; notifications: number;
  };

  return (
    <MenuClient
      role={role}
      sections={menuSections}
      counts={{
        messages: counts.messages,
        tickets: counts.tickets,
        requests: counts.requests,
        teachers: counts.teachers,
        students: counts.students,
        parents: counts.parents,
        courses: counts.courses,
        exams: counts.exams,
        assignments: counts.assignments,
        results: counts.results,
        enrollments: counts.enrollments,
        notifications: counts.notifications,
      }}
    />
  );
};

export default Menu;
