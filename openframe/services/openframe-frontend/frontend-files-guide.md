# MeshCentral “Files” Frontend Implementation Guide

This document explains how a standalone React frontend can integrate with the MeshCentral backend to implement the “Files” feature. It describes the websocket entry points, message formats, and operational flows required to browse server-hosted files, initiate agent tunnels, and upload or download device files.

---

## 1. Architecture Overview

| Component | Purpose | Transport |
| --- | --- | --- |
| `control.ashx` | Persistent control websocket for authentication, metadata, and high-level commands | WebSocket (`ws`/`wss`) |
| `meshrelay.ashx` (or `sshfilesrelay.ashx`) | Per-device relay websocket for protocol 5 (Files) sessions | WebSocket, optional WebRTC |
| `devicefile.ashx` | HTTP relay used for direct downloads when available | HTTPS |

Key tokens:
- **`authCookie`**: user authentication cookie. Sent to `control.ashx`, appended to relay URLs, and passed to legacy HTTP endpoints.
- **`authRelayCookie`**: tunnel authorization cookie returned by `control.ashx`. Forwarded to agents via `{type:'tunnel'}` commands to authenticate their relay side.

---

## 2. Establishing the Control Channel (`control.ashx`)

1. Open a websocket to `wss(s)://<host>/<domain>/control.ashx` (append `?key=...` when needed).
2. If `authCookie` exists, append `?moreargs=1` and immediately send `{action:'urlargs', args:{auth: authCookie}}`.
3. Once `State` progresses to `2`, request data:
   ```json
   { "action": "usergroups" }
   { "action": "meshes" }
   { "action": "nodes", "skip": 0 }
   { "action": "files" }
   ```
4. Keep-alive: send `{action:'ping'}` every 29 seconds; respond to `{action:'ping'}` with `{action:'pong'}`.
5. Token refresh: every 30 minutes issue `{action:'authcookie'}`; the reply contains new `authCookie` + `authRelayCookie`.
6. Listen for:
   - `event` messages (e.g., `updatefiles` ⇒ reissue `{action:'files'}`).
   - `authcookie` (update local tokens).
   - `files` (server-side file tree payload described below).

### Server “My Files” tree

`{action:'files'}` returns:
```json
{
  "action": "files",
  "filetree": {
    "n": "Root",
    "f": {
      "user/<domain>/<userid>": { "t": 1, "n": "My Files", "maxbytes": ..., "f": { ... } },
      "mesh/<domain>/<meshid>": { "t": 4, "n": "<Mesh Name>", "maxbytes": ..., "f": { ... } }
    }
  }
}
```

Each node contains:
- `t`: type (1 user root, 2 folder, 3 file, 4 mesh root).
- `n`: display name.
- `nx`: normalized key (path component).
- `s`: file size (bytes).
- `d`: timestamp (epoch ms or Unix seconds).

### Server-side file mutations

Send `{action:'fileoperation', fileop:'...'}` through `control.ashx`. Supported operations:

| Operation | Required fields | Notes |
| --- | --- | --- |
| `createfolder` | `path` (array), `newfolder` | Validates name before `mkdir`. |
| `delete` | `path`, `delfiles` array, `rec` flag | Removes files or directories (recursive when `rec`). |
| `rename` | `path`, `oldname`, `newname` | Validates both names. |
| `copy` / `move` | `scpath`, `path`, `names` array | Optionally triggers quota checks; emits `copyFile` helper server-side. |
| `get` | `path`, `file` | Reads files ≤ 200 KB and replies with base64 payload. |
| `set` | `path`, `file`, `data` | Writes base64 data, then fires `updatefiles`. |

After most operations the server dispatches an `updatefiles` event; re-request the tree to stay in sync.

---

## 3. Launching a Device Files Session (`meshrelay.ashx`, protocol 5)

1. Instantiate a “module” descriptor `{ protocol: 5, ProcessData: onMessage }`.
2. Pass it to `CreateAgentRedirect` (or equivalent) along with the control socket:
   ```js
   files = CreateAgentRedirect(meshserver, CreateRemoteFiles(onFileUpdate), serverPublicNamePort, authCookie, authRelayCookie, domainUrl);
   files.Start(nodeId);
   ```
3. `CreateAgentRedirect`:
   - Generates a random `tunnelid`.
   - Opens `wss://<host>/<domain>/meshrelay.ashx?browser=1&p=5&nodeid=<nodeId>&id=<tunnelId>&auth=<authCookie>`.
   - Notifies the agent via control channel: `{action:'msg', type:'tunnel', nodeid, value:'*/<domain>meshrelay.ashx?p=5&nodeid=...&id=...&rauth=<authRelayCookie>', usage:5}`.

4. When both sides connect:
   - Server sends `'c'` (or `'cr'` if it started recording). Respond by sending any consent options and writing the literal character `5` to confirm protocol selection.
   - `files.State` becomes `3`; begin exchanging JSON commands and binary payloads.
5. Optional WebRTC switch:
   - Set `files.attemptWebRTC = true` and provide ICE config.
   - Control messages with `ctrlChannel:102938` coordinate SDP offer/answer (`type:'rtt'`, `'answer'`, `'webrtc0/1/2'`).

**SFTP sessions** reuse the same flow but target `/sshfilesrelay.ashx` and rely on `data.action == 'sshauth'` prompts to gather credentials.

---

## 4. Protocol 5 Command Surface

All commands are JSON messages sent over the relay websocket (or WebRTC data channel if active) via `files.sendText(...)`. Binary payloads (downloads/uploads) use `files.send(...)` with framing rules described later.

### 4.1 Directory listing
```json
{ "action": "ls", "reqid": 1, "path": "<current path or ''>" }
```
Responses contain:
```json
{ "path": "\\", "dir": [{ "n": "C", "nx": "C", "t": 1, "s": 0, "d": 1700000000, ... }, ...] }
```
Use this to update breadcrumbs (`p13filetreelocation`) and render entries.

### 4.2 File/folder operations

| UI action | Command |
| --- | --- |
| Create folder | `{ "action":"mkdir", "reqid":1, "path":"<current>/<new>" }` |
| Delete | `{ "action":"rm", "reqid":1, "path":"...", "delfiles":[...], "rec":true/false }` |
| Rename | `{ "action":"rename", "path":"...", "oldname":"A", "newname":"B" }` |
| Copy/move clipboard | `{ "action":"copy" | "move", "reqid":1, "scpath":"<source>", "dspath":"<dest>", "names":["file1", ...] }` |
| Zip | `{ "action":"zip", "path":"...", "files":[...], "output":"archive.zip" }` |
| Unzip | `{ "action":"unzip", "input":"/path/file.zip", "dest":"/path/out/" }` |
| Find file | `{ "action":"findfile", "path":"...", "filter":"*.log" }` (results stream back via `data.action=='findfile'`). |

Server progress or error dialogs arrive as:
```json
{ "action":"dialogmessage", "msg":"zipping" | "zippingFile" | "unzipping" | "unziperror", ... }
```

### 4.3 SSH / SFTP authentication

When `files.urlname = 'sshfilesrelay.ashx'`, the relay may request credentials:
```json
{ "action":"sshauth", "username":"", "methods":["password","key"], ... }
```
Reply with:
```json
{ "action":"sshauth", "username":"...", "password":"...", "keep":0 }
```
or provide key data / passphrase as needed.

---

## 5. Downloads

### 5.1 Streaming over the relay

1. Start:
   ```json
   { "action":"download", "sub":"start", "id": "<rand>", "path": "<full path>" }
   ```
2. Server replies `{sub:'start'}` ⇒ send `{sub:'startack'}`.
3. Binary chunks arrive, each prefixed with a 4-byte header. The lowest bit of `ReadInt(header, 0)` indicates “final chunk”.
4. After processing each non-final chunk, ACK with `{action:'download', 'sub':'ack', id}`.
5. On final chunk:
   - If you initiated a “view” operation, display the accumulated buffer.
   - Otherwise, create a Blob (`saveAs(data2blob(...), filename)`).

### 5.2 Direct HTTP download

When feasible, build a link to `devicefile.ashx`:
```
devicefile.ashx?c=<authCookie>&m=<meshShortId>&n=<nodeShortId>&f=<encoded path>
```
Trigger `window.open()` or programmatic download. MeshCentral handles relay setup server-side (`meshdevicefile.js`) using the same tunnel auth cookie.

---

## 6. Uploads

Upload flow mirrors the reference UI:

1. Collect selected `File` objects (drag/drop or `<input type="file">`).
2. Optionally warn if any filenames already exist in the target directory.
3. Kick off transfer:
   ```json
   { "action":"upload", "reqid": currentIndex, "path": "<target path>", "name": file.name, "size": file.size }
   ```
4. Agent answers with `uploadstart` (prime pipe) and then `uploadack` messages; after each ack call `p13uploadNextPart`.
5. Chunking rules:
   - Use 64 KB slices over websocket (16 KB if WebRTC).
   - If the slice’s first byte is `0x00` or `0x7B` (`'{'`), prepend a single zero byte to prevent JSON confusion.
   - Track offsets so resumed uploads can skip already transferred bytes.
6. When the agent detects an existing file of the same size:
   - Browser computes SHA‑384 (`performHashOnFile`) and sends `{action:'uploadhash', path, name, tag:{h:HASH, s:existingSize, skip:true/false}}`.
   - Agent replies with its hash; if identical and `skip:true`, move to the next file; if identical but sizes differ, resend `upload` with `append:true` starting at `tag.s`.
7. Completion: server emits `uploaddone` → advance to next file; when all files finish, dismiss the dialog and refresh the directory (`{action:'ls'}` or `p13folderup(9999)`).

Cancel uploads by sending `{action:'uploadcancel', reqid}`.

---

## 7. Data Flow Recap

```
React UI
  ├─ control.ashx WS  ── authenticate, request metadata, receive events, send {action:'msg', type:'tunnel'}
  └─ meshrelay.ashx WS ── per-node protocol 5 session
        ├─ JSON commands: ls/mkdir/rm/zip/unzip/download/upload/...
        ├─ Binary stream: download + upload chunks
        └─ Control channel 102938: ping/pong, RTT, WebRTC signaling, console messages
```

Typical sequence when opening a node’s file explorer:
1. User selects node.
2. UI calls `connectFiles(nodeId, mode, consent)`.
3. Control socket sends `{action:'msg', type:'tunnel', usage:5, ...}`; relay opens.
4. Relay socket receives `'c'`; UI sends `files.socket.send('5')`.
5. UI issues `{action:'ls'}` for the last visited path (restored from storage).
6. User actions generate further commands; server responses update UI state.

---

## 8. React Implementation Tips

1. **State machine parity**: mirror `onFilesStateChange` to reset UI on disconnect and to restore folder paths when state hits 3.
2. **Token hygiene**: treat `authCookie` and `authRelayCookie` as secrets. Never expose them to third-party origins.
3. **Event-driven refresh**: respond to `event.action == 'updatefiles'` by re-requesting the server file tree.
4. **Clipboard operations**: replicate `p13copyFile`, `p13pasteFile`, and the associated status banner for user feedback.
5. **Uploads**: keep a dedicated transfer state (current file, offset, FileReader handle) so transfers survive UI re-renders.
6. **Downloads**: support both relay streaming (for inline viewers) and direct `devicefile.ashx` links (for large files).
7. **Fallbacks**: expose SFTP mode (relay URL `sshfilesrelay.ashx`) for environments where MeshAgent isn’t available.
8. **WebRTC**: enable only when the browser supports `RTCPeerConnection`; the code must still function over pure websocket paths.

---

## 9. Reference Source Files

Consult the existing MeshCentral implementation for exact message shapes and edge cases:

| File | Purpose |
| --- | --- |
| `public/scripts/meshcentral.js` | Control-channel client (`MeshServerCreateControl`). |
| `public/scripts/agent-redir-ws-0.1.1.js` | Relay client (`CreateAgentRedirect`). |
| `views/default.handlebars` (section `p13*`) | Browser UI logic for Files. |
| `meshuser.js` | Server-side handlers for `{action:'files'}` and `{action:'fileoperation'}`. |
| `meshrelay.js` | Relay orchestration, protocol routing, consent handling. |
| `meshdevicefile.js` | HTTP download relay used by `devicefile.ashx`. |

Use this guide alongside the reference code to build a fully compatible React frontend that communicates exclusively with MeshCentral’s existing backend endpoints.
## MeshCentral Files Frontend Guide

This document summarizes how the existing MeshCentral web client implements the Files feature so you can recreate the same behavior in a separate React application. The goal is to reuse the MeshCentral backend (`control.ashx`, `meshrelay.ashx`, `devicefile.ashx`) without depending on the stock UI.

---

### 1. Control Channel (`control.ashx`)

1. **WebSocket bootstrap**
   - URL: `ws(s)://<host>/<domain>/control.ashx` (append `?key=...` when needed).
   - If you already hold an auth cookie, add `?moreargs=1` and immediately send `{action:'urlargs', args:{auth:<authCookie>}}`.
   - Keep the socket alive by sending `{action:'ping'}` every 29 seconds (`MeshServerCreateControl` does this, see `public/scripts/meshcentral.js`).
2. **Initial data pulls** (trigger on state `==2`):
   - `usergroups`, `meshes`, `nodes`, `loginTokens`, and the Files tree via `{action:'files'}` (see `views/default.handlebars`).
3. **Cookie refresh**:
   - Every 30 minutes send `{action:'authcookie'}`; the response carries both `cookie` and `rcookie`. Update your stored `authCookie` and `authRelayCookie`.
4. **Events**
   - Listen for `event` payloads. When the server emits `updatefiles` you must re-request `{action:'files'}` to refresh the server-side tree.

---

### 2. Server-hosted “My Files”

The control channel replies to `{action:'files'}` with a nested `filetree` describing:

- Root (`filetree.f`), containing user roots (`t:1`, “My Files”) and mesh roots (`t:4`, “Group Files”), each with quota metadata (`maxbytes`), recursive folders (`t:2`) and files (`t:3`).
- Each entry has:
  - `n`: display name.
  - `nx`: stable key (URL-safe, used for lookups).
  - `s`: file size.
  - `d`: timestamp (`Date.getTime()` or seconds).
  - `f`: child collection for folders.

To modify server files, reuse the `fileoperation` commands handled in `meshuser.js`:

| Operation      | Payload fields                                                        | Notes                                 |
|----------------|----------------------------------------------------------------------|---------------------------------------|
| `createfolder` | `path` (array of segments), `newfolder`                              | Creates folder, auto-creates parents. |
| `delete`       | `path`, `delfiles` (array), `rec` (bool)                             | Deletes file or folder.               |
| `rename`       | `path`, `oldname`, `newname`                                         | Simple rename.                        |
| `copy/move`    | `scpath`, `path`, `names`, `fileop` = `copy` or `move`               | Moves between roots if allowed.       |
| `get`          | `path`, `file`, `tag`                                                | Returns `{action:'fileoperation', data:<base64>}` (≤200 KB). |
| `set`          | `path`, `file`, `data` (base64)                                      | Writes small files and fires `updatefiles`. |

When a change completes the server emits `updatefiles` to that user so all tabs can refresh.

---

### 3. Device Files Session via `meshrelay.ashx` (Protocol 5)

MeshCentral uses a generic “agent redirect” helper for interactive features (Terminal, Desktop, Files). To reproduce the Files workflow:

1. **Create the module stub** (`CreateRemoteFiles`): an object with `protocol = 5` and a `ProcessData(data)` method to handle incoming JSON (see `views/default.handlebars`, `CreateRemoteFiles()`).
2. **Instantiate `CreateAgentRedirect`** with `(meshserverControl, module, serverPublicNamePort, authCookie, authRelayCookie, domainUrl)`. This helper:
   - Generates a tunnel ID.
   - Opens `wss://<host>/<domain>/meshrelay.ashx?browser=1&p=5&nodeid=<id>&id=<tunnel>&auth=<authCookie>`.
   - Tells the control channel to relay by sending `{action:'msg', type:'tunnel', nodeid, value:'*/<domain>meshrelay.ashx?...&rauth=<authRelay>}`, `usage:5`.
3. **meshrelay handshake** (`meshrelay.js`):
   - The server waits for the agent connection, ensures the same user/rights, then forwards traffic between browser socket and agent socket.
   - When both ends link, the server sends `'c'` or `'cr'` (recording). The browser:
     - Optionally sends session options (`{ctrlChannel:'102938', type:'options', consent...}`).
     - Sends a single character containing the protocol number (`"5"`) to confirm the Files channel.
     - Switches state to `3` (Ready). Optional WebRTC upgrade is negotiated over the same control channel (`type:'webrtc*'` messages).

**Key meshrelay parameters** (see comments at top of `meshrelay.js`):

| `p` value | Feature   |
|-----------|-----------|
| `1`       | Terminal  |
| `2`       | Desktop   |
| `5`       | Files     |
| `10–14`   | Web RDP/SSH/VNC/TCP |

---

### 4. Files Protocol over the Tunnel

All commands are UTF-8 JSON strings (prefixed with `'~'` for multiplexed interfaces) unless binary data is required, in which case the browser prepends a `0x00` byte to avoid ambiguity with `'{'` (see `p13uploadNextPart`).

#### Core commands (browser ➜ agent)

| Command      | Example payload                                                                                 |
|--------------|--------------------------------------------------------------------------------------------------|
| List         | `{action:'ls', reqid:1, path:'/Users/Public'}`                                                   |
| Make dir     | `{action:'mkdir', reqid:1, path:'/Users/Public/NewFolder'}`                                      |
| Delete       | `{action:'rm', reqid:1, path:'/Users/Public', delfiles:['test.txt'], rec:false}`                 |
| Rename       | `{action:'rename', path:'/Users/Public', oldname:'old.txt', newname:'new.txt'}`                  |
| Zip/Unzip    | `{action:'zip', path:'/Users/Public', files:['a.txt'], output:'archive.zip'}` / `{action:'unzip', input:'C:\\Temp\\data.zip', dest:'C:\\Temp\\out'}` |
| Copy/Move    | `{action:'copy', reqid:1, scpath:'C:\\Src', dspath:'C:\\Dst', names:['file.txt']}`               |
| Download     | `{action:'download', sub:'start', id:<rand>, path:'C:\\Logs\\x.txt'}`                            |
| Upload       | `{action:'upload', reqid:i, path:'C:\\Temp', name:'file.bin', size:1234, append?:true}`          |
| Find file    | `{action:'findfile', reqid:<dialogId>, path:'C:\\', filter:'*.log'}`                             |
| SSH auth     | `{action:'sshauth', username:'user', password:'pass', keep:0}` (only when using `sshfilesrelay`).|

#### Agent ➜ browser responses

- Directory listing: `{path:'C:\\', dir:[{n:'Program Files', t:2}, {n:'file.txt', t:3, s:1024, d:...}]}`.
- `dialogmessage`: notifies the UI about long operations (`'zipping'`, `'unzipping'`, `'zippingFile'`, `'unziperror'`).
- `download`: control flow (`sub:'start'/'cancel'`). Binary chunks follow as raw `ArrayBuffer`s whose first 4 bytes (`ReadInt`) contain flags (`bit 0 == 1` indicates final chunk).
- `upload*`: progress (`uploadstart`, `uploadack`, `uploaddone`, `uploadhash`, `uploaderror`).
- SSH prompts: `{action:'sshauth'}`, `{action:'autherror'}`, etc.

Refer to `p13gotFiles`, `p13gotDownloadCommand`, `p13gotDownloadBinaryData`, `p13gotUploadData` in `views/default.handlebars` for exact handling.

---

### 5. Direct HTTP download relay (`devicefile.ashx`)

For large downloads or shareable URLs:

1. Build `devicefile.ashx?c=<authCookie>&m=<meshShortId>&n=<nodeShortId>&f=<encodedRelativePath>`.
2. The server enqueues a relay session (`meshdevicefile.js`). If no agent is present, the request blocks until the tunnel forms.
3. The relay logic reuses the same `tunnel` command flow: browser connects via HTTP, server tells the agent to connect to `*/devicefile.ashx?id=<session>&rauth=<rcookie>`, and the agent streams bytes directly to the HTTP response.

This path requires the same `authCookie` and `authRelayCookie` management as the WebSocket tunnel.

---

### 6. React Implementation Checklist

1. **Control client**
   - Re-implement `MeshServerCreateControl` (or import it) to manage the `control.ashx` WebSocket, message dispatch, and heartbeats.
   - Mirror the server’s state machine (`State 0=disconnected, 1=connecting, 2=connected, 3=active`).
2. **Data stores**
   - File tree structure for server storage (`filetree`).
   - Per-device Files session state: `filetree`, `currentPath`, clipboard buffer, transfer queues.
   - Persist recently visited paths using `localStorage` or your own store (MeshCentral uses `_devFilePaths`).
3. **Session launcher**
   - Provide a hook/helper that accepts `nodeId`, obtains `authCookie`/`authRelayCookie`, instantiates `CreateAgentRedirect`, and exposes `sendText`, `send`, `Stop`.
4. **UI controllers**
   - Translate interactions (select, delete, upload, download) into the JSON commands above.
   - Watch for `dialogmessage` actions to show progress modals.
   - Handle both agent (`meshrelay.ashx`) and SFTP (`sshfilesrelay.ashx`) modes. When `contype==2`, expect `sshauth` prompts and drive the SSH credential exchange as shown in `p13sshConnectEx`.
5. **Binary transfers**
   - Chunk uploads at 16 KB (WebRTC) or 64 KB (WebSocket) respecting the zero-byte prefix rule.
   - Download viewer mode: collect chunks until `ReadInt(chunk, 0) & 1` is set, then decode (UTF‑8 or raw) into the editor. Non-viewer mode: convert the concatenated binary string to a Blob and trigger `saveAs`.
6. **Security**
   - Treat `authCookie`/`authRelayCookie` like bearer tokens; refresh them periodically and drop tunnels when the control channel closes.
   - Enforce user permissions client-side only for UX (server already enforces rights).

---

### 7. Reference Files

| Area                       | Key files                                                |
|----------------------------|----------------------------------------------------------|
| Control channel client     | `public/scripts/meshcentral.js`                          |
| Stock UI logic             | `views/default.handlebars` (functions `p13*`, `p5*`)     |
| Agent redirect helper      | `public/scripts/agent-redir-ws-0.1.1.js`                 |
| Relay backend              | `meshrelay.js`, `meshdevicefile.js`                      |
| Server file ops            | `meshuser.js` (`case 'fileoperation'`, `updateUserFiles`)|

Use these as canonical references while porting functionality into your React application.

