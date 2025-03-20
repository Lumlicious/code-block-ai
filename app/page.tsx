import { Chat } from "./components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            AI
          </div>
          <h1 className="text-lg font-semibold">AI Chat Assistant</h1>
        </div>
      </header>
      <Chat />
    </main>
  );
}
