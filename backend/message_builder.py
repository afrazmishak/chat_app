def build_room_message(message_id, username, room, text, timestamp):
    return {
        "type": "room_message",
        "id": message_id,
        "sender": username,
        "username": username,
        "room": room,
        "text": text,
        "time": timestamp,

        "status": {
            "sent": True,
            "delivered": True,
            "seen": False,
        },

        "seen_by": [],
        "edited": False,
        "edited_at": None,
        "deleted": False,
        "deleted_at": None,
        "reply_to": None,
        "attachments": [],
        "reactions": [],
    }

def build_private_message(message_id, sender, receiver, text, timestamp):
    return {
        "type": "private_message",
        "id": message_id,
        "from": sender,
        "sender": sender,
        "to": receiver,
        "receiver": receiver,
        "text": text,
        "time": timestamp,

        "status": {
            "sent": True,
            "delivered": True,
            "seen": False,
        },

        "seen_by": [],
        "edited": False,
        "edited_at": None,
        "deleted": False,
        "deleted_at": None,
        "reply_to": None,
        "attachments": [],
        "reactions": [],
    }