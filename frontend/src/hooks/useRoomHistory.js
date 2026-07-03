import { useEffect } from "react";
import { handleSessionExpired } from "../utils/auth";

function useRoomHistory(currentRoom, setMessages) {
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
        }

        loadRoomHistory();
    }, [currentRoom, setMessages]);
}

export default useRoomHistory;