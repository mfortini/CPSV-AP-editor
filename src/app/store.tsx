import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applySuggestions,
  documentToForm,
  emptyDraft,
  filenameForDraft,
  formToDocument,
  listPublicServices,
  parseJsonLdText,
  playgroundUrl,
  serviceSlice,
  validateDraft,
} from "../domain";
import type {
  AppLang,
  AppView,
  Draft,
  JsonLdDocument,
  SuggestionField,
} from "../domain/types";
import {
  DOC_SOFT_LIMIT,
  compressJson,
  decompressJson,
  parseHash,
  writeHash,
} from "../persist/hashDoc";
import { setAppLanguage } from "../i18n";
import { loadVocabs, type VocabBundle } from "../vocabs/load";

type Toast = { message: string; at: number };

type Store = {
  draft: Draft;
  setDraft: (draft: Draft | ((prev: Draft) => Draft)) => void;
  view: AppView;
  setView: (view: AppView) => void;
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  vocabs: VocabBundle | null;
  document: JsonLdDocument;
  errors: string[];
  urlTooLarge: boolean;
  compressedSize: number | null;
  toast: Toast | null;
  showToast: (message: string) => void;
  resetDraft: () => void;
  importText: (text: string) => Promise<void>;
  importFile: (file: File) => Promise<void>;
  pickPendingService: (serviceId: string) => void;
  cancelPick: () => void;
  pendingServices: { id: string; title: string }[] | null;
  exportSheet: () => void;
  copySheet: () => Promise<void>;
  openPlayground: () => void;
  suggestStructure: () => { changed: number; fields: SuggestionField[] };
};

const StoreContext = createContext<Store | null>(null);

function downloadBlob(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/ld+json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<Draft>(() => emptyDraft());
  const [view, setViewState] = useState<AppView>("editor");
  const [lang, setLangState] = useState<AppLang>("it");
  const [vocabs, setVocabs] = useState<VocabBundle | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [urlTooLarge, setUrlTooLarge] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [pendingDoc, setPendingDoc] = useState<JsonLdDocument | null>(null);
  const [pendingServices, setPendingServices] = useState<
    { id: string; title: string }[] | null
  >(null);
  const bootDone = useRef(false);
  const syncTimer = useRef<number | null>(null);

  const document = useMemo(() => formToDocument(draft), [draft]);
  const errors = useMemo(() => validateDraft(draft), [draft]);

  const showToast = useCallback((message: string) => {
    setToast({ message, at: Date.now() });
  }, []);

  const syncDocToHash = useCallback(
    async (nextDraft: Draft, nextView: AppView, nextLang: AppLang) => {
      try {
        const doc = formToDocument(nextDraft);
        const compressed = await compressJson(doc);
        setCompressedSize(compressed.length);
        setUrlTooLarge(compressed.length > DOC_SOFT_LIMIT);
        writeHash(
          {
            lang: nextLang,
            view: nextView,
            doc: compressed,
          },
          { replace: true },
        );
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  const scheduleHashSync = useCallback(
    (nextDraft: Draft, nextView: AppView, nextLang: AppLang) => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncDocToHash(nextDraft, nextView, nextLang);
      }, 350);
    },
    [syncDocToHash],
  );

  const setDraft = useCallback(
    (value: Draft | ((prev: Draft) => Draft)) => {
      setDraftState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        scheduleHashSync(next, view, lang);
        return next;
      });
    },
    [lang, scheduleHashSync, view],
  );

  const setView = useCallback(
    (next: AppView) => {
      setViewState(next);
      void (async () => {
        try {
          const compressed = await compressJson(formToDocument(draft));
          setCompressedSize(compressed.length);
          setUrlTooLarge(compressed.length > DOC_SOFT_LIMIT);
          writeHash({ lang, view: next, doc: compressed }, { replace: false });
        } catch {
          writeHash({ lang, view: next, doc: parseHash().doc }, { replace: false });
        }
      })();
    },
    [draft, lang],
  );

  const setLang = useCallback(
    (next: AppLang) => {
      setLangState(next);
      setAppLanguage(next);
      scheduleHashSync(draft, view, next);
    },
    [draft, scheduleHashSync, view],
  );

  const applyServiceDoc = useCallback(
    (doc: JsonLdDocument, serviceId?: string | null) => {
      const next = documentToForm(doc, serviceId);
      setDraftState(next);
      scheduleHashSync(next, view, lang);
    },
    [lang, scheduleHashSync, view],
  );

  const importDocument = useCallback(
    async (doc: JsonLdDocument, preferredServiceId?: string | null) => {
      const services = listPublicServices(doc);
      if (!services.length) {
        throw new Error("Nessun PublicService nel documento.");
      }
      if (services.length === 1 || preferredServiceId) {
        const id = preferredServiceId || services[0].id;
        const slice = serviceSlice(doc, id);
        applyServiceDoc(slice, id);
        setPendingDoc(null);
        setPendingServices(null);
        return;
      }
      setPendingDoc(doc);
      setPendingServices(services);
    },
    [applyServiceDoc],
  );

  const importText = useCallback(
    async (text: string) => {
      const doc = parseJsonLdText(text);
      await importDocument(doc);
    },
    [importDocument],
  );

  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      await importText(text);
    },
    [importText],
  );

  const pickPendingService = useCallback(
    (serviceId: string) => {
      if (!pendingDoc) return;
      const slice = serviceSlice(pendingDoc, serviceId) as JsonLdDocument;
      applyServiceDoc(slice, serviceId);
      setPendingDoc(null);
      setPendingServices(null);
    },
    [applyServiceDoc, pendingDoc],
  );

  const cancelPick = useCallback(() => {
    setPendingDoc(null);
    setPendingServices(null);
  }, []);

  const resetDraft = useCallback(() => {
    const next = emptyDraft();
    setDraftState(next);
    scheduleHashSync(next, view, lang);
  }, [lang, scheduleHashSync, view]);

  const exportSheet = useCallback(() => {
    const errs = validateDraft(draft);
    if (errs.length) {
      showToast(errs[0]);
      return;
    }
    downloadBlob(filenameForDraft(draft), formToDocument(draft));
  }, [draft, showToast]);

  const copySheet = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(formToDocument(draft), null, 2));
  }, [draft]);

  const openPlayground = useCallback(() => {
    const errs = validateDraft(draft);
    if (errs.length) {
      showToast(errs[0]);
      return;
    }
    window.open(playgroundUrl(formToDocument(draft)), "_blank", "noopener,noreferrer");
  }, [draft, showToast]);

  const suggestStructure = useCallback(() => {
    const result = applySuggestions(draft);
    setDraft(result.draft);
    return { changed: result.changed, fields: result.fields };
  }, [draft, setDraft]);

  // Boot: vocabs + hash + legacy query
  useEffect(() => {
    if (bootDone.current) return;
    bootDone.current = true;

    void (async () => {
      try {
        setVocabs(await loadVocabs());
      } catch (error) {
        console.error(error);
      }

      const params = new URLSearchParams(window.location.search);
      const catalogParam = params.get("catalog");
      const serviceParam = params.get("service");
      const hashState = parseHash();

      setLangState(hashState.lang);
      setAppLanguage(hashState.lang);
      setViewState(hashState.view);

      if (catalogParam) {
        try {
          const catalogUrl = new URL(catalogParam, window.location.href).href;
          const response = await fetch(catalogUrl, { credentials: "same-origin" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const doc = parseJsonLdText(JSON.stringify(await response.json()));
          await importDocument(doc, serviceParam);
          const clean = new URL(window.location.href);
          clean.search = "";
          window.history.replaceState({}, "", clean.pathname + clean.hash);
          return;
        } catch (error) {
          console.error(error);
          showToast(String((error as Error)?.message || error));
        }
      }

      if (hashState.doc) {
        try {
          const doc = await decompressJson(hashState.doc);
          const next = documentToForm(doc);
          setDraftState(next);
          setCompressedSize(hashState.doc.length);
          setUrlTooLarge(hashState.doc.length > DOC_SOFT_LIMIT);
          return;
        } catch (error) {
          console.error(error);
        }
      }
    })();
  }, [importDocument, showToast]);

  useEffect(() => {
    const onHashChange = () => {
      const state = parseHash();
      setLangState(state.lang);
      setAppLanguage(state.lang);
      setViewState(state.view);
      if (!state.doc) return;
      void decompressJson(state.doc)
        .then((doc) => {
          setDraftState(documentToForm(doc));
          setCompressedSize(state.doc!.length);
        })
        .catch(console.error);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const value = useMemo<Store>(
    () => ({
      draft,
      setDraft,
      view,
      setView,
      lang,
      setLang,
      vocabs,
      document,
      errors,
      urlTooLarge,
      compressedSize,
      toast,
      showToast,
      resetDraft,
      importText,
      importFile,
      pickPendingService,
      cancelPick,
      pendingServices,
      exportSheet,
      copySheet,
      openPlayground,
      suggestStructure,
    }),
    [
      draft,
      setDraft,
      view,
      setView,
      lang,
      setLang,
      vocabs,
      document,
      errors,
      urlTooLarge,
      compressedSize,
      toast,
      showToast,
      resetDraft,
      importText,
      importFile,
      pickPendingService,
      cancelPick,
      pendingServices,
      exportSheet,
      copySheet,
      openPlayground,
      suggestStructure,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}
