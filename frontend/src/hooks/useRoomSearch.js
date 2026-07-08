import { useState } from "react";
import { handleSessionExpired } from "../utils/auth";

function useRoomSearch(currentRoom) {
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    async function searchMessages() {
        if (!searchText.trim()) {
            setSearchResults([]);
            return;
        }

        const token = localStorage.getItem("chat_token");

        const response = await fetch(
            `http://127.0.0.1:8000/rooms/${currentRoom}/search?q=${encodeURIComponent(searchText)}`,
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

        const data = await response.json();
        setSearchResults(data);
    }

    function clearSearch() {
        setSearchText("");
        setSearchResults([]);
    }

    return {
        searchText,
        setSearchText,
        searchResults,
        searchMessages,
        clearSearch,
    };
}

export default useRoomSearch;