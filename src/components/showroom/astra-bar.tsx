"use client";
import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import type { AstraExchange } from "./use-showroom";

/**
 * GPZytro's entry point. Today commands are resolved by a rule-based parser against the approved catalog;
 * a conversational model can replace the parser without changing this surface or the configuration flow.
 */
export function AstraBar({ exchanges, disabled, onAsk, onChoose }: {
  exchanges: AstraExchange[]; disabled: boolean; onAsk: (text: string) => void; onChoose: (assetId: string) => void;
}) {
  const [text, setText] = useState("");
  const last = exchanges.at(-1);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onAsk(text); setText("");
  }
  return (
    <div className="astra">
      {last && (
        <div className="astra-reply" role="status" key={last.id}>
          <span className="astra-quote">“{last.request}”</span>
          {last.results.map((result, i) => (
            <p key={i} className={"astra-line astra-" + result.kind}>
              {result.message}
              {result.kind === "clarify" && result.options.length > 0 && (
                <span className="astra-options">
                  {result.options.map(option => <button key={option.assetId} onClick={() => onChoose(option.assetId)}>{option.label}</button>)}
                </span>
              )}
            </p>
          ))}
        </div>
      )}
      <form className="astra-form" onSubmit={submit}>
        
        <label className="sr-only" htmlFor="astra-input">Ask GPZytro</label>
        <input id="astra-input" value={text} onChange={e => setText(e.target.value)} disabled={disabled} autoComplete="off"
          placeholder={disabled ? "GPZytro needs approved assets in this room" : "Ask GPZytro — “use the sofa from Set 2”"} />
        <span className="astra-note">Command preview · no AI</span>
        <button type="submit" disabled={disabled || !text.trim()} aria-label="Send to GPZytro"><ArrowUp size={15} strokeWidth={1.8} /></button>
      </form>
    </div>
  );
}
