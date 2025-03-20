import { BlockNode } from "@/app/types/chat";

interface HeadingBlockProps {
  block: BlockNode;
}

export function HeadingBlock({ block }: HeadingBlockProps) {
  const level = block.data.level || 1;
  const headingClass = "font-bold mt-4";

  switch (level) {
    case 1:
      return <h1 className={headingClass}>{block.data.text}</h1>;
    case 2:
      return <h2 className={headingClass}>{block.data.text}</h2>;
    case 3:
      return <h3 className={headingClass}>{block.data.text}</h3>;
    case 4:
      return <h4 className={headingClass}>{block.data.text}</h4>;
    case 5:
      return <h5 className={headingClass}>{block.data.text}</h5>;
    case 6:
      return <h6 className={headingClass}>{block.data.text}</h6>;
    default:
      return <h1 className={headingClass}>{block.data.text}</h1>;
  }
} 