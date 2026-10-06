import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Container,
  Dropdown,
  DropdownMenu,
  DropdownToggle,
  FontLoader,
  Header,
  HeaderBrand,
  HeaderContent,
  HeaderRightZone,
  Headers,
  LinkList,
  LinkListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NotificationManager,
  notify,
  Sidebar,
  TextArea,
} from "design-react-kit";
import { StoreProvider, useStore } from "./app/store";
import type { AppView } from "./domain/types";
import { EditorView } from "./views/EditorView";
import { SheetPreview } from "./views/SheetPreview";
import { GraphView } from "./views/GraphView";
import { SourceView } from "./views/SourceView";
import { VocabsView } from "./views/VocabsView";
import "./App.css";

const VIEWS: AppView[] = ["editor", "scheda", "grafo", "sorgente", "vocabolari"];

function AppShell() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    view,
    setView,
    lang,
    setLang,
    toast,
    showToast,
    resetDraft,
    importFile,
    importText,
    pendingServices,
    pickPendingService,
    cancelPick,
    exportSheet,
    copySheet,
    openPlayground,
    urlTooLarge,
    compressedSize,
  } = useStore();

  useEffect(() => {
    if (!toast) return;
    notify(toast.message, {
      dismissable: true,
      duration: 3200,
      state: "info",
    });
  }, [toast]);

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <>
      <FontLoader />
      <a className="visually-hidden-focusable" href="#main">
        {t("app.skip")}
      </a>
      <Headers>
        <Header type="center" small>
          <HeaderContent>
            <HeaderBrand tag="div">
              <h2>{t("app.title")}</h2>
              <h3>{t("app.subtitle")}</h3>
            </HeaderBrand>
            <HeaderRightZone>
              <div className="app-header-actions d-flex gap-2 align-items-center flex-wrap">
                <Dropdown isOpen={menuOpen} toggle={() => setMenuOpen((open) => !open)}>
                  <DropdownToggle caret color="primary" className="app-menu-toggle btn-sm">
                    {t("actions.menu")}
                  </DropdownToggle>
                  <DropdownMenu className="app-menu-dropdown">
                    <LinkList>
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() =>
                          runMenuAction(() => {
                            resetDraft();
                            showToast(t("toast.new"));
                          })
                        }
                      >
                        <span>{t("actions.new")}</span>
                      </LinkListItem>
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() => runMenuAction(() => fileRef.current?.click())}
                      >
                        <span>{t("actions.import")}</span>
                      </LinkListItem>
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() => runMenuAction(() => setPasteOpen(true))}
                      >
                        <span>{t("actions.paste")}</span>
                      </LinkListItem>
                      <LinkListItem divider inDropdown />
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() =>
                          runMenuAction(() => {
                            exportSheet();
                            showToast(t("toast.exported"));
                          })
                        }
                      >
                        <span>{t("actions.export")}</span>
                      </LinkListItem>
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() =>
                          runMenuAction(() => {
                            void copySheet()
                              .then(() => showToast(t("toast.copied")))
                              .catch(() => showToast(t("toast.error")));
                          })
                        }
                      >
                        <span>{t("actions.copy")}</span>
                      </LinkListItem>
                      <LinkListItem
                        inDropdown
                        tag="button"
                        type="button"
                        onClick={() => runMenuAction(openPlayground)}
                      >
                        <span>{t("actions.playground")}</span>
                      </LinkListItem>
                    </LinkList>
                  </DropdownMenu>
                </Dropdown>
                <div className="app-lang-switch d-flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    outline={lang !== "it"}
                    onClick={() => setLang("it")}
                  >
                    IT
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    outline={lang !== "en"}
                    onClick={() => setLang("en")}
                  >
                    EN
                  </Button>
                </div>
              </div>
            </HeaderRightZone>
          </HeaderContent>
        </Header>
      </Headers>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.jsonld,application/ld+json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void importFile(file)
            .then(() => showToast(t("toast.imported")))
            .catch((error: Error) => showToast(error.message || t("toast.error")));
        }}
      />

      <div className="app-shell">
        <aside className="app-sidebar" aria-label={t("nav.section")}>
          <Sidebar left>
            <div className="app-sidebar__inner">
              <p className="app-sidebar__label">{t("nav.section")}</p>
              <LinkList>
                {VIEWS.map((item) => (
                  <LinkListItem
                    key={item}
                    active={view === item}
                    href={`#view=${item}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setView(item);
                    }}
                  >
                    <span>{t(`nav.${item}`)}</span>
                  </LinkListItem>
                ))}
              </LinkList>
            </div>
          </Sidebar>
          <label className="visually-hidden" htmlFor="app-view-select">
            {t("nav.section")}
          </label>
          <select
            id="app-view-select"
            className="form-select app-sidebar__mobile"
            value={view}
            onChange={(event) => setView(event.target.value as AppView)}
          >
            {VIEWS.map((item) => (
              <option key={item} value={item}>
                {t(`nav.${item}`)}
              </option>
            ))}
          </select>
        </aside>

        <div className="app-content">
          {urlTooLarge && (
            <Container className="pt-3">
              <div className="alert alert-warning mb-0" role="status">
                {t("url.limitWarning", { size: compressedSize ?? "—" })}
              </div>
            </Container>
          )}
          <main id="main">
            {view === "editor" && <EditorView />}
            {view === "scheda" && (
              <Container className="py-4">
                <h2 className="h3 mb-3">{t("preview.heading")}</h2>
                <SheetPreview />
              </Container>
            )}
            {view === "grafo" && <GraphView />}
            {view === "sorgente" && <SourceView />}
            {view === "vocabolari" && <VocabsView />}
          </main>
        </div>
      </div>

      <Modal isOpen={pasteOpen} toggle={() => setPasteOpen(false)} labelledBy="paste-title">
        <ModalHeader id="paste-title" toggle={() => setPasteOpen(false)}>
          {t("paste.title")}
        </ModalHeader>
        <ModalBody>
          <p>{t("paste.intro")}</p>
          <TextArea
            id="paste-input"
            label="JSON-LD"
            rows={12}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setPasteOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onClick={() => {
              void importText(pasteText)
                .then(() => {
                  setPasteOpen(false);
                  setPasteText("");
                  showToast(t("toast.imported"));
                })
                .catch((error: Error) => showToast(error.message || t("toast.error")));
            }}
          >
            {t("actions.apply")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={Boolean(pendingServices)}
        toggle={cancelPick}
        labelledBy="pick-title"
      >
        <ModalHeader id="pick-title" toggle={cancelPick}>
          {t("pick.title")}
        </ModalHeader>
        <ModalBody>
          <p>{t("pick.intro")}</p>
          <ul className="list-group">
            {pendingServices?.map((service) => (
              <li key={service.id}>
                <button
                  type="button"
                  className="list-group-item list-group-item-action"
                  onClick={() => {
                    pickPendingService(service.id);
                    showToast(t("toast.imported"));
                  }}
                >
                  <strong className="d-block">{service.title}</strong>
                  <small className="text-break">{service.id}</small>
                </button>
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={cancelPick}>
            {t("actions.cancel")}
          </Button>
        </ModalFooter>
      </Modal>

      <NotificationManager />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
