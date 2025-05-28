class RemoteDesktopClient {
    constructor(canvasElement, options = {}) {
        // Core properties
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.state = 'disconnected'; // disconnected, connecting, connected

        // Configuration
        this.config = {
            imageType: options.imageType || 'jpeg', // jpeg, png, webp
            compressionLevel: options.compressionLevel || 50,
            scalingLevel: options.scalingLevel || 1024,
            frameRateTimer: options.frameRateTimer || 100,
            swapMouseButtons: options.swapMouseButtons || false,
            reverseMouseWheel: options.reverseMouseWheel || false,
            enableTouch: options.enableTouch || true,
            debugMode: options.debugMode || 0
        };

        // Screen properties
        this.screenWidth = 0;
        this.screenHeight = 0;
        this.rotation = 0;

        // Input handling
        this.inputGrabbed = false;
        this.pressedKeys = [];
        this.touchArray = {};
        this.touchTimer = null;
        this.stopInput = false;

        // Drawing state
        this.tilesReceived = 0;
        this.tilesDrawn = 0;
        this.pendingOperations = [];
        this.killDraw = 0;

        // Connection
        this.websocket = null;
        this.sessionId = 0;

        // Event callbacks
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onScreenResize: null,
            onMessage: null,
            onError: null
        };

        // Initialize
        this.init();
    }

    init() {
        this.setupEventHandlers();
        this.canvas.style.cursor = 'default';
        this.canvas.tabIndex = 1; // Make canvas focusable
    }

    // Message processing - точно как в оригинале
    processMessage(data) {
        if (!(data instanceof ArrayBuffer)) {
            return;
        }

        const view = new Uint8Array(data);
        if (view.length < 4) return;

        const cmd = (view[0] << 8) | view[1];
        const cmdSize = (view[2] << 8) | view[3];

        if (this.config.debugMode > 1) {
            this.log('Received command:', cmd, 'size:', cmdSize);
        }

        this.processBinaryCommand(cmd, cmdSize, view);
    }

    processBinaryCommand(cmd, cmdSize, view) {
        let x, y;
        if ([3, 4, 7].includes(cmd)) {
            x = (view[4] << 8) | view[5];
            y = (view[6] << 8) | view[7];
        }

        switch (cmd) {
            case 3: // Tile/Image data
                this.processTile(view.slice(4), x, y);
                break;

            case 7: // Screen size change
                this.processScreenResize(x, y);
                break;

            case 11: // Display information
                this.processDisplayInfo(view);
                break;

            case 14: // Touch enabled
                this.touchEnabled = true;
                this.touchArray = {};
                break;

            case 15: // Touch reset
                this.touchArray = {};
                break;

            case 17: // Message
                const message = this.arrayBufferToString(view.slice(4));
                this.log('Received message:', message);
                if (this.callbacks.onMessage) this.callbacks.onMessage(message);
                break;

            case 65: // Alert
                const alert = this.arrayBufferToString(view.slice(4));
                this.log('Alert:', alert);
                break;

            case 88: // Mouse cursor change
                this.processMouseCursor(view[4]);
                break;

            default:
                this.log('Unknown command:', cmd);
        }
    }

    processTile(data, x, y) {
        const tile = new Image();
        tile.xcount = this.tilesReceived++;
        
        // Точно как в оригинале MeshCentral - обрабатываем данные после заголовка
        const tdata = data.slice(4);
        let ptr = 0;
        const strs = [];
        
        // String.fromCharCode.apply() can't handle very large argument count, so we have to split like this.
        while ((tdata.byteLength - ptr) > 50000) { 
            strs.push(String.fromCharCode.apply(null, tdata.slice(ptr, ptr + 50000))); 
            ptr += 50000; 
        }
        
        if (ptr > 0) { 
            strs.push(String.fromCharCode.apply(null, tdata.slice(ptr))); 
        } else { 
            strs.push(String.fromCharCode.apply(null, tdata)); 
        }
        
        tile.src = 'data:image/jpeg;base64,' + btoa(strs.join(''));

        if (this.config.debugMode > 1) {
            this.log(`Loading tile at (${x}, ${y}), data length: ${data.length}`);
        }

        tile.onload = () => {
            this.log("Try to load tile");
            // if (this.state === 'connected') {
                this.ctx.drawImage(tile, x, y);
                this.tilesDrawn++;
                if (this.config.debugMode > 0) {
                    this.log(`ile drawn at (${x}, ${y}) size: ${tile.width}x${tile.height}`);
                // }
            }
        };

        tile.onerror = () => {
            if (this.config.debugMode > 0) {
                this.log(` Failed to load tile at (${x}, ${y})`);
            }
        };
    }

    processScreenResize(width, height) {
        if (this.screenWidth === width && this.screenHeight === height) return;

        this.screenWidth = width;
        this.screenHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;

        this.clearCanvas();
        this.sendCompressionSettings();
        this.sendUnpause();

        if (this.callbacks.onScreenResize) {
            this.callbacks.onScreenResize(width, height);
        }

        this.log(`Screen resized to ${width}x${height}`);
    }

    processDisplayInfo(view) {
        // Process display information if needed
        this.log('Display info received');
    }

    processMouseCursor(cursorType) {
        const cursors = [
            'default', 'progress', 'crosshair', 'pointer', 'help',
            'text', 'no-drop', 'move', 'nesw-resize', 'ns-resize',
            'nwse-resize', 'w-resize', 'alias', 'wait', 'none',
            'not-allowed', 'col-resize', 'row-resize', 'copy',
            'zoom-in', 'zoom-out'
        ];

        if (cursorType < cursors.length) {
            this.canvas.style.cursor = cursors[cursorType];
        }
    }

    // Input handling
    setupEventHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleMouseDblClick(e));

        // Touch events
        if (this.config.enableTouch) {
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        }

        // Keyboard events
        this.canvas.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.canvas.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('keypress', (e) => this.handleKeyPress(e));

        // Focus events
        this.canvas.addEventListener('focus', () => this.grabInput());
        this.canvas.addEventListener('blur', () => this.releaseInput());
    }

    grabInput() {
        if (this.inputGrabbed || this.state !== 'connected') return;
        this.inputGrabbed = true;
        this.canvas.focus();
        this.log('Input grabbed');
    }

    releaseInput() {
        if (!this.inputGrabbed) return;
        this.inputGrabbed = false;
        this.releaseAllKeys();
        this.log('Input released');
    }

    handleMouseDown(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendMouseMessage('down', e);
    }

    handleMouseUp(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendMouseMessage('up', e);
    }

    handleMouseMove(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        this.sendMouseMessage('move', e);
    }

    handleMouseWheel(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendMouseMessage('scroll', e);
    }

    handleMouseDblClick(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendMouseMessage('dblclick', e);
    }

    handleKeyDown(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendKeyMessage('down', e);
    }

    handleKeyUp(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        this.sendKeyMessage('up', e);
    }

    handleKeyPress(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
    }

    // Touch handling
    handleTouchStart(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
        // Implement touch handling
    }

    handleTouchMove(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (!this.inputGrabbed || this.stopInput) return;
        e.preventDefault();
    }

    // Send messages to server
    sendMessage(data) {
        if (this.state !== 'connected' || !this.websocket) return;

        if (typeof data === 'string') {
            const buffer = new TextEncoder().encode(data);
            this.websocket.send(buffer);
        } else {
            this.websocket.send(data);
        }
    }

    sendMouseMessage(action, event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = Math.floor((event.clientX - rect.left) * scaleX);
        const y = Math.floor((event.clientY - rect.top) * scaleY);

        let button = 0;
        let delta = 0;

        if (action === 'down' || action === 'up') {
            switch (event.button) {
                case 0: button = 0x02; break; // Left
                case 1: button = 0x20; break; // Middle
                case 2: button = 0x08; break; // Right
            }

            if (this.config.swapMouseButtons && (button === 0x02 || button === 0x08)) {
                button = button === 0x02 ? 0x08 : 0x02;
            }
        } else if (action === 'scroll') {
            delta = event.deltaY;
            if (this.config.reverseMouseWheel) delta = -delta;
        }

        // Create mouse message based on action
        let message;
        if (action === 'dblclick') {
            message = new Uint8Array([0x00, 0x02, 0x00, 0x0A, 0x00, 0x88,
                                    (x >> 8) & 0xFF, x & 0xFF,
                                    (y >> 8) & 0xFF, y & 0xFF]);
        } else if (action === 'scroll') {
            const deltaHigh = (Math.abs(delta) >> 8) & 0xFF;
            const deltaLow = Math.abs(delta) & 0xFF;
            message = new Uint8Array([0x00, 0x02, 0x00, 0x0C, 0x00, 0x00,
                                    (x >> 8) & 0xFF, x & 0xFF,
                                    (y >> 8) & 0xFF, y & 0xFF,
                                    deltaHigh, deltaLow]);
        } else {
            const buttonState = action === 'down' ? button : (button * 2) & 0xFF;
            message = new Uint8Array([0x00, 0x02, 0x00, 0x0A, 0x00, buttonState,
                                    (x >> 8) & 0xFF, x & 0xFF,
                                    (y >> 8) & 0xFF, y & 0xFF]);
        }

        this.sendMessage(message);
    }

    sendKeyMessage(action, event) {
        const keyCode = this.getKeyCode(event);
        if (!keyCode) return;

        if (action === 'down') {
            if (!this.pressedKeys.includes(keyCode)) {
                this.pressedKeys.push(keyCode);
            }
        } else if (action === 'up') {
            const index = this.pressedKeys.indexOf(keyCode);
            if (index !== -1) {
                this.pressedKeys.splice(index, 1);
            }
        }

        const actionCode = action === 'down' ? 0 : 1;
        const message = new Uint8Array([0x00, 0x01, 0x00, 0x06, actionCode, keyCode]);
        this.sendMessage(message);
    }

    getKeyCode(event) {
        // Simplified key code mapping
        const keyMap = {
            'Backspace': 8, 'Tab': 9, 'Enter': 13, 'Shift': 16, 'Control': 17,
            'Alt': 18, 'Pause': 19, 'CapsLock': 20, 'Escape': 27, 'Space': 32,
            'PageUp': 33, 'PageDown': 34, 'End': 35, 'Home': 36,
            'ArrowLeft': 37, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowDown': 40,
            'Insert': 45, 'Delete': 46
        };

        if (keyMap[event.key]) {
            return keyMap[event.key];
        } else if (event.key.length === 1) {
            return event.key.toUpperCase().charCodeAt(0);
        }

        return event.keyCode || event.which;
    }

    releaseAllKeys() {
        const keysToRelease = [...this.pressedKeys];
        keysToRelease.forEach(keyCode => {
            const message = new Uint8Array([0x00, 0x01, 0x00, 0x06, 1, keyCode]);
            this.sendMessage(message);
        });
        this.pressedKeys = [];
    }

    // Control commands
    sendInitialCommands() {
        this.sendCompressionSettings();
        this.sendUnpause();
    }

    sendCompressionSettings() {
        const typeMap = { jpeg: 1, png: 2, tiff: 3, webp: 4 };
        const type = typeMap[this.config.imageType] || 1;

        const message = new Uint8Array([
            0x00, 0x05, 0x00, 0x0A,
            type,
            this.config.compressionLevel,
            (this.config.scalingLevel >> 8) & 0xFF,
            this.config.scalingLevel & 0xFF,
            (this.config.frameRateTimer >> 8) & 0xFF,
            this.config.frameRateTimer & 0xFF
        ]);

        this.sendMessage(message);
    }

    sendUnpause() {
        const message = new Uint8Array([0x00, 0x08, 0x00, 0x05, 0x00]);
        this.sendMessage(message);
    }

    sendPause() {
        const message = new Uint8Array([0x00, 0x08, 0x00, 0x05, 0x01]);
        this.sendMessage(message);
    }

    sendRefresh() {
        const message = new Uint8Array([0x00, 0x06, 0x00, 0x04]);
        this.sendMessage(message);
    }

    sendCtrlAltDel() {
        const message = new Uint8Array([0x00, 0x0A, 0x00, 0x04]);
        this.sendMessage(message);
    }

    // Utility methods
    clearCanvas() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resetState() {
        this.tilesReceived = 0;
        this.tilesDrawn = 0;
        this.pendingOperations = [];
        this.pressedKeys = [];
        this.touchArray = {};
        if (this.touchTimer) {
            clearInterval(this.touchTimer);
            this.touchTimer = null;
        }
    }

    arrayBufferToString(buffer) {
        return new TextDecoder().decode(buffer);
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    log(...args) {
        if (this.config.debugMode > 0) {
            console.log('[RemoteDesktop]', ...args);
        }
    }

    // Public API methods
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
        }
    }

    setConfig(options) {
        Object.assign(this.config, options);
    }

    getState() {
        return this.state;
    }

    getScreenSize() {
        return { width: this.screenWidth, height: this.screenHeight };
    }

    isInputGrabbed() {
        return this.inputGrabbed;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RemoteDesktopClient;
} else if (typeof window !== 'undefined') {
    window.RemoteDesktopClient = RemoteDesktopClient;
}