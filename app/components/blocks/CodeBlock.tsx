import { BlockNode } from "@/app/types/chat";

interface CodeBlockProps {
  block: BlockNode;
}

export function CodeBlock({ block }: CodeBlockProps) {
  return (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
      <code>{block.data.code}</code>
    </pre>
  );
} 