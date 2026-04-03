import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const MODES = {
  chat: {
    label: "Talk to Annet",
    placeholder: "Say something...",
    intro: "Another perspective. Ask me anything ~ or just talk."
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
    intro: null // rendered as a card, not a text intro
  }
};

const REFINE_PASSWORD = "parkwaydrive";
const PROFESSIONAL_PASSWORD = "iwanttointerviewthisperson";

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
  const [companyInput, setCompanyInput] = useState("");
  const [companySet, setCompanySet] = useState("");
  const [humorPref, setHumorPref] = useState(null); // null = not asked yet, "yes" | "no"
  const [showHumorPopup, setShowHumorPopup] = useState(false);
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
      setRefineUnlocked(true);
      setPasswordError(false);
      setPasswordInput("");
    } else if (mode === "professional" && val === PROFESSIONAL_PASSWORD) {
      setProfessionalUnlocked(true);
      setPasswordError(false);
      setPasswordInput("");
    } else {
      setPasswordError(true);
      setPasswordInput("");
      passwordRef.current?.focus();
    }
  };

  const handlePasswordKey = (e) => {
    if (e.key === "Enter") handlePasswordSubmit();
  };

  const handleCompanySubmit = () => {
    if (companyInput.trim()) {
      setCompanySet(companyInput.trim());
      setCompanyInput("");
    }
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
      // For refine mode, construct a special prompt
      const apiMessages = mode === "refine"
        ? [{ role: "user", content: `Rewrite this in Sooraj's voice. Keep the core idea. Strip the AI polish. Make it sound like him:\n\n${text}` }]
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
          justify-content: center;
          height: 100%;
          padding: 40px 0;
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

        .loading-dots {
          display: flex;
          gap: 4px;
        }

        .loading-dot {
          width: 4px;
          height: 4px;
          background: var(--accent-dim);
          border-radius: 50%;
          animation: pulse 1.2s ease-in-out infinite;
        }

        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
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
          justify-content: center;
          height: 100%;
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
            <span className="logo-tag">Another perspective</span>
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
          {(mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked) ? (
            <div className="password-gate">
              <p className="password-gate-title">
                {mode === "professional" ? "This one's for the right people." : "This one's just for Sooraj."}
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

                  <div className="pro-section">
                    <div className="pro-section-label">The headline</div>
                    <div className="pro-section-body">
                      In 2023, Sooraj conceived "Consumer Proxy" ~ a framework for AI-led whitespace finding in FMCG. Two years later, an independent startup built the same idea and raised <strong style={{color: "var(--accent)"}}>Rs 53 Crore</strong>. The idea came first.
                    </div>
                  </div>

                  <div className="pro-divider" />

                  <div className="pro-section">
                    <div className="pro-section-label">In short</div>
                    <div className="pro-section-body">
                      Engineer by training, marketer by practice. 5+ years turning consumer data into brand decisions ~ across FMCG, D2C, health & wellness. Built 24 data-led capabilities across organisations. Currently at Sweet Karam Coffee as an EIR for the CEO.
                    </div>
                  </div>

                  <div className="pro-section">
                    <div className="pro-section-label">Experience</div>
                    <div className="pro-section-body">
                      Sweet Karam Coffee · Plum · Traya · CavinKare · ZoomRx · Better Mortgage · ISRO (R&D Intern)
                    </div>
                  </div>

                  <div className="pro-section">
                    <div className="pro-section-label">Proficiencies</div>
                    <div className="pro-tags">
                      {["Consumer Insights", "Brand Strategy", "Data Literacy", "Behavioural Science", "Qual + Quant", "Category Management", "D2C & Ecom", "Market Entry", "Analytical Frameworks", "New Product Launch"].map(t => (
                        <span key={t} className="pro-tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  <div className="pro-section">
                    <div className="pro-section-label">Education</div>
                    <div className="pro-section-body">
                      B.Tech Mechanical Engineering · CGPA 9.39/10 · University topper · Academic excellence award 8 times
                    </div>
                  </div>

                  <div className="pro-divider" />

                  <div className="pro-section">
                    <div className="pro-section-label" style={{color: "var(--accent-dim)"}}>Optional ~ helps personalise the conversation</div>
                    <div className="pro-section-body" style={{marginBottom: "10px", fontSize: "12px", color: "var(--text-dim)"}}>
                      Which company are you from?
                    </div>
                    <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                      <input
                        type="text"
                        className="password-input"
                        style={{width: "220px", letterSpacing: "normal"}}
                        placeholder="e.g. Unilever, Mamaearth..."
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCompanySubmit()}
                      />
                      <button className="password-btn" onClick={handleCompanySubmit}>Set</button>
                    </div>
                    {companySet && <p style={{fontSize: "11px", color: "var(--accent-dim)", marginTop: "8px"}}>Got it ~ asking in context of {companySet}.</p>}
                  </div>

                  <p className="pro-ask-hint">Ask anything about his work, approach, or experience.</p>
                </div>
              ) : (
              <p className="empty-intro">{MODES[mode].intro}</p>
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
                    <div className="loading-dots">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        

        {/* Input */}
        {!((mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked)) && (
        <div className="input-area">
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
