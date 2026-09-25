import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import "./VitalAIAssistant.css";

export default function VitalAIAssistant({
  user,
  context = "general",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const feedRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: `Hello ${
        user?.name || "there"
      }! I am VitalAI. How can I assist you with your ${context} operations today?`,
    },
  ]);

  /*
   * Automatically scroll to show the newest message.
   */
  useEffect(() => {
    if (!isOpen) return;

    const feed = feedRef.current;
    if (feed) {
      feed.scrollTo({
        top: feed.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isThinking, isOpen]);

  const unavailableReply = "• I cannot answer that reliably right now. Please try again shortly.";

  const handleSend = async (event) => {
    event.preventDefault();

    const userText = input.trim();
    if (!userText || isThinking) {
      return;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      sender: "user",
      text: userText,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const token = localStorage.getItem("vital_token");
      const response = await fetch("http://localhost:5000/api/ai/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: userText,
          context,
          district: user?.district || "Kamareddy",
          history: messages.slice(-6).filter((item) => item.id !== 1).map((item) => ({
            role: item.sender === "bot" ? "assistant" : "user",
            text: item.text,
          })),
        }),
      });

      if (!response.ok) throw new Error(`Assistant request failed: ${response.status}`);
      const data = await response.json();

      const assistantMessage = {
        id: `${Date.now()}-bot`,
        sender: "bot",
        text:
          data.success && typeof data.response === "string" && data.response.trim()
            ? data.response.trim()
            : unavailableReply,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (err) {
      console.warn("VitalAI request failed:", err.message);
      const assistantMessage = {
        id: `${Date.now()}-bot`,
        sender: "bot",
        text: unavailableReply,
      };
      setMessages((previous) => [...previous, assistantMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <div
      className="vital-ai-dock"
      onKeyDown={handleKeyDown}
    >
      {!isOpen && (
        <button
          type="button"
          className="vital-ai-floating-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open VitalAI Assistant"
          aria-expanded="false"
        >
          <span className="sparkle-ping" />

          <span className="vital-ai-trigger-icon">
            <Bot size={20} />
          </span>

          <span>VitalAI</span>
        </button>
      )}

      {isOpen && (
        <section
          className="vital-ai-card"
          aria-label="VitalAI Assistant"
        >
          <header className="vital-ai-header">
            <div className="ai-title-group">
              <span className="ai-badge-dot">
                <Sparkles size={15} />
              </span>

              <div>
                <strong>VitalAI Assistant</strong>
                <small>
                  Live network intelligence
                  <i />
                  {context}
                </small>
              </div>
            </div>

            <button
              type="button"
              className="ai-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close VitalAI Assistant"
            >
              <X size={17} />
            </button>
          </header>

          <div className="vital-ai-context">
            <span>
              <i />
              Network online
            </span>

            <small>Secure assistant session</small>
          </div>

          <div
            className="vital-ai-feed"
            ref={feedRef}
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`vital-msg ${
                  message.sender === "user" ? "msg-user" : "msg-bot"
                }`}
              >
                {message.sender === "bot" && (
                  <span className="msg-avatar">
                    <Bot size={13} />
                  </span>
                )}

                <div>
                  <p>{message.text}</p>
                  <small>{message.sender === "bot" ? "VitalAI" : "You"}</small>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="vital-msg msg-bot">
                <span className="msg-avatar">
                  <Bot size={13} />
                </span>

                <div className="ai-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="vital-ai-suggestions">
            {[
              "Check blood stock",
              "Donor eligibility",
              "Urgent requests",
            ].map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="vital-ai-input-bar"
            onSubmit={handleSend}
          >
            <input
              type="text"
              placeholder="Ask VitalAI anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Message VitalAI"
              autoComplete="off"
            />

            <button
              type="submit"
              aria-label="Send query"
              disabled={!input.trim() || isThinking}
            >
              <Send size={16} />
            </button>
          </form>

          <footer className="vital-ai-footer">
            <Bot size={12} />
            VitalAI can make mistakes. Confirm important medical information.
          </footer>
        </section>
      )}
    </div>
  );
}

