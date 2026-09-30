export default function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-sm text-ink-soft">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="pt-1 text-sm font-semibold text-ink">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p key={i} className="pl-3">
              • {trimmed.slice(2)}
            </p>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}
