import { BrowserLikeChat } from '@/components/chat/BrowserLikeChat';

export default function Chat() {
  return <BrowserLikeChat currentRoute="/chat" forceEnabled={true} />;
}