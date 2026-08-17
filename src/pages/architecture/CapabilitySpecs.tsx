import DocumentViewer from "./DocumentViewer";

export default function CapabilitySpecs() {
  return (
    <DocumentViewer
      capability="capspecs.list"
      title="Capability Specifications"
      description="Structured viewer for every registered capability specification."
      kindLabel="capability specifications"
    />
  );
}
