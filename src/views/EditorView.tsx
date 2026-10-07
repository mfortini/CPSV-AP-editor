import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Col,
  Container,
  Input,
  Row,
  TabNav,
  TabNavItem,
  TabNavLink,
} from "design-react-kit";
import { useStore } from "../app/store";
import { emptyTypedItem, locHasContent, pickLoc } from "../domain";
import { suggestOrgId } from "../domain/schedaSuggest";
import type { Draft, TypedItem, VocabEntry } from "../domain/types";
import { ConceptPicker } from "../vocabs/ConceptPicker";
import { LocalizedField } from "./LocalizedField";

const DURATION_KIND_VALUES = ["", "immediate", "hours", "days", "weeks", "months"] as const;

type EditorTab =
  | "identity"
  | "org"
  | "audience"
  | "inputs"
  | "outputs"
  | "timing"
  | "channels"
  | "classification"
  | "advanced";

const EDITOR_TABS: EditorTab[] = [
  "identity",
  "org",
  "audience",
  "inputs",
  "outputs",
  "timing",
  "channels",
  "classification",
  "advanced",
];

const fieldClass = "mb-4";

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <h2 className="form-section__title">{title}</h2>
      {hint ? <p className="form-section__hint">{hint}</p> : null}
      {children}
    </section>
  );
}

function SuggestStructure() {
  const { t } = useTranslation();
  const { suggestStructure, showToast } = useStore();
  return (
    <div className="mb-4">
      <Button
        color="primary"
        outline
        size="sm"
        onClick={() => {
          const { changed, fields } = suggestStructure();
          showToast(
            changed
              ? t("toast.suggestOk", {
                  fields: fields.map((field) => t(`toast.suggestField.${field}`)).join(", "),
                })
              : t("toast.suggestNone"),
          );
        }}
      >
        {t("actions.suggest")}
      </Button>
      <p className="form-section__hint mt-2 mb-0">{t("form.suggestHint")}</p>
    </div>
  );
}

function TypedListEditor({
  kind,
  items,
  typeEntries,
  onChange,
}: {
  kind: "inputs" | "outputs";
  items: TypedItem[];
  typeEntries: VocabEntry[];
  onChange: (items: TypedItem[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-column">
      {items.map((item, index) => (
        <div key={`${kind}-${index}`} className="typed-item-card">
          <p className="typed-item-card__index">
            {kind === "inputs" ? t("form.inputs") : t("form.outputs")} #{index + 1}
          </p>
          <LocalizedField
            id={`${kind}-text-${index}`}
            label={t("form.textOptional")}
            multiline
            rows={2}
            value={item.text}
            onChange={(text) => {
              const next = [...items];
              next[index] = { ...item, text };
              onChange(next);
            }}
          />
          <ConceptPicker
            id={`${kind}-type-${index}`}
            label={t("form.type")}
            hint={t("form.typeHint")}
            vocabName={t("vocabs.inputOutput")}
            entries={typeEntries}
            value={item.typeId ? [item.typeId] : []}
            multiple={false}
            onChange={(ids) => {
              const next = [...items];
              next[index] = { ...item, typeId: ids[0] || "" };
              onChange(next);
            }}
          />
          <Button
            color="danger"
            outline
            size="sm"
            className="mb-3"
            onClick={() => {
              const next = items.filter((_, i) => i !== index);
              onChange(next.length ? next : [emptyTypedItem() as TypedItem]);
            }}
          >
            {t("actions.remove")}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function EditorView() {
  const { t } = useTranslation();
  const { draft, setDraft, vocabs, errors } = useStore();
  const [tab, setTab] = useState<EditorTab>("identity");

  function patch(partial: Partial<Draft>) {
    setDraft({ ...draft, ...partial });
  }

  if (!vocabs) {
    return (
      <Container className="py-4">
        <p className="text-secondary">…</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {errors.length > 0 && (
        <Alert color="danger" className="alert-banner">
          <ul className="mb-0 ps-3">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="editor-tabs mb-4">
        <TabNav>
          {EDITOR_TABS.map((item) => (
            <TabNavItem key={item}>
              <TabNavLink
                active={tab === item}
                href={`#editor=${item}`}
                onClick={(event) => {
                  event.preventDefault();
                  setTab(item);
                }}
              >
                {t(`editorTab.${item}`)}
              </TabNavLink>
            </TabNavItem>
          ))}
        </TabNav>
      </div>

      {tab === "identity" && (
        <FormSection title={t("form.identity")} hint={t("editorTab.identityHint")}>
          <Input
            id="serviceId"
            label={t("form.serviceId")}
            value={draft.serviceId}
            wrapperClassName={fieldClass}
            onChange={(e) => patch({ serviceId: e.target.value })}
          />
          <LocalizedField
            id="title"
            label={t("form.title")}
            value={draft.title}
            required
            invalid={!locHasContent(draft.title)}
            validationText={
              locHasContent(draft.title)
                ? undefined
                : errors.find((e) => /titolo/i.test(e))
            }
            onChange={(title) => patch({ title })}
          />
          <LocalizedField
            id="abstract"
            label={t("form.abstract")}
            multiline
            rows={2}
            value={draft.abstract}
            onChange={(abstract) => patch({ abstract })}
          />
          <LocalizedField
            id="description"
            label={t("form.description")}
            multiline
            rows={8}
            value={draft.description}
            onChange={(description) => patch({ description })}
          />
        </FormSection>
      )}

      {tab === "org" && (
        <FormSection title={t("form.org")} hint={t("editorTab.orgHint")}>
          <Input
            id="orgId"
            label={t("form.orgId")}
            value={draft.orgId}
            infoText={t("form.orgIdHint")}
            wrapperClassName={fieldClass}
            onChange={(e) => patch({ orgId: e.target.value })}
            onBlur={() => {
              const suggested = suggestOrgId(
                draft.orgId,
                pickLoc(draft.orgName),
                draft.orgHomepage,
              );
              if (suggested) patch({ orgId: suggested });
            }}
          />
          <LocalizedField
            id="orgName"
            label={t("form.orgName")}
            value={draft.orgName}
            onChange={(orgName) => patch({ orgName })}
          />
          <Input
            id="orgHomepage"
            type="url"
            label={t("form.orgHomepage")}
            value={draft.orgHomepage}
            wrapperClassName={fieldClass}
            onChange={(e) => patch({ orgHomepage: e.target.value })}
          />
        </FormSection>
      )}

      {tab === "audience" && (
        <FormSection title={t("form.audience")} hint={t("editorTab.audienceHint")}>
          <LocalizedField
            id="audience"
            label={t("form.audience")}
            multiline
            rows={4}
            value={draft.audience}
            onChange={(audience) => patch({ audience })}
          />
        </FormSection>
      )}

      {tab === "inputs" && (
        <FormSection title={t("form.inputs")} hint={t("editorTab.inputsHint")}>
          <SuggestStructure />
          <TypedListEditor
            kind="inputs"
            items={draft.inputs}
            typeEntries={vocabs.inputTypes}
            onChange={(inputs) => patch({ inputs })}
          />
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() =>
              patch({ inputs: [...draft.inputs, emptyTypedItem() as TypedItem] })
            }
          >
            {t("actions.addInput")}
          </Button>
        </FormSection>
      )}

      {tab === "outputs" && (
        <FormSection title={t("form.outputs")} hint={t("editorTab.outputsHint")}>
          <SuggestStructure />
          <TypedListEditor
            kind="outputs"
            items={draft.outputs}
            typeEntries={vocabs.outputTypes}
            onChange={(outputs) => patch({ outputs })}
          />
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() =>
              patch({ outputs: [...draft.outputs, emptyTypedItem() as TypedItem] })
            }
          >
            {t("actions.addOutput")}
          </Button>
        </FormSection>
      )}

      {tab === "timing" && (
        <FormSection title={t("editorTab.timing")} hint={t("editorTab.timingHint")}>
          <SuggestStructure />
          <LocalizedField
            id="processingTime"
            label={t("form.processingText")}
            value={draft.processingTime?.text || { it: "", en: "" }}
            onChange={(text) =>
              patch({
                processingTime: { ...draft.processingTime, text },
              })
            }
          />
          <div className="form-select-field">
            <label className="form-static-label" htmlFor="durationKind">
              {t("form.duration")}
            </label>
            <select
              id="durationKind"
              className="form-select"
              value={draft.processingTime?.kind || ""}
              onChange={(e) =>
                patch({
                  processingTime: { ...draft.processingTime, kind: e.target.value },
                })
              }
            >
              {DURATION_KIND_VALUES.map((value) => (
                <option key={value || "empty"} value={value}>
                  {t(value ? `duration.${value}` : "duration.none")}
                </option>
              ))}
            </select>
          </div>
          {draft.processingTime?.kind &&
            draft.processingTime.kind !== "immediate" && (
              <Input
                id="durationAmount"
                type="number"
                label={t("duration.amount")}
                value={String(draft.processingTime.amount ?? "")}
                wrapperClassName={fieldClass}
                onChange={(e) =>
                  patch({
                    processingTime: {
                      ...draft.processingTime,
                      amount: e.target.value,
                    },
                  })
                }
              />
            )}
          <hr className="my-4" />
          <LocalizedField
            id="cost"
            label={t("form.costText")}
            value={draft.cost?.text || { it: "", en: "" }}
            onChange={(text) => patch({ cost: { ...draft.cost, text } })}
          />
          <Row className="g-3">
            <Col md={6}>
              <Input
                id="costAmount"
                type="number"
                label={t("form.costAmount")}
                value={
                  draft.cost?.amount === 0 || draft.cost?.amount
                    ? String(draft.cost.amount)
                    : ""
                }
                wrapperClassName={fieldClass}
                onChange={(e) =>
                  patch({ cost: { ...draft.cost, amount: e.target.value } })
                }
              />
            </Col>
            <Col md={6}>
              <Input
                id="costCurrency"
                label={t("form.costCurrency")}
                value={draft.cost?.currency || "EUR"}
                wrapperClassName={fieldClass}
                onChange={(e) =>
                  patch({ cost: { ...draft.cost, currency: e.target.value } })
                }
              />
            </Col>
          </Row>
        </FormSection>
      )}

      {tab === "channels" && (
        <FormSection title={t("form.channels")} hint={t("editorTab.channelsHint")}>
          <Input
            id="pageUrl"
            type="url"
            label={t("form.pageUrl")}
            value={draft.pageUrl}
            wrapperClassName={fieldClass}
            onChange={(e) => patch({ pageUrl: e.target.value })}
          />
          <p className="form-static-label">{t("form.onlineUrls")}</p>
          {draft.onlineUrls.map((url, index) => (
            <div key={`url-${index}`} className="url-row">
              <Input
                id={`online-${index}`}
                type="url"
                label={`URL ${index + 1}`}
                value={url}
                wrapperClassName="mb-0"
                onChange={(e) => {
                  const onlineUrls = [...draft.onlineUrls];
                  onlineUrls[index] = e.target.value;
                  patch({ onlineUrls });
                }}
              />
              <Button
                color="danger"
                outline
                size="sm"
                className="mb-3"
                onClick={() => {
                  const onlineUrls = draft.onlineUrls.filter((_, i) => i !== index);
                  patch({ onlineUrls: onlineUrls.length ? onlineUrls : [""] });
                }}
              >
                {t("actions.remove")}
              </Button>
            </div>
          ))}
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() => patch({ onlineUrls: [...draft.onlineUrls, ""] })}
          >
            {t("actions.addUrl")}
          </Button>
        </FormSection>
      )}

      {tab === "classification" && (
        <FormSection
          title={t("form.classification")}
          hint={t("editorTab.classificationHint")}
        >
          <ConceptPicker
            id="lifeEvents"
            label={t("form.lifeEvents")}
            hint={t("form.lifeEventsHint")}
            vocabName={t("vocabs.lifeEvents")}
            entries={vocabs.lifeEvents}
            value={draft.lifeEvents}
            onChange={(lifeEvents) => patch({ lifeEvents })}
          />
          <ConceptPicker
            id="themes"
            label={t("form.themes")}
            hint={t("form.themesHint")}
            vocabName={t("vocabs.themes")}
            entries={vocabs.themes}
            value={draft.themes}
            onChange={(themes) => patch({ themes })}
          />
        </FormSection>
      )}

      {tab === "advanced" && (
        <FormSection title={t("form.advanced")} hint={t("editorTab.advancedHint")}>
          <Input
            id="ioServiceId"
            label={t("form.ioServiceId")}
            value={draft.ioServiceId}
            wrapperClassName={fieldClass}
            onChange={(e) => patch({ ioServiceId: e.target.value })}
          />
          <LocalizedField
            id="howTo"
            label={t("form.howTo")}
            multiline
            rows={5}
            value={draft.howTo}
            onChange={(howTo) => patch({ howTo })}
          />
        </FormSection>
      )}
    </Container>
  );
}
