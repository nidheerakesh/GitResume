import { X } from 'lucide-react';
import type { ChatMessage } from '../types';

interface CareerChatProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  onSend: () => void;
}

export function CareerChat({ open, setOpen, messages, input, setInput, isSending, onSend }: CareerChatProps) {
  const canSend = input.trim() !== '' && !isSending;

  return (
    <div className="chat no-print">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-identity">
              <span className="chat-name">Career coach</span>
              <span className="chat-status">
                <span className="dot" />
                Reads the resume open in the editor
              </span>
            </div>
            <button type="button" className="btn-icon btn-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                {msg.content}
              </div>
            ))}
            {isSending && <div className="chat-bubble is-assistant is-thinking">Thinking...</div>}
          </div>

          <div className="chat-input-bar">
            <input
              type="text"
              aria-label="Ask the career coach"
              placeholder="Ask why a skill was added…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={onSend} disabled={!canSend}>
              Send
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close career coach' : 'Open career coach'}
      >
        {open ? 'Close' : 'Ask the coach'}
      </button>
    </div>
  );
}
