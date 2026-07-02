import { useCallback, useRef, useState } from "react";
import RoomChat from "../components/RoomChat"
import PrivateChat from "../components/PrivateChat"
import ProfileCard from "../components/ProfileCard";
import useRoomHistory from "../hooks/useRoomHistory";
import useJoinedRooms from "../hooks/useJoinedRooms";
import usePrivateHistory from "../hooks/usePrivateHistory";
import usePrivateConversations from "../hooks/usePrivateConversations";
import useChatSocket from "../hooks/useChatSocket";

function Dashboard({ user, setUser }) {
    const defaultRoom = "general";

    const [currentRoom, setCurrentRoom] = useState(defaultRoom);
    const [joinedRooms, setJoinedRooms] = useState([defaultRoom]);
    const [messages, setMessages] = useState({});
    const [users, setUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [status, setStatus] = useState("Connecting...");
    const [text, setText] = useState("");
    const [globalUsers, setGlobalUsers] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
    const [privateUnread, setPrivateUnread] = useState({});
    const [privateConversations, setPrivateConversations] = useState([]);
    const lastTypingRef = useRef(0);

    const socketRef = useRef(null);

    useRoomHistory(currentRoom, setMessages);
    useJoinedRooms(user, setJoinedRooms);
    usePrivateHistory(user, selectedPrivateUser, setPrivateMessages);
    usePrivateConversations(user, setPrivateConversations);

    const handleIncomingMessage = useCallback((data) => {
        console.log("Received:", data);

        if (data.type === "users") {
            setUsers(data.users);
            return;
        }

        if (data.type === "global_users") {
            setGlobalUsers(data.users);
            return;
        }

        if (data.type === "typing") {
            if (data.username !== user.username) {
                setTypingUsers((prev) =>
                    prev.includes(data.username) ? prev : [...prev, data.username]
                );

                setTimeout(() => {
                    setTypingUsers((prev) =>
                        prev.filter((name) => name !== data.username)
                    );
                }, 1500);
            }

            return;
        }

        if (data.type === "private_message") {
            const otherUser = data.from === user.username ? data.to : data.from;

            setPrivateMessages((prev) => ({
                ...prev,
                [otherUser]: [...(prev[otherUser] || []), data],
            }));

            if (data.from !== user.username && selectedPrivateUser !== otherUser) {
                setPrivateUnread((prev) => ({
                    ...prev,
                    [otherUser]: (prev[otherUser] || 0) + 1,
                }));
            }

            return;
        }

        setMessages((prev) => ({
            ...prev,
            [currentRoom]: [...(prev[currentRoom] || []), data],
        }));
    }, [currentRoom, user.username, selectedPrivateUser]);

    useChatSocket({
        currentRoom,
        username: user.username,
        socketRef,
        setStatus,
        handleIncomingMessage,
    });

    function switchRoom(roomName) {
        const cleanRoom = roomName.trim();

        if (!cleanRoom) return;

        setCurrentRoom(cleanRoom);

        if (!joinedRooms.includes(cleanRoom)) {
            setJoinedRooms([...joinedRooms, cleanRoom]);
        }
    }

    function sendMessage() {
        if (!text.trim()) return;

        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            alert(`Chat is not connected. Current status: ${status}`);
            return;
        }

        console.log("Sending typing event")

        socketRef.current.send(
            JSON.stringify({
                type: "room_message",
                text: text,
            })
        );

        setText("");
        setTypingUsers([])
    }

    function sendPrivateMessage(to, privateText) {
        if (!privateText.trim()) return;

        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            alert(`Chat is not connected. Current status: ${status}`);
            return;
        }

        socketRef.current.send(
            JSON.stringify({
                type: "private_message",
                to: to,
                text: privateText
            })
        )
    }

    function openPrivateChat(username) {
        setSelectedPrivateUser(username);

        setPrivateUnread((prev) => ({
            ...prev,
            [username]: 0,
        }));
    }

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <h2>Chat App</h2>

                <div className="user-card">
                    <strong>{user.username}</strong>
                    <p>Current Room: {currentRoom}</p>
                </div>

                <ProfileCard />

                <input
                    placeholder="Room Name"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            switchRoom(e.target.value);
                            e.target.value = "";
                        }
                    }}
                />

                <h3>Joined Rooms</h3>

                {joinedRooms.map((room) => (
                    <button
                        key={room}
                        onClick={() => switchRoom(room)}
                        className={room === currentRoom ? "active-room" : "room-button"}
                    >
                        {room}
                    </button>
                ))}

                <button
                    onClick={() => {
                        setUser(null);
                    }}>
                    Logout
                </button>
            </aside>

            <main className="main-chat">
                <RoomChat
                    user={user}
                    currentRoom={currentRoom}
                    messages={messages[currentRoom] || []}
                    sendMessage={sendMessage}
                    text={text}
                    setText={(value) => {
                        setText(value);

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
                    }}
                    users={users}
                    status={status}
                    typingUsers={typingUsers}
                />
            </main>

            <aside className="private-panel">
                <PrivateChat
                    globalUsers={globalUsers}
                    currentUsername={user.username}
                    privateMessages={privateMessages}
                    sendPrivateMessage={sendPrivateMessage}
                    selectedPrivateUser={selectedPrivateUser}
                    openPrivateChat={openPrivateChat}
                    privateUnread={privateUnread}
                    privateConversations={privateConversations}
                />
            </aside>
        </div>
    )
}

export default Dashboard;