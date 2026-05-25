import { sanitizeText } from "~/lib/sanitize";

type SafeTextProps = {
  children: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
};

export function SafeText({ children, className, as: Tag = "span" }: SafeTextProps) {
  return <Tag className={className}>{sanitizeText(children)}</Tag>;
}
