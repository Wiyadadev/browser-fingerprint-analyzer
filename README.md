# Browser Fingerprint Analyzer

An educational browser privacy research project by VYADA Security. Inspect browser-exposed signals, generate a SHA-256 fingerprint, and compare snapshots between browsers on the same device.

## Features

- User-Agent, language, timezone, screen resolution/pixel ratio, and logical CPU threads.
- Canvas rendering signature and WebGL vendor/renderer, with unavailable-API handling.
- SHA-256 canvas hash and combined fingerprint.
- Copy/paste JSON snapshots and field-by-field SAME / DIFFERENT comparison.
- Manual clipboard fallback, snapshot validation, accessible status messages.

## Run locally

With Python 3 installed, open a terminal in this folder and run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

On Windows, `py -m http.server 8000 --bind 127.0.0.1` is another option. Open http://localhost:8000 in Chrome and Edge. Use localhost because Web Crypto and clipboard features require a secure context. No package installation or build step is needed. Stop the server with Ctrl+C.

## Compare Chrome and Edge

1. Open the page in Chrome and wait for “Fingerprint ready”.
2. Select Copy Snapshot.
3. Open the same localhost URL in Edge.
4. Select Paste Snapshot, or paste manually into the labeled box.
5. Select Compare. Repeat after reloading or changing one browser setting.

Clipboard permissions vary. When copy is blocked, the snapshot is selected in the box for manual copying. When paste is blocked, use Ctrl+V. Browser storage is isolated between browsers, so snapshots are transferred explicitly instead of relying on localStorage.

## Recorded experiment

The prior project conversation reported these results from a Chrome vs Edge comparison on the same computer:

| Field | Result |
| --- | --- |
| browser (User-Agent) | DIFFERENT |
| language | SAME |
| timezone | SAME |
| screen | SAME |
| cpu | SAME |
| canvasHash | SAME |
| gpuVendor | SAME |
| gpuRenderer | SAME |
| fingerprint | DIFFERENT |

Different browser User-Agent values were sufficient to change the combined fingerprint even when the other collected signals matched. These are findings reported in the original conversation, not a newly reproduced Chrome/Edge experiment. Browser versions, raw snapshots, and experiment date were not recorded. Results may vary by device, browser settings, graphics drivers, and privacy protections. Add a reviewed screenshot to `docs/screenshots/` before presenting this as independently verifiable evidence; avoid publishing raw device snapshots.

## How it works

The original canvas drawing is preserved. Its data URL is hashed with SHA-256. The final hash is SHA-256 over these values joined with `|`, in this order: browser, language, timezone, screen, cpu, canvasHash, gpuVendor, gpuRenderer. The original nine-field snapshot format is preserved so earlier snapshots remain usable.

Unavailable Canvas produces a hash of the string `Canvas unavailable`; unavailable WebGL uses explicit placeholder strings. The CPU field reflects reported logical concurrency, not a CPU model. A hash is not proof of a unique person or device. Matching hashes do not establish identity; changed hashes do not necessarily indicate a different device. Hashing these values does not anonymize them.

## Privacy and educational scope

All fingerprint computation and comparisons happen inside the page. There are no external dependencies, API calls, analytics, cookies, persistent browser storage, or automatic uploads. The local server only serves static files. Clipboard read/write is initiated by the user. Snapshots remain in page memory and the textarea until reload; copied data may remain in your clipboard. A restrictive page policy blocks outbound connection APIs.

Use this lab to study your own browsers or consenting participants. Do not integrate it into covert visitor tracking or authentication decisions.

## Project structure

```text
browser-fingerprint-analyzer/
  index.html
  fingerprint.js
  README.md
  .gitignore
  .gitattributes
  docs/screenshots/README.md
  tests/smoke.cjs
```

## Validation

With Node.js 20+ installed:

```sh
node --check fingerprint.js
node --test tests/smoke.cjs
```

The tests exercise the script with simulated browser APIs: hash compatibility, same/changed comparisons, malformed snapshots, clipboard fallback, unavailable graphics APIs, and missing Web Crypto. These checks do not replace a real Chrome/Edge run. Manually verify the workflow above, narrow window layout, and clipboard permission denial before publishing screenshots.

## Prepare for GitHub

Upload the contents of this folder to a new repository, or initialize Git within this folder, add the files, and commit. Keep snapshots and personal evidence out of version control. Choose a license before inviting reuse; no license is assumed here. Repository: https://github.com/Wiyadadev/browser-fingerprint-analyzer

Suggested repository description: “Local-only browser fingerprint analyzer exploring Canvas, WebGL, SHA-256, and cross-browser privacy signals.”

## Portfolio summary

Built a local browser fingerprinting lab using JavaScript, Canvas, WebGL, and Web Crypto. Implemented validated JSON snapshot exchange for cross-browser comparison and examined how User-Agent differences affect combined hashes despite matching graphics and device signals. The project demonstrates browser API investigation, defensive input handling, and responsible privacy research.

