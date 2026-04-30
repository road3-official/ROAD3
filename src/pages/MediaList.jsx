import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MediaList.css";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDateLabel(timestamp) {
  if (!timestamp) return "日付不明";

  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}/${m}/${d}`;
}

function MediaList() {
  const navigate = useNavigate();
  const { friendId } = useParams();

  const friends = useMemo(() => {
    return safeParse(localStorage.getItem("closedFriends"), []);
  }, []);

  const friendInfo =
    friends.find((friend) => String(friend.id) === String(friendId)) || {
      name: "友達",
    };

  const messages = useMemo(() => {
    const stored = safeParse(localStorage.getItem("chatMessages"), {});
    return Array.isArray(stored[friendId]) ? stored[friendId] : [];
  }, [friendId]);

  const mediaItems = useMemo(() => {
    return messages
      .filter((msg) => msg.type === "image")
      .map((msg) => ({
        id: msg.id,
        type: msg.type,
        text: msg.text || "",
        image: msg.image || null,
        imageUnavailable: Boolean(msg.imageUnavailable),
        fileName: msg.fileName || "",
        timestamp: msg.timestamp || null,
        dateLabel: formatDateLabel(msg.timestamp),
      }))
      .reverse();
  }, [messages]);

  const groupedItems = useMemo(() => {
    const groups = [];

    mediaItems.forEach((item) => {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.dateLabel === item.dateLabel) {
        lastGroup.items.push(item);
      } else {
        groups.push({
          dateLabel: item.dateLabel,
          items: [item],
        });
      }
    });

    return groups;
  }, [mediaItems]);

  return (
    <div className="media-list-page">
      <header className="media-list-header">
        <button
          className="media-list-back"
          onClick={() => navigate(-1)}
          aria-label="戻る"
          title="戻る"
        >
          ←
        </button>

        <div className="media-list-header-text">
          <h2>メディア</h2>
          <p>{friendInfo.name}とのトーク</p>
        </div>
      </header>

      <main className="media-list-content">
        {groupedItems.length === 0 ? (
          <div className="media-list-empty">
            <p>まだメディアはありません</p>
          </div>
        ) : (
          groupedItems.map((group) => (
            <section key={group.dateLabel} className="media-list-section">
              <h3 className="media-list-date">{group.dateLabel}</h3>

              <div className="media-list-grid">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="media-list-card"
                    onClick={() => {
                      if (item.image && !item.imageUnavailable) {
                        window.open(item.image, "_blank", "noreferrer");
                      }
                    }}
                  >
                    {item.image && !item.imageUnavailable ? (
                      <img
                        src={item.image}
                        alt={item.fileName || "メディア"}
                        className="media-list-image"
                      />
                    ) : (
                      <span className="media-list-placeholder">画像</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

export default MediaList;