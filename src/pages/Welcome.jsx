import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="ようこそ ROAD3へ">
        <p className="auth-topcopy">ROAD3はいつでも帰ってこられる場所</p>

        <h1 className="app-logo">ROAD3</h1>

        <p className="auth-comment">はじめての方へ</p>
        <button
          type="button"
          className="auth-secondary"
          onClick={() => navigate("/signup")}
        >
          新規登録
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-comment">おかえりなさい</p>
        <button
          type="button"
          className="auth-primary"
          onClick={() => navigate("/login")}
        >
          ログイン
        </button>
      </section>
    </main>
  );
}