import { useCallback, useRef, useState } from "react";

function useTypingIndicator(socketRef) {
  const [typingUsers, setTypingUsers] = useState([]);
  const lastTypingRef = useRef(0);

  const handleTyping = useCallback((username, currentUsername) => {
    if (username === currentUsername) return;

    setTypingUsers((prev) =>
      prev.includes(username) ? prev : [...prev, username]
    );

    setTimeout(() => {
      setTypingUsers((prev) =>
        prev.filter((name) => name !== username)
      );
    }, 1500);
  }, []);

  const sendTyping = useCallback(() => {
    const now = Date.now();

    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      now - lastTypingRef.current > 1000
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
        })
      );

      lastTypingRef.current = now;
    }
  }, [socketRef]);

  function clearTyping() {
    setTypingUsers([]);
  }

  return {
    typingUsers,
    handleTyping,
    sendTyping,
    clearTyping,
  };
}

export default useTypingIndicator;