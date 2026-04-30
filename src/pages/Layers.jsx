import { useNavigate } from "react-router-dom";
import "./Layers.css";

function Layers() {
  const navigate = useNavigate();

  const layerItems = [
    {
      id: "open",
      title: "オープンスペース",
      description: "広くつながるタイムライン",
      path: "/open",
    },
    {
      id: "group",
      title: "グループスペース",
      description: "仲間ごとの場",
      path: "/group",
    },
    {
      id: "closed",
      title: "クローズドスペース",
      description: "限られた相手との場",
      path: "/closed",
    },
    {
      id: "personal",
      title: "パーソナルスペース",
      description: "自分の拠点",
      path: "/personal",
    },
  ];

  return (
    <div className="layers-page">
      <div className="layers-topbar">
        <button
          type="button"
          className="layers-back"
          onClick={() => navigate(-1)}
        >
          ← 戻る
        </button>

        <h2 className="layers-title">階層移動</h2>

        <div className="layers-right" />
      </div>

      <div className="layers-content">
        <div className="layers-card">
          {layerItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="layers-item"
              onClick={() => navigate(item.path)}
            >
              <div className="layers-itemMain">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>

              <div className="layers-arrow">›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Layers;