import DocumentViewer from "./DocumentViewer";

export default function PlatformDnaPage() {
  return (
    <DocumentViewer
      capability="dna.list"
      title="Platform DNA"
      description="Structured viewer for every registered Platform DNA record."
      kindLabel="Platform DNA records"
    />
  );
}
