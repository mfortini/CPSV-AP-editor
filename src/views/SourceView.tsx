import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Container } from "design-react-kit";
import { useStore } from "../app/store";

export function SourceView() {
  const { t } = useTranslation();
  const { document } = useStore();
  const value = useMemo(() => JSON.stringify(document, null, 2), [document]);

  return (
    <Container className="py-4">
      <h2 className="h3">{t("source.heading")}</h2>
      <p className="text-secondary">{t("source.hint")}</p>
      <div className="border rounded overflow-hidden">
        <CodeMirror
          value={value}
          height="480px"
          extensions={[json()]}
          editable={false}
          basicSetup={{ lineNumbers: true, foldGutter: true }}
        />
      </div>
    </Container>
  );
}
