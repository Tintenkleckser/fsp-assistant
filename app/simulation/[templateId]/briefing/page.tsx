import { BriefingClient } from './_components/briefing-client';

export default function BriefingPage({ params }: { params: { templateId: string } }) {
  return <BriefingClient templateId={params?.templateId ?? ''} />;
}
