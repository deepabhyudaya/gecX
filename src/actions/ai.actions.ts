"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { callGemini, isGeminiEnabled } from "@/lib/gemini";

const AI_AUTHOR_ID = "system";
const AI_AUTHOR_TYPE = "ai";
const AI_AUTHOR_NAME = "gecX AI";
const AI_AUTHOR_IMAGE = "/logo.png";

function buildHintPrompt(question: string, context?: string | null) {
  const contextLine = context ? `\nContext: ${context}` : "";
  return `You are a supportive academic tutor. A student is answering an assignment/exam question. Provide a short, focused hint that guides them toward the correct answer without giving the answer directly. Keep it under 3 sentences.${contextLine}\n\nQuestion: ${question}\n\nHint:`;
}

function buildAnswerPrompt(question: string, subject?: string | null) {
  const subjectLine = subject ? `\nSubject: ${subject}` : "";
  return `You are a helpful academic tutor for a college student. Answer the following question clearly, concisely, and accurately. Use examples or step-by-step explanations when helpful. Do not be overly verbose. If the question is not academic, politely decline and ask for an academic topic.\n${subjectLine}\n\nQuestion: ${question}\n\nAnswer:`;
}

export async function generateAiAnswer(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled. Add GEMINI_API_KEY and set NEXT_PUBLIC_GEMINI_ENABLED=true." };
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
    include: { subject: true },
  });
  if (!post) throw new Error("Question not found");

  const existingAiAnswer = await prisma.communityComment.findFirst({
    where: { postId, authorId: AI_AUTHOR_ID, isDeleted: false },
  });
  if (existingAiAnswer) {
    return { success: true, commentId: existingAiAnswer.id, message: "AI answer already exists." };
  }

  const prompt = buildAnswerPrompt(post.content, post.subject?.name);
  const { text, error } = await callGemini(prompt, {
    system: "You are an expert academic tutor named gecX AI. Provide concise, accurate college-level explanations. Avoid mentioning that you are an AI model.",
    maxTokens: 800,
  });

  if (error || !text) {
    return { success: false, error: error || "AI failed to generate an answer." };
  }

  const comment = await prisma.communityComment.create({
    data: {
      content: text,
      postId,
      authorId: AI_AUTHOR_ID,
      authorType: AI_AUTHOR_TYPE,
      authorName: AI_AUTHOR_NAME,
      authorImage: AI_AUTHOR_IMAGE,
    },
  });

  await prisma.communityPost.update({
    where: { id: postId },
    data: {
      isAnswered: true,
      commentCount: { increment: 1 },
    },
  });

  revalidatePath(`/community/post/${postId}`);
  revalidatePath("/community");

  return { success: true, commentId: comment.id };
}

export async function generateAssignmentHint(question: string, context?: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled." };
  }

  const prompt = buildHintPrompt(question, context);
  const { text, error } = await callGemini(prompt, {
    system: "You are an expert academic tutor. Provide concise, encouraging hints without giving away the full answer.",
    maxTokens: 300,
  });

  if (error || !text) {
    return { success: false, error: error || "AI failed to generate a hint." };
  }

  return { success: true, hint: text };
}

export async function generateTeacherQuestion(topic: string, questionType: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled." };
  }

  return { success: false, error: "AI question generator is being calibrated." };
}

export async function getAiAttendanceSummary(classId: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled." };
  }
  return { success: false, error: "AI attendance insights are coming soon." };
}

export async function getAiCourseRecommendations() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled." };
  }
  return { success: false, error: "AI course recommendations are coming soon." };
}

export async function generateDuelQuestions(subject: string, count = 5) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!isGeminiEnabled()) {
    return { success: false, error: "AI assistant is not enabled." };
  }
  return { success: false, error: "AI duel question generator is coming soon." };
}
