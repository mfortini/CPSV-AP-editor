import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Chip, ChipLabel } from "design-react-kit";
import { useStore } from "../app/store";
import { locHasContent, pickLoc } from "../domain";
import {
  composeDuration,
  formatDurationLabel,
} from "../domain/schedaModel";
import type { AppLang, Cost, ProcessingTime, TypedItem } from "../domain/types";
import { findVocabLabel } from "../vocabs/load";

function stripHtml(value: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = value || "";
  return tmp.textContent || tmp.innerText || "";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="preview-card__section">
      <h3 className="preview-card__section-title">{title}</h3>
      {children}
    </section>
  );
}

function formatProcessing(
  pt: ProcessingTime,
  lang: AppLang,
  t: (key: string) => string,
): string {
  const kind = String(pt?.kind || "").trim();
  const amount = pt?.amount;
  const duration =
    composeDuration(kind, amount) || String(pt?.duration || "").trim();
  const structured = duration
    ? kind === "immediate"
      ? t("duration.immediate")
      : formatDurationLabel(duration) || duration
    : "";
  const text = pickLoc(pt?.text, lang);
  if (structured && text && text !== structured) return `${structured} — ${text}`;
  return structured || text;
}

function formatCost(cost: Cost, lang: AppLang, t: (key: string) => string): string {
  const text = pickLoc(cost?.text, lang);
  const currency = String(cost?.currency || "EUR").trim() || "EUR";
  const hasAmount =
    cost?.amount === 0 ||
    (cost?.amount !== "" && cost?.amount != null && !Number.isNaN(Number(cost.amount)));
  if (!hasAmount) return text;
  const amountLabel =
    Number(cost.amount) === 0
      ? t("preview.costFree")
      : `${cost.amount} ${currency}`;
  if (text && text.toLocaleLowerCase("it") !== amountLabel.toLocaleLowerCase("it")) {
    return `${amountLabel} — ${text}`;
  }
  return amountLabel;
}

function TypedList({
  items,
  typeEntries,
  conceptEntries,
  lang,
  t,
}: {
  items: TypedItem[];
  typeEntries: Parameters<typeof findVocabLabel>[0];
  conceptEntries: Parameters<typeof findVocabLabel>[0];
  lang: AppLang;
  t: (key: string) => string;
}) {
  const rows = (items || []).filter(
    (item) => locHasContent(item.text) || item.typeId || item.conceptId,
  );
  if (!rows.length) return null;
  return (
    <ul className="preview-card__list">
      {rows.map((item, index) => {
        const text = pickLoc(item.text, lang);
        const typeLabel = item.typeId
          ? findVocabLabel(typeEntries, item.typeId, lang)
          : "";
        const conceptLabel = item.conceptId
          ? findVocabLabel(conceptEntries, item.conceptId, lang)
          : "";
        return (
          <li key={`${text}-${index}`}>
            {text ? <div className="preview-card__item-text">{text}</div> : null}
            {typeLabel ? (
              <p className="preview-card__item-meta">
                <strong>{t("form.type")}:</strong>{" "}
                <a href={item.typeId} target="_blank" rel="noopener noreferrer">
                  {typeLabel}
                </a>
              </p>
            ) : null}
            {conceptLabel ? (
              <p className="preview-card__item-meta">
                <strong>{t("form.concept")}:</strong>{" "}
                <a href={item.conceptId} target="_blank" rel="noopener noreferrer">
                  {conceptLabel}
                </a>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SheetPreview() {
  const { t } = useTranslation();
  const { draft, vocabs, lang } = useStore();
  const title = pickLoc(draft.title, lang);
  const orgName = pickLoc(draft.orgName, lang);
  const orgLine = orgName || draft.orgId || t("preview.noOrg");
  const description = pickLoc(draft.description, lang);
  const body = description ? stripHtml(description) : t("preview.noDescription");
  const abstractText = pickLoc(draft.abstract, lang);
  const audience = pickLoc(draft.audience, lang);
  const howTo = pickLoc(draft.howTo, lang);
  const ctaHref = draft.pageUrl || draft.serviceId || "#";
  const pills = [
    ...(draft.lifeEvents || []).map((id) => ({
      id,
      label: findVocabLabel(vocabs?.lifeEvents, id, lang),
    })),
    ...(draft.themes || []).map((id) => ({
      id,
      label: findVocabLabel(vocabs?.themes, id, lang),
    })),
  ];

  const processingLabel = formatProcessing(draft.processingTime, lang, t);
  const costLabel = formatCost(draft.cost, lang, t);
  const hasInputs = (draft.inputs || []).some(
    (item) => locHasContent(item.text) || item.typeId || item.conceptId,
  );
  const hasOutputs = (draft.outputs || []).some(
    (item) => locHasContent(item.text) || item.typeId || item.conceptId,
  );
  const onlineUrls = (draft.onlineUrls || []).filter(Boolean);
  const hasChannels = Boolean(draft.pageUrl || onlineUrls.length);
  const orgIsUrl = /^https?:\/\//i.test(draft.orgId || "");

  return (
    <article className="preview-card">
      <p className="preview-card__meta">
        {orgIsUrl && !orgName ? (
          <a href={draft.orgId} target="_blank" rel="noopener noreferrer">
            {orgLine}
          </a>
        ) : (
          orgLine
        )}
        {orgName && orgIsUrl ? (
          <>
            {" · "}
            <a href={draft.orgId} target="_blank" rel="noopener noreferrer">
              {t("preview.orgId")}
            </a>
          </>
        ) : null}
      </p>
      <h2 className="preview-card__title">{title || "—"}</h2>
      {pills.length > 0 && (
        <div className="preview-card__pills">
          {pills.map((pill) => (
            <Chip key={pill.id} color="primary">
              <ChipLabel>
                <a href={pill.id} target="_blank" rel="noopener noreferrer">
                  {pill.label}
                </a>
              </ChipLabel>
            </Chip>
          ))}
        </div>
      )}
      {abstractText ? <p className="preview-card__abstract">{abstractText}</p> : null}
      <p className="preview-card__body">{body}</p>

      {audience ? (
        <Section title={t("preview.audience")}>
          <p className="preview-card__prose">{audience}</p>
        </Section>
      ) : null}

      {hasInputs ? (
        <Section title={t("preview.inputs")}>
          <TypedList
            items={draft.inputs}
            typeEntries={vocabs?.inputTypes}
            conceptEntries={vocabs?.concepts}
            lang={lang}
            t={t}
          />
        </Section>
      ) : null}

      {processingLabel ? (
        <Section title={t("preview.duration")}>
          <p className="preview-card__prose">{processingLabel}</p>
        </Section>
      ) : null}

      {costLabel ? (
        <Section title={t("preview.cost")}>
          <p className="preview-card__prose">{costLabel}</p>
        </Section>
      ) : null}

      {hasOutputs ? (
        <Section title={t("preview.outputs")}>
          <TypedList
            items={draft.outputs}
            typeEntries={vocabs?.outputTypes}
            conceptEntries={vocabs?.concepts}
            lang={lang}
            t={t}
          />
        </Section>
      ) : null}

      {hasChannels ? (
        <Section title={t("preview.channels")}>
          <ul className="preview-card__list">
            {draft.pageUrl ? (
              <li>
                <a href={draft.pageUrl} target="_blank" rel="noopener noreferrer">
                  {draft.pageUrl}
                </a>
              </li>
            ) : null}
            {onlineUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {howTo ? (
        <Section title={t("preview.howTo")}>
          <p className="preview-card__prose">{howTo}</p>
        </Section>
      ) : null}

      {draft.ioServiceId ? (
        <Section title={t("preview.ioService")}>
          <p className="preview-card__prose">
            <code>{draft.ioServiceId}</code>
          </p>
        </Section>
      ) : null}

      <a className="btn btn-primary" href={ctaHref} target="_blank" rel="noopener noreferrer">
        {t("preview.cta")}
      </a>
    </article>
  );
}
