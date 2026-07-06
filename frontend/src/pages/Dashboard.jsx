import { useCallback, useRef, useState, useEffect } from "react";
import RoomChat from "../components/RoomChat"
import PrivateChat from "../components/PrivateChat"
import ProfileCard from "../components/ProfileCard";
import useRoomHistory from "../hooks/useRoomHistory";
import useJoinedRooms from "../hooks/useJoinedRooms";
import usePrivateHistory from "../hooks/usePrivateHistory";
import usePrivateConversations from "../hooks/usePrivateConversations";
import useChatSocket from "../hooks/useChatSocket";
import useTypingIndicator from "../hooks/useTypingIndicator";
import { SESSION_TIMEOUT_MINUTES } from "../config";
import useIdleLogout from "../hooks/useIdleLogout";

function Dashboard({ user, setUser }) {
    const defaultRoom = "general";

    const [currentRoom, setCurrentRoom] = useState(defaultRoom);
    const [joinedRooms, setJoinedRooms] = useState([defaultRoom]);
    const [messages, setMessages] = useState({});
    const [users, setUsers] = useState([]);
    const [status, setStatus] = useState("Connecting...");
    const [text, setText] = useState("");
    const [globalUsers, setGlobalUsers] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
    const [privateUnread, setPrivateUnread] = useState({});
    const [privateConversations, setPrivateConversations] = useState([]);

    const selectedPrivateUserRef = useRef(selectedPrivateUser);
    useEffect(() => {
        selectedPrivateUserRef.current = selectedPrivateUser;
    }, [selectedPrivateUser]);

    const socketRef = useRef(null);

    const messagesRef = useRef(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const {
        typingUsers,
        handleTyping,
        sendTyping,
        clearTyping,
    } = useTypingIndicator(socketRef);

    useRoomHistory(currentRoom, setMessages, socketRef, user.username);
    useJoinedRooms(user, setJoinedRooms);
    usePrivateHistory(user, selectedPrivateUser, setPrivateMessages);
    usePrivateConversations(user, setPrivateConversations);

    const handleIncomingMessage = useCallback((data) => {
        console.log("Received:", data);

        if (data.type === "users") {
            setUsers(data.users);

            const roomMessages = messagesRef.current[currentRoom] || [];

            roomMessages.forEach((message) => {
                if (
                    message.type === "room_message" &&
                    message.username !== user.username &&
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
            return;
        }

        if (data.type === "global_users") {
            setGlobalUsers(data.users);
            return;
        }

        if (data.type === "typing") {
            handleTyping(data.username, user.username);
            return;
        }

        if (data.type === "private_message") {
            const otherUser = data.from === user.username ? data.to : data.from;

            setPrivateMessages((prev) => ({
                ...prev,
                [otherUser]: [...(prev[otherUser] || []), data],
            }));

            if (data.from !== user.username && selectedPrivateUserRef.current !== otherUser) {
                setPrivateUnread((prev) => ({
                    ...prev,
                    [otherUser]: (prev[otherUser] || 0) + 1,
                }));
            }

            return;
        }

        if (data.type === "message_seen") {
            setMessages((prev) => ({
                ...prev,
                [currentRoom]: (prev[currentRoom] || []).map((message) => {
                    if (!message) return message;

                    return message.id === data.message_id
                        ? {
                            ...message,
                            seen_by: Array.from(
                                new Set([...(message.seen_by || []), data.username])
                            ),
                        }
                        : message;
                }),
            }));
            return;
        }

        if (data.type === "room_message_edited") {
            setMessages((prev) => ({
                ...prev,
                [currentRoom]: (prev[currentRoom] || []).map((message) =>
                    message.id === data.message_id
                        ? {
                            ...message,
                            text: data.text,
                            edited: true,
                            edited_at: data.edited_at,
                        }
                        : message
                ),
            }));

            return;
        }

        if (data.type === "room_message_deleted") {
            setMessages((prev) => ({
                ...prev,
                [currentRoom]: (prev[currentRoom] || []).map((message) => {
                    if (!message) return message;

                    return message.id === data.message_id
                        ? {
                            ...message,
                            text: "This message was deleted",
                            deleted: true,
                            deleted_at: data.deleted_at,
                        }
                        : message;
                }),
            }));

            return;
        }

        setMessages((prev) => ({
            ...prev,
            [currentRoom]: [...(prev[currentRoom] || []), data],
        }));

        if (data.type === "room_message" && data.username !== user.username) {
            socketRef.current.send(
                JSON.stringify({
                    type: "message_seen",
                    message_id: data.id,
                })
            );
        }
    }, [currentRoom, user.username, handleTyping,]);

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
        clearTyping();
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

    function handleEditMessage(message, newText) {
        socketRef.current.send(
            JSON.stringify({
                type: "edit_room_message",
                message_id: message.id,
                text: newText,
            })
        );
    }

    function handleDeleteMessage(message) {
        const confirmDelete = confirm("Delete this message for everyone?");

        if (!confirmDelete) return;

        socketRef.current.send(
            JSON.stringify({
                type: "delete_room_message",
                message_id: message.id,
            })
        );
    }

    useIdleLogout(SESSION_TIMEOUT_MINUTES);

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
                        sendTyping();
                    }}
                    users={users}
                    status={status}
                    typingUsers={typingUsers}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
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