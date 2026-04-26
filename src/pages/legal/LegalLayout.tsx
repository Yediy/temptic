import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, updated, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            Temp Tic
          </Link>
          <Link to="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">{updated}</p>}
        <article className="prose prose-slate mt-8 max-w-none dark:prose-invert prose-headings:mt-8 prose-headings:font-semibold prose-h2:text-lg prose-p:text-sm prose-li:text-sm">
          {children}
        </article>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/help" className="hover:text-foreground">Help</Link>
          </nav>
          <p className="mt-4">© {new Date().getFullYear()} Temp Tic. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
