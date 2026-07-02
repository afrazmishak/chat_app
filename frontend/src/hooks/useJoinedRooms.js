import { useEffect } from "react";

function useJoinedRooms(user, setJoinedRooms) {
    useEffect(() => {
        async function loadUserRooms() {
            const token = localStorage.getItem("chat_token");

            const response = await fetch(
                `http://127.0.0.1:8000/users/${user.username}/rooms`,
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

            const rooms = await response.json();

            if (rooms.length > 0) {
                setJoinedRooms((prev) =>
                    Array.from(new Set([...prev, ...rooms]))
                );
            }
        }

        loadUserRooms();
    }, [user.username, setJoinedRooms]);
}

export default useJoinedRooms;