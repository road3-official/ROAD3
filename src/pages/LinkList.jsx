import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./LinkList.css";

function formatDateTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}/${m}/${d} ${h}:${min}`;
}

function LinkList() {
  const navigate = useNavigate();
  const { friendId } = useParams();

  const friends = useMemo(() => {
    return JSON.parse(localStorage.getItem("closedFriends") || "[]");
  }, []);

  const friendInfo =
    friends.find((friend) => String(friend.id) === String(friendId)) || {
      name: "友達",
    };

  const messages = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("chatMessages") || "{}");
    return stored[friendId] || [];
  }, [friendId]);

  const linkItems = useMemo(() => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    return messages
      .filter((msg) => msg.text && urlPattern.test(msg.text))
      .map((msg) => {
        const links = (msg.text || "").match(urlPattern) || [];

        return {
          id: msg.id,
          text: msg.text || "",
          links,
          time: msg.timestamp || msg.time || "",
          sender: msg.sender || "",
        };
      })
      .reverse();
  }, [messages]);

  return (
    <div className="link-list-page">
      <header className="link-list-header">
        <button className="link-list-back" onClick={() => navigate(-1)}>
          ←
        </button>

        <div className="link-list-header-text">
          <h2>リンク</h2>
          <p>{friendInfo.name}とのトーク</p>
        </div>
      </header>

      <main className="link-list-content">
        {linkItems.length === 0 ? (
          <div className="link-list-empty">
            <p>まだリンクはありません</p>
          </div>
        ) : (
          <div className="link-list-items">
            {linkItems.map((item) => (
              <div key={item.id} className="link-list-card">
                <div className="link-list-meta">
                  <span className="link-list-sender">{item.sender}</span>
                  <span className="link-list-time">
                    {formatDateTime(item.time)}
                  </span>
                </div>

                <p className="link-list-text">{item.text}</p>

                <div className="link-list-links">
                  {item.links.map((link, index) => (
                    <a
                      key={`${item.id}-${index}`}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="link-list-link"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default LinkList;