import { useState } from "react";

import type {
  ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

import {
  askLLM,
  initLLM,
  SYSTEM_PROMPT,
  type LLMUsage,
} from "./llm";

import "./App.css";

function App() {
  const [messages, setMessages] = useState<
    ChatCompletionMessageParam[]
  >([]);

  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);

  const [progress, setProgress] = useState(0);

  const [modelReady, setModelReady] = useState(false);

  const [usage, setUsage] =
    useState<LLMUsage | null>(null);

  async function handleLoadModel() {
    setLoading(true);

    try {
      await initLLM((progress) => {
        setProgress(progress);
      });

      setModelReady(true);
    } catch (error) {
      console.error(
        "Failed to initialize model:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();

    if (
      !trimmedQuestion ||
      !modelReady ||
      loading
    ) {
      return;
    }

    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: trimmedQuestion,
    };

    const conversation: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...messages,
      userMessage,
    ];

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuestion("");
    setLoading(true);

    let assistantAnswer = "";

    try {
      const result = await askLLM(
        conversation,
        (token) => {
          assistantAnswer += token;

          setMessages((current) => {
            const lastMessage =
              current[current.length - 1];

            if (
              lastMessage?.role ===
              "assistant"
            ) {
              return [
                ...current.slice(0, -1),
                {
                  role: "assistant",
                  content: assistantAnswer,
                },
              ];
            }

            return [
              ...current,
              {
                role: "assistant",
                content: assistantAnswer,
              },
            ];
          });
        }
      );

      setUsage(result);
    } catch (error) {
      console.error(
        "Failed to generate response:",
        error
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while generating the answer.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleAsk();
    }
  }

  const promptTokens =
    usage?.usage?.prompt_tokens ?? 0;

  const completionTokens =
    usage?.usage?.completion_tokens ?? 0;

  const totalTokens =
    usage?.usage?.total_tokens ?? 0;

  const extra = usage?.usage?.extra;

  return (
    <main className="chat">
      <header className="header">
        <div>
          <h1>Local LLM Chat</h1>

          <p>
            WebLLM + Web Worker + WebGPU
          </p>
        </div>

        <div
          className={`status ${
            modelReady ? "ready" : ""
          }`}
        >
          <span className="status-dot" />

          {modelReady
            ? "Model ready"
            : "Model not loaded"}
        </div>
      </header>

      <section className="controls">
        <button
          className="load-button"
          onClick={handleLoadModel}
          disabled={loading || modelReady}
        >
          {modelReady
            ? "Model ready"
            : loading
              ? `Loading ${Math.round(
                  progress * 100
                )}%`
              : "Load model"}
        </button>

        {loading && !modelReady && (
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div
                style={{
                  width: `${progress * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {usage && (
        <section className="stats">
          <div className="stats-title">
            Runtime stats
          </div>

          <div className="stats-grid">
            <div className="stat">
              <span>Prompt</span>

              <strong>
                {promptTokens}
              </strong>
            </div>

            <div className="stat">
              <span>Completion</span>

              <strong>
                {completionTokens}
              </strong>
            </div>

            <div className="stat">
              <span>Total</span>

              <strong>
                {totalTokens}
              </strong>
            </div>
          </div>

          {extra && (
            <div className="performance">
              <div className="stats-title">
                Performance
              </div>

              <div className="stats-grid">
                <div className="stat">
                  <span>
                    Time to first token
                  </span>

                  <strong>
                    {extra.time_to_first_token_s?.toFixed(
                      2
                    ) ?? "—"}{" "}
                    s
                  </strong>
                </div>

                <div className="stat">
                  <span>
                    Prefill speed
                  </span>

                  <strong>
                    {extra.prefill_tokens_per_s?.toFixed(
                      1
                    ) ?? "—"}{" "}
                    tok/s
                  </strong>
                </div>

                <div className="stat">
                  <span>
                    Generation speed
                  </span>

                  <strong>
                    {extra.decode_tokens_per_s?.toFixed(
                      1
                    ) ?? "—"}{" "}
                    tok/s
                  </strong>
                </div>

                <div className="stat">
                  <span>
                    End-to-end latency
                  </span>

                  <strong>
                    {extra.e2e_latency_s?.toFixed(
                      2
                    ) ?? "—"}{" "}
                    s
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="messages">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>Local AI</h2>

            <p>
              Load the model and ask a question.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser =
              message.role === "user";

            return (
              <article
                key={index}
                className={`message ${
                  isUser
                    ? "user"
                    : "assistant"
                }`}
              >
                <div className="message-role">
                  {isUser ? "You" : "AI"}
                </div>

                <div className="message-content">
                  {message.content?.toString()}
                </div>
              </article>
            );
          })
        )}

        {loading && modelReady && (
          <div className="typing">
            AI is thinking...
          </div>
        )}
      </section>

      <section className="input-area">
        <input
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            modelReady
              ? "Ask something..."
              : "Load the model first..."
          }
          disabled={
            !modelReady || loading
          }
        />

        <button
          className="send-button"
          onClick={handleAsk}
          disabled={
            !modelReady ||
            loading ||
            !question.trim()
          }
        >
          Send
        </button>
      </section>
    </main>
  );
}

export default App;