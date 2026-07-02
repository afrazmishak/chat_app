import { useEffect } from "react";

function usePrivateHistory(
    user,
    selectedPrivateUser,
    setPrivateMessages
) {
    useEffect(() => {
        async function loadPrivateHistory() {
            if (!selectedPrivateUser) return;

            const token = localStorage.getItem("chat_token");

            const response = await fetch(
                `http://127.0.0.1:8000/private/${user.username}/${selectedPrivateUser}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                alert("Session expired. Please login again.");
                localStorage.removeItem("chat_user");
                localStorage.removeItem("chat_token");
                window.location.reload();
                return;
            }

            const history = await response.json();

            setPrivateMessages((prev) => ({
                ...prev,
                [selectedPrivateUser]: history,
            }));
        }

        loadPrivateHistory();
    }, [selectedPrivateUser, user.username, setPrivateMessages]);
}

export default usePrivateHistory;