import { Navigate } from "react-router-dom";
import { useMyPassport } from "@/hooks/passport/use-workforce-passport";
import { LoadingState } from "@/components/woic/AsyncState";

export default function PassportRedirect() {
  const { data, isLoading } = useMyPassport();
  if (isLoading) return <LoadingState />;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">No passport found for this user.</div>;
  return <Navigate to={`/passport/${data.id}`} replace />;
}
