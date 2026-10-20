import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "./AuthContext";

export default function Login({ onSkip }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(email, password, name || email);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <motion.div className="login-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="login-logo">💰</div>
        <h1>Controle de Gastos</h1>
        <p className="login-sub">
          {mode === "login"
            ? "Entre com sua conta para sincronizar dados na nuvem"
            : "Crie uma conta para salvar seus lançamentos na nuvem"}
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {mode === "register" && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Nome (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          {error && <div className="hint" style={{ color: "#dc2626", marginBottom: 12 }}>❌ {error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Processando..." : mode === "login" ? "Entrar" : "Registrar"}
          </button>
        </form>

        <div className="login-divider"><span>ou</span></div>

        <button
          type="button"
          className="login-skip"
          onClick={() => (mode === "login" ? setMode("register") : setMode("login"))}
          style={{ marginBottom: 12 }}
        >
          {mode === "login" ? "Criar nova conta" : "Voltar para login"}
        </button>

        <button type="button" className="login-skip" onClick={onSkip}>
          Continuar sem conta
        </button>
        <p className="hint" style={{ marginTop: 8 }}>
          Sem conta os dados ficam só neste aparelho (local). Depois dá para entrar e migrar.
        </p>
      </motion.div>
    </div>
  );
}
