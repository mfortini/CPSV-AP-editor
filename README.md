# Editor scheda CPSV-AP_IT

SPA statica (React + Vite + Bootstrap Italia / Design React Kit) per compilare, anteprimaire e condividere una **singola** scheda di servizio pubblico in JSON-LD conforme a CPSV-AP_IT.

## Funzionalità

- Form guidato ↔ JSON-LD (`formToDocument` / `documentToForm`)
- Anteprima scheda, grafo del servizio, sorgente JSON-LD (CodeMirror)
- Vocabolari controllati cercabili (eventi della vita, temi, tipi I/O, concetti)
- Suggerimenti strutturali da testo libero
- **Condivisione via URL fragment**: `#lang=it&view=editor&doc=<gzip-base64url>`
- Apertura sul [JSON-LD Playground](https://json-ld.org/playground/)
- UI IT / EN
- Hosting statico (GitHub Pages)

## Persistenza

Si salva e si condivide **solo la scheda corrente**.  
Importare un catalogo con N servizi serve solo a **scegliere** quale editare; gli altri non restano in memoria né nell’URL.

Se il payload compresso supera ~8KB, compare un avviso: preferisci export/copia. Il fragment può comunque contenere `doc` finché il browser lo accetta.

## Sviluppo

```bash
npm install
npm run dev
npm test
npm run build
```

Esempio: `public/examples/scheda-esempio.jsonld`.

Deep-link legacy (come dal catalogo cittadini):  
`?catalog=<url-jsonld>&service=<id>` → importa lo slice e scrive `doc` nel fragment.

## Deploy GitHub Pages

Il workflow `.github/workflows/pages.yml` pubblica la cartella `dist/` su Pages.  
`base: './'` e `public/.nojekyll` sono già configurati.

## Origine

La logica di dominio deriva dall’editor Vanilla `scheda-cpsv-*` del progetto JSON-LD-viz.
