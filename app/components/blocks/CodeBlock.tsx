import { BlockNode } from "@/app/types/chat";
import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";

interface CodeBlockProps {
  block: BlockNode;
}

export function CodeBlock({ block }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const language = block.data.language || "plaintext";

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [block.data.code, language]);

  return (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
      <code ref={codeRef} className={`language-${language}`}>
        {block.data.code}
      </code>
    </pre>
  );
} 