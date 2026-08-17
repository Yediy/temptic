import DocumentViewer from "./DocumentViewer";

export default function PlatformContracts() {
  return (
    <DocumentViewer
      capability="contracts.list"
      title="Platform Contracts"
      description="Structured viewer for every registered platform contract."
      kindLabel="platform contracts"
    />
  );
}
