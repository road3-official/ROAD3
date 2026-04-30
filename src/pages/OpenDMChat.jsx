import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import "./OpenDMChat.css";

function OpenDMChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();

  const decodedUserId = decodeURIComponent(userId || "");
  const fromPath = location.state?.from || "/dm";

  const [message, setMessage] = useState("");
  const [showMediaBar, setShowMediaBar] = useState(false);

  const baseChat = location.state?.chat || {
    userId: decodedUserId || "sample-user",
    name: "ユーザー名",
    handle: decodedUserId || "@sample_user",
    unread: 0,
    time: "",
    lastMessage: "",
    messages: [],
  };

  const [chat, setChat] = useState(baseChat);
  const [messages, setMessages] = useState(baseChat.messages || []);

  useEffect(() => {
    const savedChats = JSON.parse(localStorage.getItem("dmChats") || "[]");
    const matchedChat = savedChats.find(
      (c) => String(c.userId) === String(decodedUserId || baseChat.userId)
    );

    if (matchedChat) {
      const normalizedMessages = (matchedChat.messages || []).map((msg) =>
        msg.sender === "me" ? { ...msg, isRead: true } : msg
      );

      setChat({
        ...matchedChat,
        unread: 0,
        messages: normalizedMessages,
      });
      setMessages(normalizedMessages);

      const updatedChats = savedChats.map((c) => {
        if (String(c.userId) === String(matchedChat.userId)) {
          return {
            ...c,
            unread: 0,
            messages: normalizedMessages,
          };
        }
        return c;
      });

      localStorage.setItem("dmChats", JSON.stringify(updatedChats));
    } else {
      const newChat = {
        userId: baseChat.userId,
        name: baseChat.name,
        handle: baseChat.handle || baseChat.userId,
        unread: 0,
        time: "",
        lastMessage: "",
        updatedAt: Date.now(),
        messages: [],
      };

      const updatedChats = [newChat, ...savedChats];
      localStorage.setItem("dmChats", JSON.stringify(updatedChats));

      setChat(newChat);
      setMessages([]);
    }
  }, [decodedUserId, baseChat.userId, baseChat.name, baseChat.handle]);

  const handleBack = () => {
    if (fromPath === "other-profile") {
      navigate(-1);
      return;
    }

    navigate("/dm", {
      state: { refresh: true },
      replace: true,
    });
  };

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    const savedChats = JSON.parse(localStorage.getItem("dmChats") || "[]");

    let chatExists = false;

    const updatedChats = savedChats.map((c) => {
      if (String(c.userId) === String(chat.userId)) {
        chatExists = true;
        return {
          ...c,
          name: chat.name,
          handle: chat.handle || chat.userId,
          messages: updatedMessages,
          lastMessage: newMessage.text,
          time: newMessage.time,
          unread: 0,
          updatedAt: Date.now(),
        };
      }
      return c;
    });

    if (!chatExists) {
      updatedChats.unshift({
        userId: chat.userId,
        name: chat.name,
        handle: chat.handle || `@${chat.userId}`,
        lastMessage: newMessage.text,
        time: newMessage.time,
        unread: 0,
        updatedAt: Date.now(),
        messages: updatedMessages,
      });
    }

    localStorage.setItem("dmChats", JSON.stringify(updatedChats));

    setChat((prev) => ({
      ...prev,
      lastMessage: newMessage.text,
      time: newMessage.time,
      unread: 0,
      messages: updatedMessages,
    }));

    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="dmchat-page">
      <div className="dmchat-header">
        <button
          type="button"
          className="dmchat-back"
          onClick={handleBack}
        >
          ←
        </button>

        <div
          className="dmchat-user"
          onClick={() =>
            navigate(`/profile/user/${encodeURIComponent(chat.userId)}`, {
              state: {
                user: {
                  name: chat.name,
                  userId: chat.handle || chat.userId,
                  bio: "自己紹介はまだありません。",
                  following: 0,
                  followers: 0,
                  place: "未設定",
                  links: [],
                  birthday: "非公開",
                  joined: "ROAD3利用開始日",
                  tags: [],
                },
              },
            })
          }
        >
          <div className="dmchat-avatar">{chat.name?.charAt(0)}</div>

          <div className="dmchat-userinfo">
            <strong>{chat.name}</strong>
          </div>
        </div>

        <button type="button" className="dmchat-menu">
          ⋯
        </button>
      </div>

      <div className="dmchat-messages">
        {messages.length === 0 ? (
          <p className="dmchat-empty">まだメッセージはありません</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`dmchat-bubbleRow ${
                msg.sender === "me" ? "me" : "other"
              }`}
            >
              <div
                className={`dmchat-bubble ${msg.sender === "me" ? "me" : "other"}`}
              >
                <p>{msg.text}</p>

                <div className="dmchat-meta">
                  {msg.sender === "me" && (
                    <span className="dmchat-readStatus">
                      {msg.isRead ? "既読" : "送信済み"}
                    </span>
                  )}
                  <span>{msg.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="dmchat-inputWrap">
        {showMediaBar && (
          <div className="dmchat-mediaBar">
            <button type="button">📷</button>
            <button type="button">🖼</button>
            <button type="button">📄</button>
          </div>
        )}

        <div className="dmchat-inputArea">
          <button
            type="button"
            className="dmchat-plus"
            onClick={() => setShowMediaBar((prev) => !prev)}
          >
            ＋
          </button>

          <input
            type="text"
            className="dmchat-input"
            placeholder="メッセージ..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            className="dmchat-send"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}

export default OpenDMChat;