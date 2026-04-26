import { EvaluationClient } from './_components/evaluation-client';

export default function EvaluationPage({ params }: { params: { simId: string } }) {
  return <EvaluationClient simId={params?.simId ?? ''} />;
}
