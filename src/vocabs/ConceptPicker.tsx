import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "design-react-kit";
import { useStore } from "../app/store";
import type { VocabEntry } from "../domain/types";
import { vocabLabel } from "./load";

type Props = {
  id: string;
  label: string;
  hint?: string;
  sourceNote?: string;
  vocabName?: string;
  entries: VocabEntry[];
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
};

function OpenConceptLink({ href }: { href: string }) {
  const { t } = useTranslation();
  if (!/^https?:\/\//i.test(href)) return null;
  return (
    <a
      className="concept-picker__open"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon icon="it-external-link" size="sm" color="primary" />
      <span>{t("vocabs.openLink")}</span>
    </a>
  );
}

export function ConceptPicker({
  id,
  label,
  hint,
  sourceNote,
  vocabName,
  entries,
  value,
  onChange,
  multiple = true,
}: Props) {
  const { t } = useTranslation();
  const { lang } = useStore();
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        vocabLabel(a, lang).localeCompare(vocabLabel(b, lang), lang),
      ),
    [entries, lang],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(lang);
    if (!q) return sorted;
    return sorted.filter((entry) => {
      const primary = vocabLabel(entry, lang).toLocaleLowerCase(lang);
      const secondary = vocabLabel(
        entry,
        lang === "it" ? "en" : "it",
      ).toLocaleLowerCase(lang);
      return (
        primary.includes(q) ||
        secondary.includes(q) ||
        entry.id.toLocaleLowerCase(lang).includes(q)
      );
    });
  }, [sorted, lang, query]);

  const singleValue = value[0] || "";
  const selectedEntries = sorted.filter((entry) => value.includes(entry.id));

  if (!entries.length) {
    return (
      <div className="concept-picker concept-picker--empty">
        <h3 className="concept-picker__heading">{label}</h3>
        <p className="concept-picker__hint mb-0">{t("vocabs.empty")}</p>
      </div>
    );
  }

  // Scelta singola: solo menu a tendina + link alla scheda
  if (!multiple) {
    return (
      <div className="concept-picker">
        <div className="concept-picker__header">
          <h3 className="concept-picker__heading">{label}</h3>
          {vocabName ? (
            <span className="concept-picker__badge">
              {t("vocabs.controlled")}: {vocabName}
            </span>
          ) : null}
        </div>
        {hint ? <p className="concept-picker__hint">{hint}</p> : null}
        {sourceNote ? (
          <p className="concept-picker__source" role="status">
            {sourceNote}
          </p>
        ) : null}
        <p className="concept-picker__meta">
          {t("vocabs.availableCount", { count: sorted.length })}
        </p>
        <label className="visually-hidden" htmlFor={`${id}-select`}>
          {label}
        </label>
        <select
          id={`${id}-select`}
          className="form-select"
          value={singleValue}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next ? [next] : []);
          }}
        >
          <option value="">{t("vocabs.choosePlaceholder")}</option>
          {sorted.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {vocabLabel(entry, lang)}
            </option>
          ))}
        </select>
        {singleValue ? (
          <div className="concept-picker__footer">
            <code className="concept-picker__uri">{singleValue}</code>
            <OpenConceptLink href={singleValue} />
          </div>
        ) : null}
      </div>
    );
  }

  // Scelta multipla: cerca + elenco con checkbox, link su ogni riga
  return (
    <div className="concept-picker">
      <div className="concept-picker__header">
        <h3 className="concept-picker__heading">{label}</h3>
        {vocabName ? (
          <span className="concept-picker__badge">
            {t("vocabs.controlled")}: {vocabName}
          </span>
        ) : null}
      </div>
      {hint ? <p className="concept-picker__hint">{hint}</p> : null}
      {sourceNote ? (
        <p className="concept-picker__source" role="status">
          {sourceNote}
        </p>
      ) : null}
      <p className="concept-picker__meta">
        {t("vocabs.availableCount", { count: sorted.length })}
        {selectedEntries.length
          ? ` · ${t("vocabs.selectedCount", { count: selectedEntries.length })}`
          : ""}
      </p>

      {sorted.length > 8 ? (
        <div className="mb-3">
          <label className="form-static-label" htmlFor={`${id}-search`}>
            {t("vocabs.search")}
          </label>
          <input
            id={`${id}-search`}
            type="search"
            className="form-control localized-field__native"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <ul className="concept-picker__checklist" role="listbox" aria-multiselectable>
        {filtered.map((entry) => {
          const active = value.includes(entry.id);
          const text = vocabLabel(entry, lang);
          return (
            <li key={entry.id} className="concept-picker__check-row">
              <label className="concept-picker__check-label">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => {
                    if (active) {
                      onChange(value.filter((idValue) => idValue !== entry.id));
                    } else {
                      onChange([...value, entry.id]);
                    }
                  }}
                />
                <span>{text}</span>
              </label>
              <OpenConceptLink href={entry.id} />
            </li>
          );
        })}
        {!filtered.length ? (
          <li className="text-secondary py-2">{t("vocabs.noResults")}</li>
        ) : null}
      </ul>
    </div>
  );
}
