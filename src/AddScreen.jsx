import { motion } from "framer-motion";

const CATS = ["Alimentação","Transporte","Moradia","Lazer","Saúde","Salário","Outros"];

export default function AddScreen({ 
  desc, setDesc, valor, setValor, tipo, setTipo, categoria, setCategoria,
  parcelas, setParcelas, mesInicio, setMesInicio, fixa, setFixa,
  voiceListening, startVoice, stopVoice, voiceTranscript, voiceParsed, voiceError, voiceAudioUrl,
  voiceSupported, clearVoice, confirmVoice, onSubmit, onBack
}) {
  const FormFields = (
    <>
      <div className="form-grid">
        <div className="field">
          <label>Descrição</label>
          <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: Almoço" required />
        </div>
        <div className="field">
          <label>Valor</label>
          <input type="number" step="0.01" min="0" value={valor} onChange={e=>setValor(e.target.value)} placeholder="0.00" required />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Tipo</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>
        <div className="field">
          <label>Categoria</label>
          <select value={categoria} onChange={e=>setCategoria(e.target.value)}>
            {CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Mês início</label>
          <input type="month" value={mesInicio} onChange={e=>setMesInicio(e.target.value)} required />
        </div>
        <div className="field">
          <label>Parcelas</label>
          <input type="number" min="1" max="360" value={parcelas} onChange={e=>setParcelas(parseInt(e.target.value)||1)} disabled={fixa} required />
        </div>
      </div>
      <div className="check-row">
        <input type="checkbox" id="fixa-check" checked={fixa} onChange={e=>setFixa(e.target.checked)} />
        <label htmlFor="fixa-check" style={{margin: 0, cursor: "pointer"}}>Receita/despesa fixa (mensal)</label>
      </div>
    </>
  );

  const VoiceBlock = (
    <div style={{marginTop:14, borderTop:"1px solid var(--border)", paddingTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <strong style={{fontSize:"14px"}}>Adicionar por voz</strong>
      </div>
      <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
        <motion.button
          type="button"
          onClick={voiceListening?stopVoice:startVoice}
          aria-pressed={voiceListening}
          className={voiceListening?"voice-btn listening":"voice-btn"}
          style={{
            padding:"14px 20px", borderRadius:"12px", border:"none", fontWeight:700,
            background:voiceListening?"#dc2626":"var(--accent)",color:voiceListening?"#fff":"#422006",
            boxShadow:voiceListening?"0 8px 24px rgba(220,38,38,0.35)":"0 8px 24px rgba(234,179,8,0.35)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",fontWeight:800
          }}
        >
          {voiceListening?"■":"🎤"}
        </motion.button>
        <span style={{fontSize:"13px", color: voiceListening ? "#dc2626" : "var(--text)", fontWeight: voiceListening ? 700 : 400}}>
          {voiceListening ? "● Ouvindo... fale agora" : voiceSupported ? "Toque para falar (pt-BR)" : "Sem suporte — use Chrome/Edge"}
        </span>
        {(voiceTranscript||voiceParsed) && <button type="button" onClick={clearVoice} style={{padding:"8px 12px",border:"1px solid var(--border)",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:"13px"}}>Limpar</button>}
      </div>
      {voiceError && <p style={{marginTop:8,padding:"10px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,color:"#dc2626",fontSize:"13px"}}>{voiceError}</p>}
      {voiceTranscript && <p style={{marginTop:8,fontSize:"13px",background:"var(--code-bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}><strong>Transcrição:</strong> {voiceTranscript}</p>}
      {voiceParsed && (
        <div style={{marginTop:8,padding:"10px 12px",background:"var(--code-bg)",border:"1px solid var(--border)",borderRadius:10,fontSize:"13px",lineHeight:1.6}}>
          <div>Descrição: <strong>{voiceParsed.desc}</strong></div>
          <div>Valor: <strong>{voiceParsed.valor}</strong> {voiceParsed.fixa?"(mensal)":""}</div>
          <div>Tipo: <strong style={{color:voiceParsed.tipo==="receita"?"#16a34a":"#dc2626"}}>{voiceParsed.tipo}</strong></div>
          <button type="button" onClick={confirmVoice} style={{marginTop:10,background:"var(--primary)",color:"#fff",border:"none",borderRadius:10,padding:"12px 16px",fontWeight:700,cursor:"pointer",width:"100%"}}>✅ Confirmar e adicionar</button>
        </div>
      )}
      {voiceAudioUrl && <audio controls src={voiceAudioUrl} style={{marginTop:10,width:"100%",borderRadius:10}} />}
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header style={{ padding: "12px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: "var(--app-max)", margin: "0 auto", padding: "0 12px" }}>
          <button type="button" onClick={onBack} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, padding: "8px 4px" }}>‹</button>
          <h1 style={{ fontSize: 18, margin: 0 }}>Adicionar Lançamento</h1>
        </div>
      </header>

      <div className="page" style={{ flex: 1 }}>
        <section className="form-section">
          <h2>Formulário</h2>
          <form onSubmit={onSubmit}>
            {FormFields}
            <button type="submit" className="btn-primary">Adicionar</button>
          </form>
        </section>
        
        <section className="form-section">
          {VoiceBlock}
        </section>
      </div>
    </div>
  );
}
