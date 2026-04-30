import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">新規登録</h2>
        <p className="auth-help">（ここは次に作ろう！）</p>

        <button className="auth-primary" type="button" onClick={() => navigate("/login")}>
          先にログイン画面を見る
        </button>

        <button className="auth-secondary" type="button" onClick={() => navigate("/")}>
          戻る
        </button>
      </div>
    </div>
  );
}