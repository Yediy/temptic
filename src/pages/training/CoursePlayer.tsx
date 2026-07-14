import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCourse, useRecordProgress, useSubmitQuiz } from "@/hooks/use-training";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CoursePlayer() {
  const { id } = useParams();
  const { data, isLoading } = useCourse(id);
  const [lessonIdx, setLessonIdx] = useState(0);
  const [enrollmentId] = useState<string | null>(null); // enrolled on worker side; agencies view-only here
  const record = useRecordProgress();
  const submitQuiz = useSubmitQuiz();
  const navigate = useNavigate();

  const lesson = data?.lessons[lessonIdx];
  const pct = useMemo(() => {
    if (!data?.lessons.length) return 0;
    return Math.round(((lessonIdx + 1) / data.lessons.length) * 100);
  }, [lessonIdx, data]);

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const markComplete = async () => {
    if (!enrollmentId || !lesson) return;
    await record.mutateAsync({
      enrollmentId,
      lessonId: lesson.id,
      watchedSeconds: lesson.duration_seconds,
      position: lesson.duration_seconds,
      completed: true,
    });
    if (lessonIdx < data.lessons.length - 1) setLessonIdx((i) => i + 1);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/training")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Catalog
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{data.course.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{data.course.description ?? "No description."}</p>
          <Progress value={pct} className="mt-2" />
        </CardHeader>
      </Card>

      {data.lessons.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No lessons in this course yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{lesson?.lesson_type}</Badge>
              <span>{lesson?.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lesson?.lesson_type === "video" && lesson.media_url && (
              <video src={lesson.media_url} controls className="w-full rounded-md" />
            )}
            {lesson?.lesson_type === "reading" && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{lesson.body ?? "No content."}</div>
            )}
            {lesson?.lesson_type === "quiz" && (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Quiz preview. Workers submit answers from their portal.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    enrollmentId &&
                    submitQuiz.mutate({ enrollmentId, lessonId: lesson.id, score: 100, answers: {} })
                  }
                  disabled={!enrollmentId}
                >
                  Submit sample attempt
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={lessonIdx === 0} onClick={() => setLessonIdx((i) => i - 1)}>
                Previous
              </Button>
              <Button size="sm" onClick={markComplete} disabled={!enrollmentId}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark complete
              </Button>
            </div>
            {!enrollmentId && (
              <p className="text-xs text-muted-foreground">Progress tracking is only enabled from a worker enrollment.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
