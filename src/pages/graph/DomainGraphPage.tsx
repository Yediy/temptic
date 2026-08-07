import { useParams } from "react-router-dom";
import DomainGraph from "@/components/graph/DomainGraph";

export default function DomainGraphPage({ domain }: { domain?: string }) {
  const params = useParams();
  return <DomainGraph domainKey={domain ?? params.domainKey ?? "platform"} />;
}
