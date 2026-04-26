import { ChatClient } from './_components/chat-client';

export default function ChatPage({
  params,
  searchParams,
}: {
  params: { templateId: string };
  searchParams: { simId?: string };
}) {
  return <ChatClient templateId={params?.templateId ?? ''} simId={searchParams?.simId ?? ''} />;
}
