import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

const resolveHubUrl = () => {
  const configuredBase =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_REALTIME_BASE_URL ||
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_API_BASE_URL ||
    "http://localhost:5207";

  return `${configuredBase.replace(/\/$/, "")}/hubs/realtime`;
};

const createConnection = () => {
  return new HubConnectionBuilder()
    .withUrl(resolveHubUrl(), {
      accessTokenFactory: () => localStorage.getItem("token") || "",
      withCredentials: false,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
};

export const getRealtimeConnection = async () => {
  if (!connection) {
    connection = createConnection();
  }

  if (connection.state === HubConnectionState.Connected) {
    return connection;
  }

  if (!startPromise) {
    startPromise = connection
      .start()
      .then(() => connection as HubConnection)
      .finally(() => {
        startPromise = null;
      });
  }

  return startPromise;
};

export const subscribeRealtimeEvent = async <T,>(
  eventName: string,
  handler: (payload: T) => void,
) => {
  const hub = await getRealtimeConnection();
  hub.off(eventName, handler);
  hub.on(eventName, handler);

  return () => {
    hub.off(eventName, handler);
  };
};

export const joinPostRealtimeGroup = async (postId: number) => {
  if (!postId) return;
  const hub = await getRealtimeConnection();
  await hub.invoke("JoinPostGroup", postId);
};

export const leavePostRealtimeGroup = async (postId: number) => {
  if (!postId) return;
  const hub = await getRealtimeConnection();
  await hub.invoke("LeavePostGroup", postId);
};

export const stopRealtimeConnection = async () => {
  if (!connection) return;

  try {
    await connection.stop();
  } catch {
    // ignore
  } finally {
    connection = null;
    startPromise = null;
  }
};
