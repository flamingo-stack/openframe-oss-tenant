import { ref, watch } from "vue";
import { UseWebSocketReturn, useWebSocket } from "@vueuse/core";
import { getBaseUrl } from "@/boot/axios";
import { useAuthStore } from "@/stores/auth";

export function getWSUrl(path: string, token: string | null) {
    const url = getBaseUrl().split("://")[1];
    const proto = "ws";  // Always use ws in development
    return `${proto}://${url}/ws/${path}/?access_token=${token}`;
}

interface WSReturn {
    action: string;
    data: unknown;
}

let WSConnection: UseWebSocketReturn<string> | undefined = undefined;
export function useDashWSConnection() {
    const auth = useAuthStore();

    if (WSConnection === undefined) {
        const url = getWSUrl("dashinfo", auth.token);
        WSConnection = useWebSocket(url, {
            autoReconnect: true,
        });
    }

    const { status, data, send, open, close } = WSConnection;
    const parsedData = ref<WSReturn>({ action: "", data: {} });

    watch(data, (newValue) => {
        if (newValue) parsedData.value = JSON.parse(newValue);
    });

    function closeConnection() {
        WSConnection = undefined;
        close();
    }

    return {
        status,
        data: parsedData,
        send,
        open,
        close: closeConnection,
    };
}

let WSCliConnection: UseWebSocketReturn<string> | undefined = undefined;
export function useCliWSConnection() {
    const auth = useAuthStore();

    if (WSCliConnection === undefined) {
        const url = getWSUrl("trmmcli", auth.token);
        WSCliConnection = useWebSocket(url);
    }

    const { status, data, send, open, close } = WSCliConnection;
    const parsedData = ref<WSReturn>({ action: "", data: {} });

    watch(data, (newValue) => {
        if (newValue) parsedData.value = JSON.parse(newValue);
    });

    function closeConnection() {
        WSCliConnection = undefined;
        close();
    }

    return {
        status,
        data: parsedData,
        send,
        open,
        close: closeConnection,
    };
}
