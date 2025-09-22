import { ChatDemo } from '@/components/chat/ChatDemo';

export default function Chat() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="container mx-auto p-6 max-w-6xl flex-1 flex flex-col min-h-0 max-h-screen overflow-hidden">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-2">AI Chat Assistant</h1>
          <p className="text-muted-foreground">
            Chat with your AI assistant to manage servers and execute tasks
          </p>
        </div>
        
        <div className="flex-1 min-h-0">
          <ChatDemo currentRoute="/chat" forceEnabled={true} />
        </div>
      </div>
    </div>
  );
}