import { useEffect } from "react";

function usePrivateConversations(user, setPrivateConversations) {
  useEffect(() => {
    async function loadPrivateConversations() {
      const token = localStorage.getItem("chat_token");

      const response = await fetch(
        `http://127.0.0.1:8000/users/${user.username}/private-conversations`,
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

      const conversations = await response.json();
      setPrivateConversations(conversations);
    }

    loadPrivateConversations();
  }, [user.username, setPrivateConversations]);
}

export default usePrivateConversations;