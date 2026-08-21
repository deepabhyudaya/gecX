import { z } from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Branch name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Year is required!" }),
  supervisorId: z.coerce.string().optional(),

  branchCode: z.string().max(20).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  totalSemesters: z.coerce.number().min(1).max(12).optional(),
  intakeCapacity: z.coerce.number().min(0).optional(),
  collegeId: z.string().optional().or(z.literal("")),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(),

  employeeId: z.string().max(50).optional().or(z.literal("")),
  designation: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  qualification: z.string().max(200).optional().or(z.literal("")),
  experienceYears: z.coerce.number().min(0).max(80).optional().or(z.nan()),
  joiningDate: z.coerce.date().optional().or(z.literal("")),
  collegeId: z.string().optional().or(z.literal("")),
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Year is required!" }),
  classId: z.coerce.number().min(1, { message: "Branch is required!" }),
  parentId: z.string().min(1, { message: "Parent Id is required!" }),

  rollNumber: z.string().max(50).optional().or(z.literal("")),
  registrationNumber: z.string().max(100).optional().or(z.literal("")),
  admissionYear: z.coerce.number().min(1900).max(2100).optional().or(z.nan()),
  currentSemester: z.coerce.number().min(1).max(12).optional().or(z.nan()),
  program: z.string().max(100).optional().or(z.literal("")),
  batch: z.string().max(50).optional().or(z.literal("")),
  section: z.string().max(10).optional().or(z.literal("")),
  hosteller: z.coerce.boolean().optional(),
  guardianName: z.string().max(100).optional().or(z.literal("")),
  guardianPhone: z.string().max(50).optional().or(z.literal("")),
  guardianRelation: z.string().max(50).optional().or(z.literal("")),
  governmentId: z.string().max(50).optional().or(z.literal("")),
  collegeId: z.string().optional().or(z.literal("")),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.coerce.number().optional().nullable(),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const attendanceSchema = z.object({
  id: z.coerce.number().optional(),
  date: z.coerce.date({ message: "Date is required!" }),
  present: z.enum(["true", "false"], { message: "Status is required!" }).transform(val => val === "true"),
  studentId: z.string().min(1, { message: "Student is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.coerce.number().optional().nullable(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required!" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], {
    message: "Day is required!",
  }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Branch is required!" }),
  teacherId: z.string().min(1, { message: "Teacher is required!" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z
  .object({
    id: z.coerce.number().optional(),
    score: z.coerce.number().min(0).max(100, { message: "Score must be 0–100!" }),
    studentId: z.string().min(1, { message: "Student is required!" }),
    examId: z.coerce.number().optional().nullable(),
    assignmentId: z.coerce.number().optional().nullable(),
  })
  .refine((data) => data.examId || data.assignmentId, {
    message: "Either Exam or Assignment must be selected!",
    path: ["examId"],
  });

export type ResultSchema = z.infer<typeof resultSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
  img: z.string().optional(),
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const gradeSchema = z.object({
  id: z.coerce.number().optional(),
  level: z.coerce.number().min(1, { message: "Year level is required and must be at least 1!" }),
});

export type GradeSchema = z.infer<typeof gradeSchema>;

export const collegeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "College name is required!" }).max(200),
  shortName: z.string().max(50).optional().or(z.literal("")),
  universityName: z.string().max(200).optional().or(z.literal("")),
  collegeCode: z.string().max(50).optional().or(z.literal("")),
  establishmentYear: z.coerce.number().min(1800).max(2100).optional().or(z.nan()),
  accreditation: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  contactEmail: z.string().email({ message: "Invalid email" }).optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  websiteUrl: z.string().url({ message: "Invalid URL" }).optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  bannerUrl: z.string().optional().or(z.literal("")),
  rollNumberFormat: z.string().max(100).optional().or(z.literal("")),
  registrationNumberFormat: z.string().max(100).optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export type CollegeSchema = z.infer<typeof collegeSchema>;

export const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { message: "Form title is required!" }),
  description: z.string().optional().nullable(),
  type: z.enum(["GENERAL", "EXAM", "ASSIGNMENT"]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  timeLimit: z.coerce.number().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  allowMultiple: z.boolean().default(false),
  examId: z.coerce.number().optional().nullable(),
  assignmentId: z.coerce.number().optional().nullable(),
});

export type FormSchema = z.infer<typeof formSchema>;

export const formQuestionSchema = z.object({
  id: z.string().optional(),
  formId: z.string(),
  type: z.enum(["SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTI_CHOICE", "DROPDOWN", "RATING", "DATE"]),
  title: z.string().min(1, { message: "Question title is required!" }),
  description: z.string().optional().nullable(),
  isRequired: z.boolean().default(true),
  order: z.number(),
  points: z.coerce.number().optional().nullable(),
});

export type FormQuestionSchema = z.infer<typeof formQuestionSchema>;

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  questionId: z.string(),
  text: z.string().min(1, { message: "Option text is required!" }),
  isCorrect: z.boolean().default(false),
  order: z.number(),
});

export type QuestionOptionSchema = z.infer<typeof questionOptionSchema>;

export const answerSubmissionSchema = z.object({
  questionId: z.string(),
  textResponse: z.string().optional().nullable(),
  selectedOptionIds: z.array(z.string()).default([]),
});

export const formResponseSchema = z.object({
  formId: z.string(),
  answers: z.array(answerSubmissionSchema),
});

export type FormResponseSchema = z.infer<typeof formResponseSchema>;

