import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../ui";

interface NicknameFieldProps {
  value: string;
  onChange: (name: string) => void;
}

const COMMIT_DEBOUNCE_MS = 500;

// Editable display name for any participant. Commits as you type (debounced) and immediately on blur / Enter,
// so the rename propagates without needing to explicitly leave the field.
export const NicknameField: React.FC<NicknameFieldProps> = ({ value, onChange }) => {
  const { t } = useTranslation("watchTogether");
  const [draft, setDraft] = useState(value);
  const committedRef = useRef(value); // last value we emitted / adopted, to avoid echo loops + typing overwrites
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Adopt an external value change (e.g. reset), but never clobber the user's in-progress typing.
  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value;
      setDraft(value);
    }
  }, [value]);

  // Debounced commit while typing.
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === committedRef.current) return;
    const id = setTimeout(() => {
      committedRef.current = trimmed;
      onChangeRef.current(trimmed);
    }, COMMIT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [draft]);

  const commitNow = () => {
    const trimmed = draft.trim();
    if (trimmed !== committedRef.current) {
      committedRef.current = trimmed;
      onChangeRef.current(trimmed);
    }
  };

  return (
    <label className="wt-nick">
      <span className="wt-nick__label">{t("nickname.label")}</span>
      <Input
        type="text"
        value={draft}
        maxLength={24}
        placeholder={t("nickname.placeholder")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitNow}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitNow();
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
};
