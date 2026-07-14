import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TrainingCourse = Tables<"training_courses">;
export type TrainingLesson = Tables<"training_lessons">;
export type TrainingEnrollment = Tables<"training_enrollments">;
export type TrainingProgress = Tables<"training_progress">;

export function useCourses(agencyId?: string) {
  return useQuery({
    queryKey: ["training-courses", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_courses")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourse(courseId?: string) {
  return useQuery({
    queryKey: ["training-course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: course, error: cErr } = await supabase
        .from("training_courses")
        .select("*")
        .eq("id", courseId!)
        .single();
      if (cErr) throw cErr;
      const { data: lessons, error: lErr } = await supabase
        .from("training_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      if (lErr) throw lErr;
      return { course, lessons: lessons ?? [] };
    },
  });
}

export function useMyEnrollments(workerId?: string) {
  return useQuery({
    queryKey: ["my-enrollments", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("*, course:training_courses(id, title, required, duration_minutes)")
        .eq("worker_id", workerId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecordProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollmentId,
      lessonId,
      watchedSeconds,
      position,
      completed,
    }: {
      enrollmentId: string;
      lessonId: string;
      watchedSeconds: number;
      position: number;
      completed: boolean;
    }) => {
      // Upsert progress; server trigger caps watched_seconds vs wall clock.
      const { error } = await supabase
        .from("training_progress")
        .upsert(
          {
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            watched_seconds: watchedSeconds,
            last_position_seconds: position,
            completed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "enrollment_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-enrollments"] }),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollmentId,
      lessonId,
      score,
      answers,
    }: {
      enrollmentId: string;
      lessonId: string;
      score: number;
      answers: Record<string, unknown>;
    }) => {
      const passed = score >= 80;
      const { error } = await supabase.from("training_quiz_attempts").insert({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        score_pct: score,
        passed,
        answers_json: answers as never,
      });
      if (error) throw error;
      return { passed, score };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-enrollments"] }),
  });
}
