import MessageBubble from "./MessageBubble";

function RoomChat({ user, currentRoom, messages, sendMessage, text, setText, users, status, typingUsers, onEditMessage, onDeleteMessage, onReplyMessage, replyingTo, setReplyingTo, searchText, setSearchText, searchResults, searchMessages, clearSearch, }) {
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

            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "12px",

                }}
            >
                <input 
                    type="text"
                    placeholder="Search messages..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            searchMessages();
                        }
                    }}
                />

                {searchResults.length > 0 && (
                    <div
                        style={{
                            border: "1px solid #ccc",
                            padding: "10px",
                            marginBottom: "15px",
                            maxHeight: "200px",
                            overflowY: "auto",
                        }}
                    >

                        {searchResults.map((result) => (
                            <div
                                key={result.id}
                                onClick={() => {
                                    const element = document.getElementById(`message-${result.id}`);

                                    if (element) {
                                        element.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center"
                                        });
                                    }
                                }}
                                style={{
                                    padding: "8px",
                                    borderBottom: "1px solid #eee",
                                    cursor: "pointer",
                                }}
                            >
                                <strong>{result.username}</strong>

                                <p style={{ margin: "4px 0"}}>
                                    {result.text}
                                </p>

                                <small>{result.time}</small>
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={searchMessages}>
                    Search
                </button>

                <button onClick={clearSearch}>
                    Clear
                </button>
            </div>

            <div style={{ border: "1px solid black", height: "300px", overflowY: "auto" }}>
                {messages.map((message, index) => (
                    <MessageBubble
                        key={index}
                        message={message}
                        currentUsername={user.username}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                        onReplyMessage={onReplyMessage}
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

            {replyingTo && (
                <div style={{ borderLeft: "3px solid gray", paddingLeft: "8px" }}>
                    <small>Rpelying to {replyingTo.username}</small>
                    <p>{replyingTo.text}</p>

                    <button onClick={() => setReplyingTo(null)}>
                        Cancel
                    </button>
                </div>
            )}

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