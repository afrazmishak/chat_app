import { useState } from "react";

function MessageBubble({ message, currentUsername, onEditMessage, onDeleteMessage, onReplyMessage }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  if (message.type === "system") {
    return (
      <p style={{ textAlign: "center", color: "gray" }}>
        {message.text}
      </p>
    );
  }
  const isMine = message.username === currentUsername;

  return (
    <div
      id={`message-${message.id}`}
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: "10px",
      }}
    >
      <div
        style={{
          border: "1px solid black",
          borderRadius: "10px",
          padding: "8px",
          maxWidth: "60%",
        }}
      >
        {!isMine && <strong>{message.username}</strong>}

        {message.reply_preview && (
          <div
          onClick={() => {
            const element = document.getElementById(
              `message-${message.reply_to}`
            );

            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }}
            style={{
              borderLeft: "3px solid gray",
              paddingLeft: "8px",
              marginBottom: "6px",
              opacity: 0.8,
              cursor: "pointer"
            }}
          >
            <small>{message.reply_preview.username}</small>
            <p style={{ margin: 0}}>
              {message.reply_preview.text}
            </p>
          </div>
        )}

        {message.deleted ? (
          <p>
            <i>This message was deleted</i>
          </p>
        ) : isEditing ? (
          <div>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />

            <button onClick={() => {
              if (!editText.trim()) return;
              onEditMessage(message, editText);
              setIsEditing(false);
            }}>Save</button>

            <button onClick={() => {
              setEditText(message.text);
              setIsEditing(false);
            }}>Cancel</button>
          </div>
        ) : (
          <p>{message.text}</p>
        )}

        <small>{message.time}</small>

        {message.edited && (
          <small> (edited) </small>
        )}

        {message.type === "room_message" && !message.deleted && (
          <button onClick={() => onReplyMessage(message)}>
            Reply
          </button>
        )}

        {isMine && message.type === "room_message" && !message.deleted && (
          <button onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}

        {isMine && message.type === "room_message" && !message.deleted && (
          <button onClick={() => onDeleteMessage(message)}>
            Delete
          </button>
        )}

        {message.username === currentUsername && (
          <small>
            {message.seen_by && message.seen_by.length > 0
              ? `Seen by ${message.seen_by.join(", ")}`
              : "Sent"}
          </small>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;