import { useEffect } from "react";

function useChatSocket({ currentRoom, username, socketRef, setStatus, handleIncomingMessage, }) {
    useEffect(() => {
        let heartbeatInterval;

        const token = localStorage.getItem("chat_token");

        const wsUrl = `ws://127.0.0.1:8000/ws/${currentRoom}/${username}?token=${token}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

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
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        };

        socket.onerror = () => {
            setStatus("Error");
        };

        socket.onclose = () => {
            setStatus("Closed");
        };

        return () => {
            clearInterval(heartbeatInterval);
            socket.close();
        };
    }, [currentRoom, username, socketRef, setStatus, handleIncomingMessage]);
}

export default useChatSocket;