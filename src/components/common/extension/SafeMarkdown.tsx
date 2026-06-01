import React from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import Prism from "prismjs";
import { useHUD } from "../../../context/HUDContext";

interface SafeMarkdownProps {
  content: string;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content }) => {
  const hud = useHUD();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const html = React.useMemo(() => {
    const customMarked = new Marked();
    customMarked.use({
      renderer: {
        code(codeObj: { text?: string; lang?: string }) {
          const text = codeObj.text || "";
          const lang = codeObj.lang || "";

          let highlighted: string;
          if (lang && Prism.languages[lang]) {
            try {
              highlighted = Prism.highlight(text, Prism.languages[lang], lang);
            } catch {
              highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
          } else {
            highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          }

          const lines = text.split("\n");
          if (lines.length > 1 && lines[lines.length - 1] === "") {
            lines.pop();
          }
          const lineNumbersHtml = lines.map((_, idx: number) => `<span>${idx + 1}</span>`).join("");
          const dataCodeAttr = text
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          return `
<div class="potok-terminal-container">
  <div class="potok-terminal-header">
    <div class="potok-terminal-dots">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    <span class="potok-terminal-lang">${lang || "js"}</span>
    <button class="potok-terminal-copy-btn" data-code="${dataCodeAttr}">Копировать</button>
  </div>
  <div class="potok-terminal-body">
    <pre class="potok-terminal-line-numbers">${lineNumbersHtml}</pre>
    <pre class="potok-terminal-pre"><code class="language-${lang}">${highlighted}</code></pre>
  </div>
</div>`;
        }
      }
    });

    try {
      return customMarked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }, [content]);

  // Sanitize html using DOMPurify before using dangerouslySetInnerHTML
  const sanitizedHtml = React.useMemo(() => {
    // Configure DOMPurify to allow needed attributes/classes for code copy and styling
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["data-code"],
      ADD_TAGS: ["span", "button", "pre", "code"],
    });
  }, [html]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains("potok-terminal-copy-btn")) {
      const codeToCopy = target.getAttribute("data-code");
      if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy).then(() => {
          hud.show("success", "Код скопирован в буфер обмена");
          target.innerText = "Скопировано!";
          setTimeout(() => {
            target.innerText = "Копировать";
          }, 2000);
        }).catch(() => {
          hud.show("error", "Не удалось скопировать");
        });
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="potok-markdown-body" 
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default SafeMarkdown;
