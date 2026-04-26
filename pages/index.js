import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const MODES = {
  chat: {
    label: "Talk to Annet",
    placeholder: "Say something...",
    intro: "Sooraj thinks things through and sees multiple angles. I'm just a close, not exact, reflection of him."
  },
  refine: {
    label: "Refine Writing",
    placeholder: "Paste your draft here ~ I'll rewrite it in Sooraj's voice...",
    intro: "Paste your draft. I'll rewrite it the way Sooraj would ~ no AI sheen, no hollow filler."
  },
  recommend: {
    label: "What to Read",
    placeholder: "Tell me what you're in the mood for...",
    intro: "Tell me what you're looking for ~ I'll point you to something worth reading."
  },
  professional: {
    label: "Professional",
    placeholder: "Ask about Sooraj's work, skills, or experience...",
    intro: null
  },
  feed: {
    label: "🧠 Brain",
    placeholder: "",
    intro: null
  }
};

const REFINE_PASSWORD = "parkwaydrive";
const PROFESSIONAL_PASSWORD = "hired";
const FEED_PASSWORD = "9567083285";

function ThinkingText() {
  const [phase, setPhase] = useState(0);
  const phases = ["Annet is thinking...", "Annet is typing..."];
  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 2), 1400);
    return () => clearInterval(t);
  }, []);
  return <span style={{fontSize: "13px", color: "var(--text-dim)", fontStyle: "italic"}}>{phases[phase]}</span>;
}

export default function Annet() {
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refineUnlocked, setRefineUnlocked] = useState(false);
  const [professionalUnlocked, setProfessionalUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [companySet, setCompanySet] = useState("");
  const [humorPref, setHumorPref] = useState(null);
  const [showHumorPopup, setShowHumorPopup] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [lastDraft, setLastDraft] = useState("");
  const [refineFrom, setRefineFrom] = useState("original");
  const [feedUnlocked, setFeedUnlocked] = useState(false);
  const [feedText, setFeedText] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedFile, setFeedFile] = useState(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedResult, setFeedResult] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // "original" | "generated"
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setLastDraft("");
    setRefineFeedback("");
    setRefineInstructions("");
  }, [mode]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const handlePasswordSubmit = () => {
    const val = passwordInput.trim().toLowerCase();
    if (mode === "refine" && val === REFINE_PASSWORD) {
      setRefineUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else if (mode === "professional" && val === PROFESSIONAL_PASSWORD) {
      setProfessionalUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else if (mode === "feed" && val === FEED_PASSWORD) {
      setFeedUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else {
      setPasswordError(true); setPasswordInput("");
      passwordRef.current?.focus();
    }
  };

  const handlePasswordKey = (e) => {
    if (e.key === "Enter") handlePasswordSubmit();
  };

  const handleCompanySubmit = () => {
    if (companyInput.trim()) { setCompanySet(companyInput.trim()); setCompanyInput(""); }
  };

  const handleFeedIngest = async (type) => {
    setFeedLoading(true); setFeedResult(null); setFeedError(null);
    try {
      let body = { password: FEED_PASSWORD, type };
      if (type === "text") {
        if (!feedText.trim()) { setFeedError("Paste some content first."); setFeedLoading(false); return; }
        body.content = feedText.trim();
      } else if (type === "url") {
        if (!feedUrl.trim()) { setFeedError("Enter a URL first."); setFeedLoading(false); return; }
        body.url = feedUrl.trim();
      } else if (type === "document") {
        if (!feedFile) { setFeedError("Choose a file first."); setFeedLoading(false); return; }
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = () => reject(new Error("Could not read file"));
          reader.readAsText(feedFile, "UTF-8");
        });
        if (!text || text.trim().length < 5) {
          setFeedError("File appears empty or unreadable. Try a .txt file.");
          setFeedLoading(false);
          return;
        }
        body.content = text.trim();
        body.filename = feedFile.name;
      }
      const res = await fetch("/api/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingestion failed");
      setFeedResult(data.message);
      if (type === "text") setFeedText("");
      if (type === "url") setFeedUrl("");
      if (type === "document") setFeedFile(null);
    } catch (err) { setFeedError(err.message); }
    finally { setFeedLoading(false); }
  };

  const handleSync = async (mode = "recent") => {
    setSyncLoading(true); setSyncResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      setSyncResult(`${mode === "full" ? "Full sync" : "Recent sync"} done ~ ${data.ingested} new, ${data.skipped} already known${data.errors > 0 ? `, ${data.errors} errors` : ""}.`);
    } catch { setSyncResult("Sync failed ~ try again."); }
    finally { setSyncLoading(false); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      // For refine mode, construct a proper editorial prompt
      const isRefineFeedback = mode === "refine" && lastDraft && messages.length > 0;
      const lastGenerated = isRefineFeedback
        ? messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || ""
        : "";
      const baseContent = isRefineFeedback
        ? (refineFrom === "generated" ? lastGenerated : lastDraft)
        : text;
      if (mode === "refine" && !isRefineFeedback) setLastDraft(text);

      const refineUserMessage = isRefineFeedback
        ? `Here is the article that needs further improvement:\n\n${baseContent}\n\n---\nSpecific feedback to apply:\n${text}\n\nRewrite the full article incorporating this feedback precisely. Output the improved article only.`
        : `Transform this raw draft into a publish-ready article in Sooraj's voice.${refineInstructions.trim() ? `\n\nSpecial instructions from Sooraj:\n${refineInstructions.trim()}` : ""}\n\nDraft:\n${text}`;

      const apiMessages = mode === "refine"
        ? [{ role: "user", content: refineUserMessage }]
        : mode === "professional" && companySet
        ? [{ role: "system", content: `The person asking is from ${companySet}. Reference this naturally where relevant.` }, ...newMessages]
        : newMessages;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, mode, humorPref })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      // Show humor popup after first exchange in chat mode
      if (mode === "chat" && humorPref === null && newMessages.length === 1) {
        setTimeout(() => setShowHumorPopup(true), 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <Head>
        <title>Annet ~ Another Perspective</title>
        <meta name="description" content="A digital twin of Sooraj Ram ~ talk, read, think." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0e0e0e;
          --surface: #161616;
          --border: #2a2a2a;
          --border-light: #1e1e1e;
          --text: #e8e4dd;
          --text-dim: #6b6560;
          --text-mid: #9e9890;
          --accent: #c8a96e;
          --accent-dim: #7a6540;
          --user-bg: #1a1a1a;
          --annet-bg: #121212;
          --font-display: 'Playfair Display', Georgia, serif;
          --font-mono: 'DM Mono', 'Courier New', monospace;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.7;
          height: 100%;
          overflow: hidden;
        }

        ::selection { background: var(--accent-dim); color: var(--text); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 780px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        .header {
          padding: 28px 0 20px;
          border-bottom: 1px solid var(--border-light);
          flex-shrink: 0;
        }

        .header-top {
          display: flex;
          align-items: baseline;
          gap: 16px;
          margin-bottom: 16px;
        }

        .logo {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.5px;
        }

        .logo-tag {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mode-tabs {
          display: flex;
          gap: 2px;
        }

        .mode-tab {
          background: none;
          border: 1px solid transparent;
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 5px 12px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .mode-tab:hover { color: var(--text-mid); border-color: var(--border); }

        .mode-tab.active {
          color: var(--accent);
          border-color: var(--accent-dim);
          background: rgba(200, 169, 110, 0.06);
        }

        /* Messages */
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 8px 0 40px;
        }

        .empty-intro {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 22px;
          color: var(--text-mid);
          line-height: 1.5;
          max-width: 480px;
          margin-bottom: 32px;
        }

        .empty-hints {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-hint {
          background: none;
          border: none;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          text-align: left;
          padding: 6px 0;
          border-bottom: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .empty-hint:hover {
          color: var(--text-mid);
          border-bottom-color: var(--border);
        }

        .empty-hint::before {
          content: "→ ";
          color: var(--accent-dim);
        }

        .message-group {
          margin-bottom: 28px;
        }

        .message-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .message-label.annet { color: var(--accent-dim); }

        .message-content {
          color: var(--text);
          line-height: 1.75;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .message-content.user {
          color: var(--text-mid);
          font-style: italic;
        }

        .message-content p { margin-bottom: 12px; }
        .message-content p:last-child { margin-bottom: 0; }

        .message-content a {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid var(--accent-dim);
        }

        .message-content a:hover { border-bottom-color: var(--accent); }

        .divider {
          height: 1px;
          background: var(--border-light);
          margin: 28px 0;
        }

        /* Loading */
        .loading {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-dim);
          font-size: 12px;
          padding: 8px 0;
        }

        /* Input area */
        .input-area {
          border-top: 1px solid var(--border-light);
          padding: 16px 0 24px;
          flex-shrink: 0;
        }

        .input-wrap {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .input-textarea {
          flex: 1;
          background: none;
          border: none;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.7;
          padding: 8px 0;
          resize: none;
          min-height: 40px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .input-textarea::placeholder { color: var(--text-dim); }
        .input-textarea:focus { border-bottom-color: var(--accent-dim); }

        .send-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.06em;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
          margin-bottom: 2px;
        }

        .send-btn:hover:not(:disabled) {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .error-msg {
          font-size: 12px;
          color: #c06060;
          margin-top: 8px;
        }

        /* Refine feedback bar */
        .refine-feedback-wrap {
          padding-bottom: 4px;
        }

        .refine-feedback-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .refine-feedback-label {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-dim);
        }

        .refine-from-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .refine-from-label {
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.04em;
        }

        .refine-from-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .refine-from-btn:hover { color: var(--text-mid); border-color: var(--border); }

        .refine-from-btn.active {
          border-color: var(--accent-dim);
          color: var(--accent);
          background: rgba(200,169,110,0.06);
        }

        .refine-reset-btn {
          background: none;
          border: none;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          cursor: pointer;
          padding: 6px 0;
          margin-top: 4px;
          transition: color 0.15s ease;
        }

        .refine-reset-btn:hover { color: var(--text-mid); }

        .footer-note {
          font-size: 10px;
          color: var(--text-dim);
          margin-top: 10px;
          letter-spacing: 0.04em;
        }

        /* Password gate */
        .password-gate {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 40px 0;
        }

        .password-gate-title {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 22px;
          color: var(--text-mid);
          margin-bottom: 8px;
        }

        .password-gate-sub {
          font-size: 12px;
          color: var(--text-dim);
          margin-bottom: 32px;
        }

        .password-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .password-input {
          background: none;
          border: none;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          padding: 8px 0;
          outline: none;
          width: 200px;
          transition: border-color 0.15s ease;
          letter-spacing: 0.1em;
        }

        .password-input:focus { border-bottom-color: var(--accent-dim); }
        .password-input::placeholder { color: var(--text-dim); letter-spacing: 0; }

        .password-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 7px 14px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .password-btn:hover {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .password-error {
          font-size: 11px;
          color: #c06060;
          margin-top: 10px;
        }

        /* Professional card */
        .pro-card {
          padding: 32px 0;
          max-width: 600px;
        }

        .pro-card {
          width: 100%;
          padding-top: 4px;
          padding-bottom: 40px;
        }

        .pro-name {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .pro-title {
          font-size: 12px;
          color: var(--accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .pro-section {
          margin-bottom: 20px;
        }

        .pro-section-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .pro-section-body {
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.7;
        }

        .pro-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pro-tag {
          font-size: 11px;
          color: var(--text-dim);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 2px;
        }

        .pro-divider {
          height: 1px;
          background: var(--border-light);
          margin: 20px 0;
        }

        .pro-ask-hint {
          font-size: 12px;
          color: var(--text-dim);
          margin-top: 24px;
          font-style: italic;
        }

        /* Achievement list */
        .achieve-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .achieve-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.65;
        }

        .achieve-dot {
          color: var(--accent-dim);
          font-size: 8px;
          margin-top: 5px;
          flex-shrink: 0;
        }

        /* Experience list */
        .exp-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .exp-item {
          border-left: 2px solid var(--border);
          padding-left: 12px;
        }

        .exp-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 3px;
        }

        .exp-role {
          font-size: 13px;
          color: var(--text);
          font-weight: 500;
        }

        .exp-period {
          font-size: 10px;
          color: var(--text-dim);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .exp-org {
          font-size: 11px;
          color: var(--text-dim);
          line-height: 1.5;
        }

        /* Tool cards */
        .tools-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .tools-grid { grid-template-columns: 1fr; }
        }

        .tool-card {
          display: block;
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 14px 16px;
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .tool-card:hover {
          border-color: var(--accent-dim);
          background: rgba(200,169,110,0.04);
        }

        .tool-name {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }

        .tool-row {
          display: flex;
          gap: 10px;
          margin-bottom: 6px;
          align-items: flex-start;
        }

        .tool-row:last-child { margin-bottom: 0; }

        .tool-label {
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim);
          padding-top: 2px;
          min-width: 52px;
          flex-shrink: 0;
        }

        .tool-text {
          font-size: 12px;
          color: var(--text-mid);
          line-height: 1.6;
        }

        .tool-footnote {
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 14px;
          font-style: italic;
          line-height: 1.6;
        }

        /* Feed / Brain tab */
        .feed-card {
          width: 100%;
          padding-top: 4px;
          padding-bottom: 40px;
        }

        .feed-title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .feed-subtitle {
          font-size: 12px;
          color: var(--text-dim);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .feed-section { margin-bottom: 4px; }

        .feed-section-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .feed-section-body {
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .feed-divider {
          height: 1px;
          background: var(--border-light);
          margin: 20px 0;
        }

        .feed-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .feed-source {
          font-size: 11px;
          color: var(--accent-dim);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 2px;
        }

        .feed-textarea {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
          padding: 10px 12px;
          resize: vertical;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s ease;
        }

        .feed-textarea:focus { border-color: var(--accent-dim); }
        .feed-textarea::placeholder { color: var(--text-dim); }

        .feed-input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 8px 12px;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s ease;
        }

        .feed-input:focus { border-color: var(--accent-dim); }
        .feed-input::placeholder { color: var(--text-dim); }

        .feed-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-mid);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 7px 16px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
          display: block;
        }

        .feed-btn:hover:not(:disabled) {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .feed-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .feed-file-label {
          display: inline-block;
          border: 1px dashed var(--border);
          border-radius: 3px;
          padding: 10px 16px;
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          margin-bottom: 10px;
          transition: all 0.15s ease;
        }

        .feed-file-label:hover { border-color: var(--accent-dim); color: var(--accent); }

        .feed-success {
          font-size: 12px;
          color: #4a9;
          line-height: 1.5;
        }

        .feed-error {
          font-size: 12px;
          color: #c06060;
          line-height: 1.5;
        }

        /* Humor popup */
        .humor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 32px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .humor-card {
          background: #1a1a1a;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 24px;
          max-width: 420px;
          width: calc(100% - 40px);
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .humor-card-title {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 17px;
          color: var(--text);
          line-height: 1.5;
          margin-bottom: 6px;
        }

        .humor-card-sub {
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .humor-btns {
          display: flex;
          gap: 10px;
        }

        .humor-btn {
          flex: 1;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-mid);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 10px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .humor-btn:hover { border-color: var(--accent-dim); color: var(--accent); }

        .humor-btn.yes:hover { border-color: var(--accent); background: rgba(200,169,110,0.08); }

        @media (max-width: 600px) {
          .app { padding: 0 16px; }
          .logo { font-size: 22px; }
          .empty-intro { font-size: 18px; }
          .mode-tab { padding: 5px 8px; font-size: 10px; }
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <span className="logo">Annet</span>
            <span className="logo-tag">Sooraj's Digital Twin</span>
          </div>
          <nav className="mode-tabs">
            {Object.entries(MODES).map(([key, val]) => (
              <button
                key={key}
                className={`mode-tab ${mode === key ? "active" : ""}`}
                onClick={() => setMode(key)}
              >
                {val.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Messages */}
        <div className="messages">
          {(mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked) || (mode === "feed" && !feedUnlocked) ? (
            <div className="password-gate">
              <p className="password-gate-title">
                {mode === "feed" ? "Here is where Sooraj's Brain lives." : mode === "professional" ? "This one's for the right people." : "This one's just for Sooraj."}
              </p>
              <p className="password-gate-sub">Enter the password to continue.</p>
              <div className="password-row">
                <input
                  ref={passwordRef}
                  type="password"
                  className="password-input"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={handlePasswordKey}
                  placeholder="password"
                  autoFocus
                />
                <button className="password-btn" onClick={handlePasswordSubmit}>
                  Enter
                </button>
              </div>
              {passwordError && (
                <p className="password-error">That's not it ~ try again.</p>
              )}
            </div>
          ) : isEmpty ? (
            <div className="empty-state">
              {mode === "professional" ? (
                <div className="pro-card">
                  <div className="pro-name">Sooraj Ram</div>
                  <div className="pro-title">Consumer Insights & Analytics · Brand Strategy · EIR</div>

                  {/* HEADLINE */}
                  <div className="pro-section">
                    <div className="pro-section-label">The one thing to know</div>
                    <div className="pro-section-body">
                      In 2023, Sooraj conceived "Consumer Proxy" ~ a first-principles framework for AI-led whitespace discovery in FMCG. He built a quasi-PoC. Two years later, an independent FMCG-tech startup built the same idea from scratch and raised <strong style={{color:"var(--accent)"}}>Rs 53 Crore</strong> in Oct 2025. The idea existed first. That's the kind of thinking he brings to work.
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* SUMMARY */}
                  <div className="pro-section">
                    <div className="pro-section-label">In short</div>
                    <div className="pro-section-body">
                      Engineer by training, marketer by practice. 5 years 3 months full-time + 2 years 7 months as a freelance consultant during college ~ clientele across 7 countries. Built <strong style={{color:"var(--text)"}}>24 data-led capabilities (19 PoCs)</strong> across organisations, turning data → insight → action → revenue. Currently at Sweet Karam Coffee functioning as an EIR for the CEO ~ owning everything from product roadmap to launch to post-launch performance.
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* KEY ACHIEVEMENTS */}
                  <div className="pro-section">
                    <div className="pro-section-label">Achievements that stand out</div>
                    <div className="achieve-list">
                      {[
                        "Earned Rs 10.54L during college ~ running marketing research & growth projects across 7 countries, parallelly managing studies",
                        "Promoted to Team Lead at Better Mortgage in under a year of joining as an Analyst ~ led 12 franchises as Senior Associate at ZoomRx shortly after",
                        "Set up Consumer Insights from scratch at Traya ~ first person in the role. Led 2 new brand launches: Mool (Health) & Clear Ritual (Skin)",
                        "Built a quick product testing framework at Rs 0 cost at CavinKare ~ and a D2C NPD Playbook adopted across the team",
                        "University topper: CGPA 9.39/10 · 100% in two semesters · Academic excellence award 8 times across 4 years · 99th percentile in English nationally"
                      ].map((a, i) => (
                        <div key={i} className="achieve-item">
                          <span className="achieve-dot">◆</span>
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* EXPERIENCE */}
                  <div className="pro-section">
                    <div className="pro-section-label">Experience</div>
                    <div className="exp-list">
                      {[
                        { role: "Consumer & Market Intelligence", org: "Sweet Karam Coffee", period: "May '25 – Present", note: "EIR for CEO · Product roadmap · Brand · Growth · CMI CoE" },
                        { role: "Consumer Insights, Category", org: "Plum", period: "Mar '25 – May '25", note: "Market entry · Trendspotting · Path2Purchase · TrendScore" },
                        { role: "Consumer Insights Lead, Brand", org: "Traya", period: "May '24 – Mar '25", note: "Built insights team · 2 brand launches · Acquisition & retention" },
                        { role: "Consumer Insights & Analytics", org: "CavinKare", period: "Dec '22 – May '24", note: "Qual + Quant · D2C/Ecom · Insights Engine · NPD Playbook" },
                        { role: "Senior Associate, Market Research", org: "ZoomRx", period: "Jun '22 – Dec '22", note: "Led 12 franchises · Feasibility analysis · Consulting support" },
                        { role: "Team Lead, Ops Intelligence", org: "Better Mortgage Corporation", period: "Sept '20 – Jun '22", note: "Promoted to lead in under a year" },
                        { role: "R&D Project Intern", org: "ISRO", period: "Jan '20 – Feb '20", note: "" },
                      ].map((e, i) => (
                        <div key={i} className="exp-item">
                          <div className="exp-top">
                            <span className="exp-role">{e.role}</span>
                            <span className="exp-period">{e.period}</span>
                          </div>
                          <div className="exp-org">{e.org}{e.note ? ` · ${e.note}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* PROFICIENCIES */}
                  <div className="pro-section">
                    <div className="pro-section-label">Proficiencies</div>
                    <div className="pro-tags">
                      {["Consumer Insights", "Brand Strategy", "Data Literacy", "Behavioural Science", "Qual + Quant", "Category Management", "D2C & Ecom", "Market Entry", "NPD & Launch", "Analytical Frameworks", "Trendspotting", "Comms Strategy"].map(t => (
                        <span key={t} className="pro-tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* EDUCATION */}
                  <div className="pro-section">
                    <div className="pro-section-label">Education</div>
                    <div className="pro-section-body">
                      B.Tech Mechanical Engineering · APJ Abdul Kalam Technological University · CGPA 9.39/10 · University topper S5 & S8 (10/10) · Academic excellence award 8 times · 99th percentile English · 96th percentile Quantitative (Advanced)
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* TOOLS */}
                  <div className="pro-section">
                    <div className="pro-section-label">Tools he has built</div>
                    <div className="pro-section-body" style={{marginBottom:"14px", fontSize:"12px", color:"var(--text-dim)"}}>
                      Built independently ~ each one solving a gap he spotted from inside the industry.
                    </div>
                    <div className="tools-grid">
                      {[
                        { name:"Right Copywriter", url:"https://right-copywriter.vercel.app/", problem:"AI generates text, not content. Most copy tools have no understanding of why people buy.", solution:"Behavioural science engine trained on 62 cognitive biases ~ writes copy that sells, not just sounds good." },
                        { name:"Adroit", url:"https://adroit-alpha.vercel.app/", problem:"People buy through System 1 thinking. Scripts rarely cater to that part of the brain.", solution:"Second-by-second, shoot-ready scripts grounded in behavioural science with brand asset integration." },
                        { name:"South or Not", url:"https://southproud.vercel.app/", problem:"Product ideas are easy, especially now. But most aren't consumer-rooted. 10 launches, 1 success if lucky.", solution:"Science-led product intelligence suite for South Indian food ~ end-to-end from concept to shelf." },
                        { name:"Soul Scape", url:"https://soulscape-site.vercel.app/", problem:"People struggle to find the right place to go ~ and even more so once they get there.", solution:"Spotify-like mood discovery for travel + Duolingo-style trip planning that handholds from discovery to destination." }
                      ].map(tool => (
                        <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className="tool-card">
                          <div className="tool-name">{tool.name} ↗</div>
                          <div className="tool-row"><span className="tool-label">Problem</span><span className="tool-text">{tool.problem}</span></div>
                          <div className="tool-row"><span className="tool-label">Solution</span><span className="tool-text">{tool.solution}</span></div>
                        </a>
                      ))}
                    </div>
                    <p className="tool-footnote">+ 10 more built for fun ~ including one called <em>Marketing BS Detector</em>. Make of that what you will.</p>
                  </div>

                  <div className="pro-divider" />

                  {/* COMPANY INPUT */}
                  <div className="pro-section">
                    <div className="pro-section-label" style={{color:"var(--accent-dim)"}}>Optional ~ helps personalise the conversation</div>
                    <div className="pro-section-body" style={{marginBottom:"10px", fontSize:"12px", color:"var(--text-dim)"}}>
                      Which company are you from?
                    </div>
                    <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
                      <input
                        type="text"
                        className="password-input"
                        style={{width:"220px", letterSpacing:"normal"}}
                        placeholder="e.g. Unilever, Mamaearth..."
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCompanySubmit()}
                      />
                      <button className="password-btn" onClick={handleCompanySubmit}>Set</button>
                    </div>
                    {companySet && <p style={{fontSize:"11px", color:"var(--accent-dim)", marginTop:"8px"}}>Got it ~ asking in context of {companySet}.</p>}
                  </div>

                  <p className="pro-ask-hint">Ask anything about his work, approach, or experience.</p>
                </div>
              ) : mode === "feed" ? (
                <div className="feed-card">
                  <div className="feed-title">Sooraj's Brain</div>
                  <div className="feed-subtitle">Whatever you add here ~ Annet learns. Permanently.</div>

                  <div className="feed-section">
                    <div className="feed-section-label">Auto-sync</div>
                    <div className="feed-section-body">Runs daily at 2am and picks up new posts from your blog and Medium automatically. You don't need to do anything.</div>
                    <div className="feed-row" style={{marginTop:"10px"}}>
                      <span className="feed-source">lifein20s.home.blog</span>
                      <span className="feed-source">medium.com/@nytt_liv</span>
                    </div>
                    <div style={{display:"flex", gap:"8px", marginTop:"12px", flexWrap:"wrap"}}>
                      <button className="feed-btn" onClick={() => handleSync("recent")} disabled={syncLoading}>
                        {syncLoading ? "Syncing..." : "↻ Sync last 10"}
                      </button>
                      <button className="feed-btn" onClick={() => handleSync("full")} disabled={syncLoading} style={{borderColor:"var(--accent-dim)", color:"var(--accent)"}}>
                        {syncLoading ? "Syncing..." : "↻ Full sync (all articles)"}
                      </button>
                    </div>
                    <p style={{fontSize:"11px", color:"var(--text-dim)", marginTop:"8px"}}>Full sync pulls every article ever written. Run once. After that, last 10 is enough.</p>
                    {syncResult && <p className="feed-success">{syncResult}</p>}
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Paste text</div>
                    <div className="feed-section-body">Notes, thoughts, conversations, anything.</div>
                    <textarea
                      className="feed-textarea"
                      value={feedText}
                      onChange={e => setFeedText(e.target.value)}
                      placeholder="Paste any text ~ raw notes, a draft, a conversation..."
                      rows={4}
                    />
                    <button className="feed-btn" onClick={() => handleFeedIngest("text")} disabled={feedLoading}>
                      {feedLoading ? "Adding..." : "Add to Brain"}
                    </button>
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Add by URL</div>
                    <div className="feed-section-body">Any link ~ Annet will fetch and learn from it.</div>
                    <input
                      type="text"
                      className="feed-input"
                      value={feedUrl}
                      onChange={e => setFeedUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleFeedIngest("url")}
                      placeholder="https://..."
                    />
                    <button className="feed-btn" onClick={() => handleFeedIngest("url")} disabled={feedLoading}>
                      {feedLoading ? "Fetching..." : "Fetch & Add"}
                    </button>
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Upload document</div>
                    <div className="feed-section-body">Any .txt or .md file.</div>
                    <label className="feed-file-label">
                      <input
                        type="file"
                        accept=".txt,.md,.csv"
                        style={{display:"none"}}
                        onChange={e => setFeedFile(e.target.files[0] || null)}
                      />
                      {feedFile ? `✓ ${feedFile.name}` : "Choose file"}
                    </label>
                    <button className="feed-btn" onClick={() => handleFeedIngest("document")} disabled={feedLoading || !feedFile}>
                      {feedLoading ? "Processing..." : "Add Document"}
                    </button>
                  </div>

                  {feedResult && <p className="feed-success" style={{marginTop:"16px"}}>✓ {feedResult}</p>}
                  {feedError && <p className="feed-error" style={{marginTop:"16px"}}>✗ {feedError}</p>}
                </div>
              ) : (
              <>
              <p className="empty-intro">{MODES[mode].intro}</p>
              {mode === "refine" && (
                <div style={{width:"100%", marginBottom:"16px"}}>
                  <div style={{fontSize:"10px", letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--accent-dim)", marginBottom:"8px"}}>
                    Special instructions (optional)
                  </div>
                  <textarea
                    className="input-textarea"
                    value={refineInstructions}
                    onChange={e => setRefineInstructions(e.target.value)}
                    placeholder="e.g. keep it under 500 words, add subheadings, make it more punchy, write for LinkedIn..."
                    rows={2}
                    style={{width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"3px", padding:"8px 10px", resize:"vertical", fontSize:"13px"}}
                  />
                </div>
              )}
              </>
              )}
              {mode === "chat" && (
                <div className="empty-hints">
                  {[
                    "What's something most people get wrong about marketing?",
                    "Why do you write?",
                    "What's something you believe that most people would disagree with?",
                    "How did an engineer end up in marketing?"
                  ].map((hint, i) => (
                    <button key={i} className="empty-hint" onClick={() => {
                      setInput(hint);
                      textareaRef.current?.focus();
                    }}>
                      {hint}
                    </button>
                  ))}
                </div>
              )}
              {mode === "recommend" && (
                <div className="empty-hints">
                  {[
                    "Something that will make me question my assumptions",
                    "I'm feeling a bit lost ~ what should I read?",
                    "Something about writing and identity",
                    "What's your most contrarian piece?"
                  ].map((hint, i) => (
                    <button key={i} className="empty-hint" onClick={() => {
                      setInput(hint);
                      textareaRef.current?.focus();
                    }}>
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className="message-group">
                    <div className={`message-label ${msg.role === "assistant" ? "annet" : ""}`}>
                      {msg.role === "assistant" ? "Annet" : "You"}
                    </div>
                    <div
                      className={`message-content ${msg.role === "user" ? "user" : ""}`}
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.content)
                      }}
                    />
                  </div>
                  {i < messages.length - 1 && <div className="divider" />}
                </div>
              ))}

              {loading && (
                <>
                  <div className="divider" />
                  <div className="loading">
                    <ThinkingText />
                  </div>
                </>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        

        {/* Input */}
        {!((mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked) || mode === "feed") && (
        <div className="input-area">
          {mode === "refine" && messages.length > 0 ? (
            <div className="refine-feedback-wrap">
              <div className="refine-feedback-top">
                <span className="refine-feedback-label">Refine further</span>
                <div className="refine-from-toggle">
                  <span className="refine-from-label">Work from:</span>
                  <button
                    className={`refine-from-btn ${refineFrom === "original" ? "active" : ""}`}
                    onClick={() => setRefineFrom("original")}
                  >Original draft</button>
                  <button
                    className={`refine-from-btn ${refineFrom === "generated" ? "active" : ""}`}
                    onClick={() => setRefineFrom("generated")}
                  >Last output</button>
                </div>
              </div>
              <textarea
                value={refineInstructions}
                onChange={e => setRefineInstructions(e.target.value)}
                placeholder="Special instructions ~ e.g. under 500 words, punchier, add subheadings..."
                rows={1}
                style={{width:"100%", background:"none", border:"none", borderBottom:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:"12px", padding:"6px 0", outline:"none", resize:"none", marginBottom:"8px"}}
              />
              <div className="input-wrap">
                <textarea
                  ref={textareaRef}
                  className="input-textarea"
                  value={input}
                  onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKey}
                  placeholder="What needs fixing? e.g. sharper opening, tighten the middle, stronger ending..."
                  rows={1}
                />
                <button
                  className="send-btn"
                  onClick={send}
                  disabled={!input.trim() || loading}
                >
                  Refine
                </button>
              </div>
              <button
                className="refine-reset-btn"
                onClick={() => { setMessages([]); setLastDraft(""); setInput(""); setRefineFrom("original"); }}
              >
                ↺ Start over with a new draft
              </button>
            </div>
          ) : (
          <div className="input-wrap">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              placeholder={MODES[mode].placeholder}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={send}
              disabled={!input.trim() || loading}
            >
              Send
            </button>
          </div>
          )}
          {error && <div className="error-msg">Something went wrong ~ {error}</div>}
          <div className="footer-note">
            {mode === "chat" && "Talking to a digital twin of Sooraj Ram ~ "}{" "}
            <a href="https://lifein20s.home.blog" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              blog
            </a>
            {" · "}
            <a href="https://medium.com/@nytt_liv" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              medium
            </a>
          </div>
        </div>
        )}
        {showHumorPopup && (
          <div className="humor-overlay" onClick={() => setShowHumorPopup(false)}>
            <div className="humor-card" onClick={e => e.stopPropagation()}>
              <p className="humor-card-title">
                Quick heads up ~ Sooraj has a habit of being funny.
              </p>
              <p className="humor-card-sub">
                Dry, observational, occasionally sarcastic. He's noticed not everyone appreciates that ~ some people come here for serious conversation, and that's completely fine too. So, honestly: do you want the humour?
              </p>
              <div className="humor-btns">
                <button className="humor-btn yes" onClick={() => { setHumorPref("yes"); setShowHumorPopup(false); }}>
                  Yes, bring it
                </button>
                <button className="humor-btn" onClick={() => { setHumorPref("no"); setShowHumorPopup(false); }}>
                  Keep it straight
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Format message ~ convert URLs to links, preserve line breaks
function formatMessage(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
