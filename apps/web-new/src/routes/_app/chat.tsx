import { createFileRoute } from '@tanstack/react-router';

import { ChatInterface } from '@/modules/chat/components/chat-interface';
import { PageGuard } from '@/modules/auth/components/page-guard';

export const Route = createFileRoute('/_app/chat')({
  component: ChatPage,
});


function ChatPage() {
  return (
    <PageGuard permission="chat:acessar">
      <div className="flex h-full w-full overflow-hidden" data-lenis-prevent>
        <ChatInterface />
      </div>
    </PageGuard>
  );
}
