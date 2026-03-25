import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span> doesn't exist.
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline">
            <Link to="/">Agency Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/client">Client Portal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/worker">Worker Portal</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
