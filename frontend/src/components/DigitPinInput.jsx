import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function DigitPinInput({ length = 6, value = "", onChange, mask = false }) {
  const inputRefs = useRef([]);
  const [showPin, setShowPin] = useState(!mask);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (e, index) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    const next = digits.slice();
    if (rawVal.length > 1) {
      const pastedDigits = rawVal.slice(0, length);
      for (let i = 0; i < pastedDigits.length; i++) {
        if (index + i < length) {
          next[index + i] = pastedDigits[i];
        }
      }
      onChange(next.join(""));
      const focusTarget = Math.min(index + pastedDigits.length, length - 1);
      inputRefs.current[focusTarget]?.focus();
      return;
    }

    next[index] = rawVal[rawVal.length - 1];
    onChange(next.join(""));

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasteData) return;
    onChange(pasteData);
    const focusTarget = Math.min(pasteData.length, length - 1);
    inputRefs.current[focusTarget]?.focus();
  };

  return (
    <div className="digit-pin-wrapper">
      <div className={`digit-boxes-container digits-${length}`} onPaste={handlePaste}>
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type={mask && !showPin ? "password" : "text"}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`digit-box ${digit ? "filled" : ""}`}
            autoComplete="off"
          />
        ))}
      </div>

      {mask && (
        <button
          type="button"
          className="digit-visibility-toggle"
          onClick={() => setShowPin((prev) => !prev)}
          title={showPin ? "Hide PIN" : "Show PIN"}
          aria-label={showPin ? "Hide PIN" : "Show PIN"}
        >
          {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}