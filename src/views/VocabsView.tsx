import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Icon,
  Input,
  TabNav,
  TabNavItem,
  TabNavLink,
} from "design-react-kit";
import { useStore } from "../app/store";
import type { VocabEntry } from "../domain/types";
import { vocabLabel } from "../vocabs/load";

type VocabKey = "lifeEvents" | "themes" | "inputTypes" | "outputTypes";

const VOCAB_KEYS: VocabKey[] = [
  "lifeEvents",
  "themes",
  "inputTypes",
  "outputTypes",
];

export function VocabsView() {
  const { t } = useTranslation();
  const { vocabs, lang } = useStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<VocabKey>("lifeEvents");

  const entries = useMemo(() => {
    if (!vocabs) return [] as VocabEntry[];
    return vocabs[tab] || [];
  }, [vocabs, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(lang);
    if (!q) return entries;
    return entries.filter((entry) => {
      const it = vocabLabel(entry, "it").toLocaleLowerCase("it");
      const en = vocabLabel(entry, "en").toLocaleLowerCase("en");
      return (
        it.includes(q) ||
        en.includes(q) ||
        entry.id.toLocaleLowerCase(lang).includes(q)
      );
    });
  }, [entries, lang, query]);

  if (!vocabs) return <p className="p-4">…</p>;

  return (
    <Container className="py-4">
      <h2 className="h3">{t("vocabs.heading")}</h2>
      <p className="text-secondary">{t("vocabs.hint")}</p>

      <div className="vocab-panel mb-4">
        <p className="vocab-panel__badge">{t("vocabs.controlled")}</p>
        <p className="mb-0">{t("vocabs.panelIntro")}</p>
      </div>

      <div className="editor-tabs mb-4">
        <TabNav>
          {VOCAB_KEYS.map((key) => (
            <TabNavItem key={key}>
              <TabNavLink
                active={tab === key}
                href={`#vocab=${key}`}
                onClick={(event) => {
                  event.preventDefault();
                  setTab(key);
                }}
              >
                {t(`vocabs.${key}`)}
                <span className="vocab-tab-count">
                  {" "}
                  ({vocabs[key]?.length || 0})
                </span>
              </TabNavLink>
            </TabNavItem>
          ))}
        </TabNav>
      </div>

      <section className="form-section">
        <h3 className="form-section__title">{t(`vocabs.${tab}`)}</h3>
        <p className="form-section__hint">{t(`vocabs.${tab}Hint`)}</p>
        <Input
          id="vocab-search"
          type="search"
          label={t("vocabs.search")}
          value={query}
          wrapperClassName="mb-4"
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="concept-picker__meta mb-3">
          {t("vocabs.showing", {
            shown: filtered.length,
            total: entries.length,
          })}
        </p>
        <ul className="vocab-entry-list">
          {filtered.map((entry) => {
            const primary = vocabLabel(entry, lang);
            const secondary = vocabLabel(entry, lang === "it" ? "en" : "it");
            return (
              <li key={entry.id} className="vocab-entry">
                <div className="vocab-entry__body">
                  <strong className="vocab-entry__title">{primary}</strong>
                  {secondary && secondary !== primary ? (
                    <p className="vocab-entry__alt">{secondary}</p>
                  ) : null}
                  <code className="vocab-entry__id">{entry.id}</code>
                </div>
                <a
                  className="vocab-entry__link"
                  href={entry.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon="it-external-link" size="sm" color="primary" />
                  <span>{t("vocabs.openLink")}</span>
                </a>
              </li>
            );
          })}
          {!filtered.length ? (
            <li className="text-secondary">{t("vocabs.noResults")}</li>
          ) : null}
        </ul>
      </section>
    </Container>
  );
}
