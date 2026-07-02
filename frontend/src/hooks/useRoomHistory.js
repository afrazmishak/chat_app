import { useEffect } from "react";

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
                alert("Session expired. Please login again");
                localStorage.removeItem("chat_user");
                localStorage.removeItem("chat_token");
                window.location.reload();
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