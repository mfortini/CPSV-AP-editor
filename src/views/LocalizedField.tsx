import { useTranslation } from "react-i18next";
import { Col, Row } from "design-react-kit";
import type { LocalizedString } from "../domain/types";

type Props = {
  id: string;
  label: string;
  value: LocalizedString;
  onChange: (value: LocalizedString) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  invalid?: boolean;
  validationText?: string;
  infoText?: string;
};

function LangInput({
  id,
  langCode,
  langName,
  value,
  onChange,
  multiline,
  rows,
  invalid,
  validationText,
  fieldLabel,
}: {
  id: string;
  langCode: "IT" | "EN";
  langName: string;
  value: string;
  onChange: (value: string) => void;
  multiline: boolean;
  rows: number;
  invalid?: boolean;
  validationText?: string;
  fieldLabel: string;
}) {
  const controlId = id;
  const describedBy = invalid && validationText ? `${controlId}-error` : undefined;

  return (
    <div className="localized-field__slot">
      <label className="localized-field__badge" htmlFor={controlId}>
        {langCode}
        <span className="visually-hidden"> — {langName}</span>
      </label>
      {multiline ? (
        <textarea
          id={controlId}
          className={`form-control localized-field__native${invalid ? " is-invalid" : ""}`}
          rows={rows}
          value={value}
          aria-label={`${fieldLabel} (${langName})`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={controlId}
          type="text"
          className={`form-control localized-field__native${invalid ? " is-invalid" : ""}`}
          value={value}
          aria-label={`${fieldLabel} (${langName})`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {invalid && validationText ? (
        <div id={describedBy} className="invalid-feedback d-block">
          {validationText}
        </div>
      ) : null}
    </div>
  );
}

export function LocalizedField({
  id,
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  required = false,
  invalid = false,
  validationText,
  infoText,
}: Props) {
  const { t } = useTranslation();
  const loc = value || { it: "", en: "" };

  return (
    <div className="localized-field mb-4">
      <p className="form-static-label localized-field__title">
        {label}
        {required ? " *" : ""}
      </p>
      {infoText ? <p className="form-text mt-0 mb-3">{infoText}</p> : null}
      <Row className="g-3">
        <Col md={6}>
          <LangInput
            id={`${id}-it`}
            langCode="IT"
            langName={t("form.langIt")}
            fieldLabel={label}
            value={loc.it}
            multiline={multiline}
            rows={rows}
            invalid={invalid}
            validationText={validationText}
            onChange={(it) => onChange({ ...loc, it })}
          />
        </Col>
        <Col md={6}>
          <LangInput
            id={`${id}-en`}
            langCode="EN"
            langName={t("form.langEn")}
            fieldLabel={label}
            value={loc.en}
            multiline={multiline}
            rows={rows}
            onChange={(en) => onChange({ ...loc, en })}
          />
        </Col>
      </Row>
    </div>
  );
}
