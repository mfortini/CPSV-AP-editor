import { useTranslation } from "react-i18next";
import { withoutExplainSearch } from "../persist/explainPage";

type Props = {
  onBack: () => void;
};

export function ExplainView({ onBack }: Props) {
  const { t } = useTranslation();
  const backHref = withoutExplainSearch(window.location.href);

  return (
    <article className="explain">
      <p className="explain__back">
        <a
          href={backHref}
          onClick={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          {t("explain.back")}
        </a>
      </p>
      <h1>{t("explain.title")}</h1>
      <p className="explain__lead">{t("explain.lead")}</p>

      <section className="explain__section">
        <h2>{t("explain.uniformTitle")}</h2>
        <p>{t("explain.uniformBody")}</p>
      </section>

      <section className="explain__section">
        <h2>{t("explain.interopTitle")}</h2>
        <p>{t("explain.interopBody")}</p>
        <ol className="explain__chain">
          <li>{t("explain.interopWallet")}</li>
          <li>{t("explain.interopApi")}</li>
        </ol>
        <p>{t("explain.interopOut")}</p>
      </section>

      <section className="explain__section">
        <h2>{t("explain.oasTitle")}</h2>
        <p>{t("explain.oasBody")}</p>
      </section>

      <p className="explain__note">{t("explain.note")}</p>
    </article>
  );
}
