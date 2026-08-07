import KnowledgeLibrary from "@/components/knowledge/KnowledgeLibrary";

export const KnowledgeBase = () => <KnowledgeLibrary kind="article" title="Knowledge Base" />;
export const KnowledgePolicies = () => <KnowledgeLibrary kind="policy" />;
export const KnowledgeSops = () => <KnowledgeLibrary kind="sop" />;
export const KnowledgeRegulations = () => <KnowledgeLibrary kind="regulation" />;
export const KnowledgeTraining = () => <KnowledgeLibrary kind="training" />;
export const KnowledgeCertifications = () => <KnowledgeLibrary kind="certification" />;
export const KnowledgeDocuments = () => <KnowledgeLibrary kind="document" />;
