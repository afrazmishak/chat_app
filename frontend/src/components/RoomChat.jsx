import MessageBubble from "./MessageBubble";

function RoomChat({ user, currentRoom, messages, sendMessage, text, setText, users, status, typingUsers, onEditMessage, onDeleteMessage }) {
    return (
        <>
            <div className="room-header">
                <div>
                    <h2>Room: {currentRoom}</h2>
                    <p>{users.length} member(s) online</p>
                    <small>Status: {status}</small>
                </div>
            </div>

            <div>
                <h3>Online Users</h3>

                {users.map((onlineUser, index) => (
                    <p key={index}>• {onlineUser}</p>
                ))}
            </div>

            <div style={{ border: "1px solid black", height: "300px", overflowY: "auto" }}>
                {messages.map((message, index) => (
                    <MessageBubble
                        key={index}
                        message={message}
                        currentUsername={user.username}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                    />
                ))}
            </div>


            {typingUsers.length > 0 && (
                <div className="typing-indicator">
                    {typingUsers.join(", ")}
                    {typingUsers.length === 1
                        ? " is typing..."
                        : " are typing..."}
                </div>
            )}

            <br />

            <input
                placeholder="Type message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                }}
            />

            <button onClick={sendMessage}>Send</button>
        </>
    );
}

export default RoomChat;