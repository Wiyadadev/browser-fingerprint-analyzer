"use strict";

const fields = Object.freeze(["browser", "language", "timezone", "screen", "cpu", "canvasHash", "gpuVendor", "gpuRenderer", "fingerprint"]);
let currentSnapshot = null;

function setStatus(message) {
    document.getElementById("status").textContent = message;
}

function isReady() {
    if (currentSnapshot) return true;
    setStatus("Fingerprint is not ready. Check the message above and reload.");
    return false;
}

async function sha256(text) {
    if (!globalThis.crypto?.subtle) {
        throw new Error("SHA-256 requires a secure context. Open this page at http://localhost:8000.");
    }
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function getCanvasSignature() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 300;
    canvas.height = 80;

    if (!ctx) return "Canvas unavailable";

    ctx.textBaseline = "top";
    ctx.font = "16px Arial";

    ctx.fillStyle = "#f60";
    ctx.fillRect(20, 20, 120, 35);

    ctx.fillStyle = "#069";
    ctx.fillText("VYADA Security", 10, 10);

    ctx.strokeStyle = "#7ee787";
    ctx.beginPath();
    ctx.arc(180, 40, 25, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL();
}

function getWebGLInfo() {
    const canvas = document.createElement("canvas");

    const gl =
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");

    if (!gl) {
        return {
            vendor: "WebGL unavailable",
            renderer: "WebGL unavailable"
        };
    }

    const debugInfo =
        gl.getExtension("WEBGL_debug_renderer_info");

    if (debugInfo) {
        return {
            vendor: gl.getParameter(
                debugInfo.UNMASKED_VENDOR_WEBGL
            ),
            renderer: gl.getParameter(
                debugInfo.UNMASKED_RENDERER_WEBGL
            )
        };
    }

    return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER)
    };
}

async function createFingerprint() {
    const browser = navigator.userAgent;
    const language = navigator.language;

    const timezone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;

    const screenInfo =
        `${screen.width}x${screen.height} @ ${window.devicePixelRatio}`;

    const cpu =
        navigator.hardwareConcurrency || "unknown";

    let canvasData;
    try { canvasData = getCanvasSignature(); }
    catch { canvasData = "Canvas unavailable"; }

    const canvasHash =
        await sha256(canvasData);

    let webgl;
    try { webgl = getWebGLInfo(); }
    catch { webgl = { vendor: "WebGL unavailable", renderer: "WebGL unavailable" }; }

    const rawFingerprint = [
        browser,
        language,
        timezone,
        screenInfo,
        cpu,
        canvasHash,
        webgl.vendor,
        webgl.renderer
    ].join("|");

    const fingerprint =
        await sha256(rawFingerprint);

    currentSnapshot = {
        browser: browser,
        language: language,
        timezone: timezone,
        screen: screenInfo,
        cpu: cpu,
        canvasHash: canvasHash,
        gpuVendor: webgl.vendor,
        gpuRenderer: webgl.renderer,
        fingerprint: fingerprint
    };

    for (const field of fields) {
        document.getElementById(field).textContent = String(currentSnapshot[field]);
    }
    for (const id of ["copyButton", "compareButton"]) document.getElementById(id).disabled = false;
    setStatus("Fingerprint ready. All computation stays in this browser.");
}

async function copySnapshot() {
    if (!isReady()) return;
    const data =
        JSON.stringify(currentSnapshot);

    try {
        await navigator.clipboard.writeText(data);

        setStatus("Snapshot copied. Paste it in the other browser.");
    } catch (error) {
        document.getElementById("snapshotInput").value =
            data;

        const input = document.getElementById("snapshotInput");
        input.focus();
        input.select();
        setStatus("Snapshot placed in the box. Copy it manually.");
    }
}

async function pasteSnapshot() {
    try {
        const text =
            await navigator.clipboard.readText();

        document.getElementById(
            "snapshotInput"
        ).value = text;

        setStatus("Snapshot pasted. Select Compare.");
    } catch (error) {
        setStatus(
            "Browser blocked clipboard access. Paste manually into the box."
        );
    }
}

function compareSnapshot() {
    if (!isReady()) return;
    const input =
        document.getElementById(
            "snapshotInput"
        ).value.trim();

    if (!input) {
        document.getElementById(
            "compareResult"
        ).textContent =
            "No snapshot pasted.";
        return;
    }

    let oldSnapshot;

    try {
        oldSnapshot =
            JSON.parse(input);
    } catch (error) {
        document.getElementById(
            "compareResult"
        ).textContent =
            "Invalid snapshot data.";
        return;
    }

    const valid = oldSnapshot !== null && typeof oldSnapshot === "object" && !Array.isArray(oldSnapshot) &&
        fields.every(field => Object.hasOwn(oldSnapshot, field) &&
            (field === "cpu" ? (oldSnapshot[field] === "unknown" || (Number.isInteger(oldSnapshot[field]) && oldSnapshot[field] > 0)) : typeof oldSnapshot[field] === "string")) &&
        ["canvasHash", "fingerprint"].every(field => /^[a-f0-9]{64}$/.test(oldSnapshot[field]));
    if (!valid) {
        document.getElementById("compareResult").textContent = "Invalid snapshot: paste a complete snapshot copied from this analyzer.";
        return;
    }

    let result =
        "Fingerprint Comparison\n\n";

    for (const field of fields) {
        const same =
            oldSnapshot[field] ===
            currentSnapshot[field];

        result +=
            `${field.padEnd(15)} : ${
                same ? "SAME" : "DIFFERENT"
            }\n`;
    }

    document.getElementById(
        "compareResult"
    ).textContent =
        result;
}

createFingerprint().catch(error => {
    currentSnapshot = null;
    setStatus(`Unable to create fingerprint: ${error.message}`);
});
for (const [id, handler] of [["copyButton", copySnapshot], ["pasteButton", pasteSnapshot], ["compareButton", compareSnapshot]]) {
    document.getElementById(id).addEventListener("click", handler);
}
