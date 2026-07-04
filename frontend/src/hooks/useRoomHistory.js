import { useEffect } from "react";
import { handleSessionExpired } from "../utils/auth";

function useRoomHistory(currentRoom, setMessages, socketRef, username) {
    useEffect(() => {
        async function loadRoomHistory() {
            const token = localStorage.getItem("chat_token");

            const response = await fetch(
                `http://127.0.0.1:8000/rooms/${currentRoom}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                handleSessionExpired();
                return;
            }

            const history = await response.json();

            setMessages((prev) => ({
                ...prev,
                [currentRoom]: history,
            }));

            history.forEach((message) => {
                if (
                    message.type === "room_message" &&
                    message.username !== username &&
                    socketRef.current &&
                    socketRef.current.readyState === WebSocket.OPEN
                ) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "message_seen",
                            message_id: message.id,
                        })
                    );
                }
            });
        }

        loadRoomHistory();
    }, [currentRoom, setMessages, socketRef, username]);
}

export default useRoomHistory;