import { motion } from "framer-motion";

export default function HomeScreen({ onViewLancamentos, onViewAdicionar }) {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 20,
      background: "var(--bg)"
    }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>💰</div>
        <h1 style={{ fontSize: 28, margin: "0 0 8px", color: "var(--text-h)" }}>Controle de Gastos</h1>
        <p style={{ fontSize: 14, color: "var(--text)", margin: 0 }}>Gerencie suas finanças com facilidade</p>
      </div>

      <motion.button
        type="button"
        onClick={onViewLancamentos}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: "100%",
          maxWidth: 320,
          aspectRatio: "1",
          borderRadius: 20,
          border: "none",
          background: "var(--primary)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontSize: 16,
          fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          transition: "all 0.2s"
        }}
      >
        <div style={{ fontSize: 48 }}>📊</div>
        <div>Ver Lançamentos</div>
      </motion.button>

      <motion.button
        type="button"
        onClick={onViewAdicionar}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: "100%",
          maxWidth: 320,
          aspectRatio: "1",
          borderRadius: 20,
          border: "none",
          background: "var(--accent)",
          color: "#422006",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontSize: 16,
          fontWeight: 700,
          boxShadow: "0 8px 24px rgba(234,179,8,0.25)",
          transition: "all 0.2s"
        }}
      >
        <div style={{ fontSize: 48 }}>➕</div>
        <div>Adicionar Lançamento</div>
      </motion.button>
    </div>
  );
}
