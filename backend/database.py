import psycopg2
from message_builder import build_room_message, build_private_message

DB_CONFIG = {
    "dbname": "chat_app",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5432
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def save_user(username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (username)
        VALUES (%s)
        ON CONFLICT (username) DO NOTHING
        """,
        (username,)
    )

    conn.commit()
    cur.close()
    conn.close()

def save_room_message(room_name, username, message):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO room_messages (room_name, username, message)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (room_name, username, message)
    )

    message_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return message_id

def get_room_messages(room_name):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username, message, created_at
        FROM room_messages
        WHERE room_name = %s
        ORDER BY created_at ASC
        """,
        (room_name,)
    )

    rows = cur.fetchall()

    messages = []

    for row in rows:
        message = build_room_message(
                row[0],
                row[1],
                room_name,
                row[2],
                row[3].strftime("%H:%M")
        )

        cur.execute(
            """
            SELECT username
            FROM room_message_reads
            WHERE message_id = %s
            """,
            (row[0],)
        )

        seen_rows = cur.fetchall()
        message["seen_by"] = [seen_row[0] for seen_row in seen_rows]

        messages.append(message)

    cur.close()
    conn.close()

    return messages

def save_private_message(sender, receiver, message):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO private_messages (sender, receiver, message)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (sender, receiver, message)
    )

    message_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return message_id

def get_private_messages(user1, user2):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, sender, receiver, message, created_at
        FROM private_messages
        WHERE
            (sender = %s AND receiver = %s)
            OR
            (sender = %s AND receiver = %s)
        ORDER BY created_at ASC
        """,
        (user1, user2, user2, user1)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    messages = []

    for row in rows:
        messages.append(
            build_private_message(
                row[0],
                row[1],
                row[2],
                row[3],
                row[4].strftime("%H:%M")
            )
        )

    return messages

def get_user_rooms(username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT room_name
        FROM room_messages
        WHERE username = %s
        ORDER BY room_name ASC
        """,
        (username,)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [row[0] for row in rows]

def save_room_member(username, room_name):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO room_members (username, room_name)
        VALUES (%s, %s)
        ON CONFLICT (username, room_name) DO NOTHING 
        """,
        (username, room_name)
    )

    conn.commit()
    cur.close()
    conn.close()

def get_private_conversations(username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT DISTINCT
            CASE
                WHEN sender = %s THEN receiver
                ELSE sender
            END AS other_user
        FROM private_messages
        WHERE sender = %s OR receiver = %s
        ORDER BY other_user ASC
        """,
        (username, username, username)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [row[0] for row in rows]

def create_user(username, email, password_hash):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (username, email, password_hash)
        VALUES (%s, %s, %s)
        ON CONFLICT DO NOTHING
        RETURNING id, username, email
        """,
        (username, email, password_hash)
    )

    user = cur.fetchone()

    if not user:
        conn.commit()
        cur.close()
        conn.close()
        return None

    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": user[0],
        "username": user[1],
        "email": user[2]
    }

def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username, email, password_hash
            FROM users
            WHERE email = %s
        """,
        (email,)
    )

    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        return None

    return {
        "id": user[0],
        "username": user[1],
        "email": user[2],
        "password_hash": user[3]
    }

def get_profile(username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, username, email, bio, avatar_url, last_seen, created_at, is_online
        FROM users
        WHERE username = %s
        """,
        (username,)
    )

    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        return None

    return {
        "id": user[0],
        "username": user[1],
        "email": user[2],
        "bio": user[3],
        "avatar_url": user[4],
        "last_seen": user[5],
        "created_at": user[6],
        "is_online": user[7],
    }

def update_profile(username, bio, avatar_url):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users
        SET bio = %s, avatar_url = %s
        WHERE username = %s
        RETURNING id, username, email, bio, avatar_url
        """,
        (bio, avatar_url, username)
    )

    user = cur.fetchone()
    cur.close()
    conn.close()

    return {
        "id": user[0],
        "username": user[1],
        "email": user[2],
        "bio": user[3],
        "avatar_url": user[4],
    }

def update_last_seen(username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users
        SET last_seen = CURRENT_TIMESTAMP
        WHERE username = %s
        """,
        (username,)
    )

    conn.commit()
    cur.close()
    conn.close()

def set_user_online(username, online):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users
        SET is_online = %s
        WHERE username = %s
        """,
        (online, username)
    )

    conn.commit()
    cur.close()
    conn.close()

def mark_room_message_seen(message_id, username):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO room_message_reads (message_id, username)
        VALUES (%s, %s)
        ON CONFLICT (message_id, username) DO NOTHING
        """,
        (message_id, username)
    )

    conn.commit()
    cur.close()
    conn.close()