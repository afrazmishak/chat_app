import { useEffect, useRef } from "react";

function useChatSocket({ currentRoom, username, socketRef, setStatus, handleIncomingMessage, }) {
    const messageHandlerRef = useRef(handleIncomingMessage);

    useEffect(() => {
        messageHandlerRef.current = handleIncomingMessage;

    }, [handleIncomingMessage]);

    useEffect(() => {
        const token = localStorage.getItem("chat_token");

        if (!token || !currentRoom || !username) {
            return;
        }

        let heartbeatInterval;

        const wsUrl =
            `ws://127.0.0.1:8000/ws/${currentRoom}/${username}?token=${token}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        setStatus("Connecting...");

        socket.onopen = () => {
            setStatus("Connected");

            heartbeatInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(
                        JSON.stringify({
                            type: "heartbeat",
                        })
                    );
                }
            }, 5000);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "heartbeat_ack") {
                    return;
                }

                messageHandlerRef.current(data);
            } catch (error) {
                console.error("Invalid WebSocket message", error);
            }
        };

        socket.onerror = () => {
            if (socketRef.current === socket) {
                setStatus("Error");
            }
        };

        socket.onclose = () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }

            if (socketRef.current === socket) {
                setStatus("Closed");
                socketRef.current = null;
            }
        };

        return () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }

            if (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            ) {
                socket.close();
            }
        };
    }, [currentRoom, username, socketRef, setStatus]);
}

export default useChatSocket;