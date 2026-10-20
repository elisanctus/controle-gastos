import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import "./App.css"
import { useAuth } from "./AuthContext"
import { api, getToken } from "./api"
import Login from "./Login"
import HomeScreen from "./HomeScreen"
import AddScreen from "./AddScreen"

const KEY = "gastos-v1"
const CATS = ["Alimentação","Transporte","Moradia","Lazer","Saúde","Salário","Outros"]
const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})
const ymNow = () => new Date().toISOString().slice(0,7)
const labelMes = ym => { const [y,m]=ym.split("-"); return new Date(+y,+m-1).toLocaleDateString("pt-BR",{month:"short",year:"numeric"}) }
const addM = (ym,n) => { let[y,m]=ym.split("-").map(Number); m+=n; while(m>12){m-=12;y++}while(m<1){m+=12;y--} return `${y}-${String(m).padStart(2,"0")}` }
const FIXA_HORIZON = 36
const isFixa = t => !!t.fixa
const cents = v => Math.round(v*100)
const parcelaValor = (t,i) => { const total=cents(t.valorTotal); const base=Math.floor(total/t.parcelas); const rem=total%t.parcelas; return (base+(i<rem?1:0))/100 }
const mesesDe = t => {
  if(isFixa(t)) return Array.from({length:FIXA_HORIZON},(_,i)=>({ym:addM(t.mesInicio,i),valor:t.valorTotal,n:i+1,fixa:true}))
  return Array.from({length:t.parcelas},(_,i)=>({ym:addM(t.mesInicio,i),valor:parcelaValor(t,i),n:i+1}))
}

const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function parseValorVoice(t){
  t=t.toLowerCase().replace(/r\$/g,"");
  let m=t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+\.\d{1,2}|\d+(?:,\d{1,2})?)\s*(?:reais|real)\b/i);
  if(m){
    let raw=m[1].trim();
    if(raw.includes(",")) raw=raw.replace(/\./g,"").replace(",",".");
    else if(/^\d{1,3}(\.\d{3})+$/.test(raw)) raw=raw.replace(/\./g,"");
    const n=parseFloat(raw);
    if(Number.isFinite(n)&&n>0) return Math.abs(n);
  }
  let nums=t.match(/\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+\.\d{1,2}|\d+(?:,\d{1,2})?|\d+/g);
  if(!nums) return null;
  let best=null;
  for(let raw of nums){
    let norm=raw.trim();
    if(norm.includes(",")) norm=norm.replace(/\./g,"").replace(",",".");
    else if(/^\d{1,3}(\.\d{3})+$/.test(norm)) norm=norm.replace(/\./g,"");
    const n=parseFloat(norm);
    if(!Number.isFinite(n)||n<=0) continue;
    if(best===null || n>best) best=n;
  }
  return best;
}
function parseTipoVoice(t){
  t=t.toLowerCase();
  if(/\breceita\b|\brecebi\b|\bganhei\b|\bsal[áa]rio\b|\brendimento\b/.test(t)) return "receita";
  if(/\bdespesa\b|\bgastei\b|\bpaguei\b|\bcomprei\b|\bdespesa\b/.test(t)) return "despesa";
  return t.includes("receb")||t.includes("salário")||t.includes("salario")?"receita":"despesa";
}
function parseCategoriaVoice(t, _tipo){
  const l=t.toLowerCase();
  if(/mercado|supermercado|padaria|alimenta|comida|restaurante|ifood|lanche/.test(l)) return "Alimentação";
  if(/uber|99|transporte|gasolina|combust|onibus|ônibus|metro|passagem/.test(l)) return "Transporte";
  if(/aluguel|condom|moradia|luz|energia|água|internet|casa|iptu/.test(l)) return "Moradia";
  if(/cinema|lazer|viagem|bar|festa|show|ingresso/.test(l)) return "Lazer";
  if(/farmacia|remedio|medico|saúde|hospital|consulta|exame/.test(l)) return "Saúde";
  if(/sal[áa]rio|pagamento|ordenado/.test(l)) return "Salário";
  return "Outros";
}
function parseParcelasVoice(t){
  const m=t.match(/(?:em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas|vez)\b/i);
  if(m){ const n=parseInt(m[1],10); if(n>=1&&n<=60) return n; }
  return 1;
}
function parseFixaVoice(t){
  return /\bfixa\b|\bfixo\b|todo m[eê]s|mensal|recorrente|sempre/.test(t.toLowerCase());
}
function parseMesInicioVoice(t){
  const l=t.toLowerCase();
  let y=new Date().getFullYear();
  const mY=l.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[^\d]*(20\d{2})/);
  if(mY){ const idx=MESES_PT.indexOf(mY[1]); if(idx>=0) return `${mY[2]}-${String(idx+1).padStart(2,"0")}`; }
  for(let i=0;i<MESES_PT.length;i++){ if(l.includes(MESES_PT[i])) return `${y}-${String(i+1).padStart(2,"0")}`; }
  const m=l.match(/\b(\d{1,2})\/(20\d{2})\b/); if(m) return `${m[2]}-${m[1].padStart(2,"0")}`;
  const m2=l.match(/\b(\d{4})-(\d{2})\b/); if(m2) return `${m2[1]}-${m2[2]}`;
  return ymNow();
}
function parseDescVoice(t, _valor){
  let d=t.trim();
  d=d.replace(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*(?:reais|real|r\$)?/gi," ");
  d=d.replace(/\b(em\s+\d+\s*(?:x|vezes|parcelas|vez))\b/gi," ");
  d=d.replace(/\b(fixa|fixo|todo m[eê]s|mensal|recorrente)\b/gi," ");
  d=d.replace(/\b(receita|despesa|gastei|paguei|comprei|recebi|ganhei|pago|gasto)\b/gi," ");
  d=d.replace(/\b(de|do|da|no|na|com|para|por|um|uma|o|a)\b/gi," ");
  d=d.replace(/\s{2,}/g," ").trim();
  if(!d) d=t.trim().slice(0,40);
  return d.charAt(0).toUpperCase()+d.slice(1);
}
function parseVoice(t){
  if(!t||!t.trim()) return null;
  const valor=parseValorVoice(t);
  if(valor==null) return null;
  const tipo=parseTipoVoice(t);
  const fixa=parseFixaVoice(t);
  const parcelas=fixa?1:parseParcelasVoice(t);
  const categoria=parseCategoriaVoice(t,tipo);
  const mesInicio=parseMesInicioVoice(t);
  const desc=parseDescVoice(t,valor);
  return {desc, valor, tipo, categoria, parcelas, fixa, mesInicio, raw:t};
}

const loadLocal = () => {
  try{
    let dados=JSON.parse(localStorage.getItem(KEY)||"[]")
    dados=dados.map(t=>{
      if(t.mesInicio) return {fixa:!!t.fixa,...t}
      const ym=(t.data||ymNow()).slice(0,7)
      const tot=t.valorTotal!=null?t.valorTotal:(t.valor||0)
      return {id:t.id||Date.now().toString(36)+Math.random().toString(36).slice(2),desc:t.desc,tipo:t.tipo,categoria:t.categoria,valorTotal:tot,parcelas:t.parcelas||1,mesInicio:ym,fixa:false}
    })
    return dados
  }catch{ return []}
}

export default function App(){
  const { user, loading: authLoading, logout } = useAuth()
  const isAuthed = !!user && !!getToken()
  const [dados,setDados]=useState(loadLocal)
  const [syncing,setSyncing]=useState(false)
  const [desc,setDesc]=useState("")
  const [valor,setValor]=useState("")
  const [tipo,setTipo]=useState("despesa")
  const [categoria,setCategoria]=useState("Outros")
  const [parcelas,setParcelas]=useState(1)
  const [mesInicio,setMesInicio]=useState(ymNow())
  const [fixa,setFixa]=useState(false)
  const [filtroTexto,setFiltroTexto]=useState("")
  const [filtroCat,setFiltroCat]=useState("")
  const [filtroTipo,setFiltroTipo]=useState("")
  const [mesView,setMesView]=useState(ymNow())
  const [appTab,setAppTab]=useState(()=> localStorage.getItem("appTab") || "inicio")
  const [showAdd,setShowAdd]=useState(false)
  const [skipLogin,setSkipLogin]=useState(()=> localStorage.getItem("skip-login")==="1")
  const [voiceListening,setVoiceListening]=useState(false)
  const [voiceTranscript,setVoiceTranscript]=useState("")
  const [voiceParsed,setVoiceParsed]=useState(null)
  const [voiceError,setVoiceError]=useState("")
  const [voiceAudioUrl,setVoiceAudioUrl]=useState("")
  const recognitionRef=useRef(null)
  const mediaRecorderRef=useRef(null)
  const audioChunksRef=useRef([])
  const voiceSupported=typeof window!=="undefined" && (("SpeechRecognition" in window)||("webkitSpeechRecognition" in window))

  useEffect(()=>{ localStorage.setItem("appTab", appTab) },[appTab])

  useEffect(()=>{
    if(authLoading) return
    if(isAuthed){
      setSyncing(true)
      api.listTx().then(rows=>{
        const local = loadLocal()
        if(local.length && rows.length===0){
          Promise.all(local.map(r=> api.createTx({desc:r.desc, valorTotal:r.valorTotal, tipo:r.tipo, categoria:r.categoria, parcelas:r.parcelas, mesInicio:r.mesInicio, fixa:r.fixa})))
            .then(()=> api.listTx().then(setDados).finally(()=>setSyncing(false)))
            .catch(()=>{ setDados(rows); setSyncing(false) })
        } else {
          setDados(rows); setSyncing(false)
        }
      }).catch(()=>{ setDados(loadLocal()); setSyncing(false) })
    } else {
      setDados(loadLocal())
    }
  },[isAuthed, authLoading])

  useEffect(()=>{ if(!isAuthed) try{localStorage.setItem(KEY,JSON.stringify(dados))}catch{} },[dados,isAuthed])

  const filtrados = useMemo(()=> dados.filter(t=>
    (!filtroTexto||t.desc.toLowerCase().includes(filtroTexto.toLowerCase())) &&
    (!filtroCat||t.categoria===filtroCat) &&
    (!filtroTipo||t.tipo===filtroTipo)
  ),[dados,filtroTexto,filtroCat,filtroTipo])

  const meses = useMemo(()=>{
    const s=new Set()
    ;(filtrados.length?filtrados:dados).forEach(t=> mesesDe(t).forEach(x=>s.add(x.ym)))
    const arr=[...s].sort()
    return arr.length?arr:[ymNow()]
  },[filtrados,dados])

  useEffect(()=>{
    if(mesView!=="todos" && !meses.includes(mesView)) setMesView(meses[0])
  },[meses,mesView])

  const viewMes = mesView
  const todasMeses = meses

  const totRec = useMemo(()=> dados.reduce((a,t)=>a+(t.tipo==="receita"?t.valorTotal:0),0),[dados])
  const totDes = useMemo(()=> dados.reduce((a,t)=>a+(t.tipo==="despesa"?t.valorTotal:0),0),[dados])

  const {recMes,desMes}=useMemo(()=>{
    if(viewMes==="todos") return {recMes:totRec,desMes:totDes}
    let r=0,d=0
    filtrados.forEach(t=> mesesDe(t).forEach(x=>{ if(x.ym===viewMes){ if(t.tipo==="receita") r+=x.valor; else d+=x.valor; }}))
    return {recMes:r,desMes:d}
  },[filtrados,viewMes,totRec,totDes])

  async function onAdd(e){
    e.preventDefault()
    if(!desc.trim()||!valor) return
    const ehFixa = !!fixa
    const payload={desc:desc.trim(), valorTotal:Math.abs(parseFloat(valor)), tipo, categoria, parcelas: ehFixa ? 1 : Math.max(1,parseInt(parcelas||1,10)), mesInicio:mesInicio||ymNow(), fixa: ehFixa}
    if(isAuthed){
      try{ const created=await api.createTx(payload); setDados(d=>[...d,created]) }catch(err){ alert("Erro ao salvar: "+err.message); return }
    } else {
      setDados(d=>[...d,{id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),...payload}])
    }
    setDesc(""); setValor(""); setParcelas(1); setShowAdd(false); setAppTab("lancamentos")
  }

  function startVoice(){
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceParsed(null);
    setVoiceAudioUrl("");
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ setVoiceError("Navegador sem suporte a voz. Use Chrome/Edge e permita microfone."); return; }
    try{
      const rec=new SR();
      rec.lang="pt-BR";
      rec.interimResults=false;
      rec.maxAlternatives=1;
      rec.continuous=false;
      recognitionRef.current=rec;
      rec.onstart=()=>{ setVoiceListening(true); };
      rec.onend=()=>{ setVoiceListening(false); };
      rec.onerror=(e)=>{ setVoiceListening(false); setVoiceError("Erro de voz: "+(e.error||"desconhecido")+" — permita microfone."); };
      rec.onresult=(e)=>{
        const text=e.results[0][0].transcript||"";
        setVoiceTranscript(text);
        const parsed=parseVoice(text);
        if(!parsed) setVoiceError("Não entendi valor. Ex: \"gastei 50 reais no mercado\" ou \"aluguel 1500 fixo\"");
        else setVoiceParsed(parsed);
      };
      rec.start();
      if(navigator.mediaDevices?.getUserMedia){
        navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
          const mr=new MediaRecorder(stream);
          mediaRecorderRef.current=mr;
          audioChunksRef.current=[];
          mr.ondataavailable=ev=>{ if(ev.data.size>0) audioChunksRef.current.push(ev.data); };
          mr.onstop=()=>{ const blob=new Blob(audioChunksRef.current,{type:"audio/webm"}); const url=URL.createObjectURL(blob); setVoiceAudioUrl(url); stream.getTracks().forEach(t=>t.stop()); };
          mr.start();
          setTimeout(()=>{ try{ if(mr.state==="recording") mr.stop(); }catch{} }, 15000);
        }).catch(()=>{});
      }
    }catch(err){ setVoiceError("Falha ao iniciar voz: "+err.message); }
  }
  function stopVoice(){
    try{ recognitionRef.current?.stop(); }catch{}
    try{ if(mediaRecorderRef.current?.state==="recording") mediaRecorderRef.current.stop(); }catch{}
    setVoiceListening(false);
  }
  function clearVoice(){
    stopVoice(); setVoiceTranscript(""); setVoiceParsed(null); setVoiceError(""); setVoiceAudioUrl("");
  }
  async function confirmVoice(){
    if(!voiceParsed) return;
    const pv=voiceParsed;
    if(!pv.desc || !pv.valor){ setVoiceError("Falta descrição ou valor."); return; }
    const payload={desc:pv.desc, valorTotal:Math.abs(pv.valor), tipo:pv.tipo, categoria:pv.categoria, parcelas:pv.fixa?1:Math.max(1,pv.parcelas), mesInicio:pv.mesInicio||ymNow(), fixa:!!pv.fixa}
    if(isAuthed){
      try{ const created=await api.createTx(payload); setDados(d=>[...d,created]) }catch(err){ setVoiceError("Erro ao salvar: "+err.message); return }
    } else {
      setDados(d=>[...d,{id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),...payload}])
    }
    clearVoice(); setShowAdd(false); setAppTab("lancamentos");
  }


  async function del(id){
    if(!confirm("Excluir transação (todas parcelas)?")) return
    if(isAuthed){
      try{ await api.deleteTx(id); setDados(d=>d.filter(x=>x.id!==id)) }catch(err){ alert("Erro: "+err.message) }
    } else {
      setDados(d=>d.filter(x=>x.id!==id))
    }
  }

  const entries = useMemo(()=>{
    const arr=[]
    filtrados.forEach(t=> mesesDe(t).forEach(x=>{ if(viewMes==="todos"||x.ym===viewMes) arr.push({t,x}) }))
    arr.sort((a,b)=> a.x.ym.localeCompare(b.x.ym)||a.t.desc.localeCompare(b.t.desc))
    return arr
  },[filtrados,viewMes])

  const mesOptions = [...todasMeses]
  const showLogin = !authLoading && !isAuthed && !skipLogin
  function handleSkip(){ localStorage.setItem("skip-login","1"); setSkipLogin(true) }

  if(authLoading) return <p style={{padding:24}}>Carregando...</p>
  if(showLogin) return <Login onSkip={handleSkip} />

  const FormFields = (
    <>
      <div className="form-grid">
        <div className="field full"><label>Descrição</label><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: Geladeira 12x" required /></div>
        <div className="field"><label>{fixa ? "Valor mensal" : "Valor total"}</label><input value={valor} onChange={e=>setValor(e.target.value)} type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0,00" required /></div>
        <div className="field"><label>Tipo</label><select value={tipo} onChange={e=>setTipo(e.target.value)}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></div>
        <div className="field"><label>Categoria</label><select value={categoria} onChange={e=>setCategoria(e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="field"><label>Parcelas</label><input value={parcelas} onChange={e=>setParcelas(e.target.value)} type="number" inputMode="numeric" min="1" max="60" disabled={fixa} style={fixa?{opacity:.5}:null} /></div>
        <div className="field"><label>Mês início</label><input value={mesInicio} onChange={e=>setMesInicio(e.target.value)} type="month" required /></div>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={fixa} onChange={e=>setFixa(e.target.checked)} />
        {tipo==="receita"?"Receita":"Despesa"} fixa — todo mês a partir de {labelMes(mesInicio)}
      </label>
      <p className="hint">1 = à vista • Ex: R$ 1200 em 12x → 12× R$ 100,00. Centavos distribuídos sem perda.</p>
    </>
  )

  const VoiceBlock = (
    <div style={{marginTop:14, borderTop:"1px solid var(--border)", paddingTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <strong style={{fontSize:"14px"}}>Adicionar por voz</strong>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"14px 0 6px"}}>
        <motion.button
          type="button"
          onClick={voiceListening?stopVoice:startVoice}
          aria-pressed={voiceListening}
          className={voiceListening?"voice-btn listening":"voice-btn"}
          whileTap={{scale:0.96}}
          style={{
            position:"relative",width:72,height:72,borderRadius:"50%",border:"none",cursor:"pointer",
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
        <div style={{marginTop:12,background:"var(--accent-bg)",border:"1px solid var(--accent-border)",borderRadius:12,padding:12}}>
          <strong style={{fontSize:"13px"}}>Prévia — revise e confirme:</strong>
          <div style={{display:"grid",gap:6,marginTop:8,fontSize:"13px"}}>
            <div>Descrição: <strong>{voiceParsed.desc}</strong></div>
            <div>Valor: <strong>{fmt(voiceParsed.valor)}</strong> {voiceParsed.fixa?"(mensal)":""}</div>
            <div>Tipo: <strong style={{color:voiceParsed.tipo==="receita"?"#16a34a":"#dc2626"}}>{voiceParsed.tipo}</strong> • {voiceParsed.categoria} • {voiceParsed.fixa?"fixa":voiceParsed.parcelas+"x"} • {labelMes(voiceParsed.mesInicio)}</div>
          </div>
          <button type="button" onClick={confirmVoice} style={{marginTop:10,background:"var(--primary)",color:"#fff",border:"none",borderRadius:10,padding:"12px 16px",fontWeight:700,cursor:"pointer",width:"100%"}}>✅ Confirmar e adicionar</button>
        </div>
      )}
      {voiceAudioUrl && <audio controls src={voiceAudioUrl} style={{marginTop:10,width:"100%",borderRadius:10}} />}
    </div>
  )

  return (
    <>
      <header className="appbar">
        <div className="appbar-title">
          <div className="appbar-logo">💰</div>
          <div>
            <h1>Controle de Gastos</h1>
            <div className="appbar-sub">{viewMes==="todos"?"Todos os meses":labelMes(viewMes)} {syncing?"• sincronizando":""} {isAuthed?"• nuvem":"• local"}</div>
          </div>
        </div>
        <div className="appbar-actions">
          {isAuthed ? (
            <>
              {user.picture && <img src={user.picture} alt="" className="avatar" />}
              <button type="button" onClick={logout} className="btn-ghost">Sair</button>
            </>
          ) : (
            <>
              <span className="badge-local">Local</span>
              <button type="button" onClick={()=>{ localStorage.removeItem("skip-login"); setSkipLogin(false)}} className="btn-ghost">Entrar</button>
            </>
          )}
        </div>
      </header>

      {!isAuthed && (
        <div style={{maxWidth:"var(--app-max-mobile)", margin:"8px auto 0", padding:"0 12px", width:"100%", boxSizing:"border-box"}}>
          <p style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"10px 12px",fontSize:"13px", textAlign:"center"}}>
            Modo local — <button type="button" onClick={()=>{ localStorage.removeItem("skip-login"); setSkipLogin(false)}} style={{border:"none",background:"none",color:"#92400e",fontWeight:700,cursor:"pointer",textDecoration:"underline",padding:0}}>fazer login</button> para salvar na nuvem
          </p>
        </div>
      )}

      <div className="page">
        {appTab==="inicio" ? (
          <HomeScreen 
            onViewLancamentos={() => setAppTab("lancamentos")}
            onViewAdicionar={() => setAppTab("adicionar")}
          />
        ) : appTab==="lancamentos" ? (
          <>
            <header style={{ padding: "12px 0", borderBottom: "1px solid var(--border)", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={() => setAppTab("inicio")} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, padding: "8px 4px" }}>‹</button>
                <h1 style={{ fontSize: 18, margin: 0 }}>Lançamentos</h1>
              </div>
            </header>
            <section className="planilha-head">
              <h2>{viewMes==="todos"?"Todos os lançamentos":`Lançamentos — ${labelMes(viewMes)}`}</h2>
              <div className="mes-nav">
                <button type="button" onClick={()=>{ if(viewMes!=="todos"){ const i=mesOptions.indexOf(viewMes); if(i>0) setMesView(mesOptions[i-1]) }}}>‹</button>
                <select value={viewMes} onChange={e=>setMesView(e.target.value)}>
                  {mesOptions.map(m=><option key={m} value={m}>{labelMes(m)}</option>)}
                  <option value="todos">Todos</option>
                </select>
                <button type="button" onClick={()=>{ if(viewMes!=="todos"){ const i=mesOptions.indexOf(viewMes); if(i<mesOptions.length-1) setMesView(mesOptions[i+1]) }}}>›</button>
                <button type="button" onClick={()=>setMesView("todos")}>Todos</button>
              </div>
            </section>
            <section className="filtros">
              <input value={filtroTexto} onChange={e=>setFiltroTexto(e.target.value)} placeholder="Filtrar descrição..." />
              <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)}><option value="">Todas categorias</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="">Todos tipos</option><option value="receita">Receita</option><option value="despesa">Despesa</option></select>
              <button type="button" onClick={()=>{setFiltroTexto("");setFiltroCat("");setFiltroTipo("")}}>Limpar</button>
            </section>

            <div className="hide-desktop">
              {entries.length===0 ? <p className="vazio">{viewMes==="todos"?"Nenhum lançamento.":"Nenhum lançamento neste mês."}</p> : entries.map(({t,x})=>(
                <motion.div key={t.id+x.ym} className="mcard" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>
                  <div className="mcard-head"><strong>{t.desc} {isFixa(t) && <span style={{fontSize:"10px",background:"var(--accent)",color:"#422006",padding:"2px 6px",borderRadius:99}}>FIXA</span>}</strong><button className="btn-del" onClick={()=>del(t.id)} aria-label="Excluir">🗑️</button></div>
                  <div className="mcard-meta">{labelMes(x.ym)} • {t.categoria} • {t.tipo}{isFixa(t)?" • fixa":""} • {isFixa(t)?"todo mês":`${x.n}/${t.parcelas}`} — {t.tipo==="receita"?"+":"-"} {fmt(x.valor)}</div>
                </motion.div>
              ))}
              <div className="mfoot">
                <div className={recMes-desMes>=0?"valor-receita":"valor-despesa"}>Saldo: {fmt(recMes-desMes)}</div>
                <div className="valor-receita">Receitas: {fmt(recMes)}</div>
                <div className="valor-despesa">Despesas: {fmt(desMes)}</div>
              </div>
            </div>

            <div className="table-wrap hide-mobile">
              <table>
                <thead><tr><th>Mês / Parcela</th><th>Descrição</th><th>Categoria</th><th>Valor parcela</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {entries.map(({t,x})=>
                    <tr key={t.id+x.ym}>
                      <td>{labelMes(x.ym)} {isFixa(t)?"• fixa":`• ${x.n}/${t.parcelas}`}</td>
                      <td>{t.desc} {isFixa(t) && <small style={{background:"var(--accent-bg)",border:"1px solid var(--accent-border)",padding:"1px 6px",borderRadius:99}}>fixa</small>}</td>
                      <td>{t.categoria}</td>
                      <td className={t.tipo==="receita"?"valor-receita":"valor-despesa"}>{t.tipo==="receita"?"+":"-"} {fmt(x.valor)}</td>
                      <td><small>{fmt(t.valorTotal)} {isFixa(t)?"mês":"total"}</small></td>
                      <td><button className="btn-del" onClick={()=>del(t.id)}>🗑️</button></td>
                    </tr>
                  )}
                </tbody>
                <tfoot><tr><td colSpan={3} style={{textAlign:"right"}}>Saldo do período</td><td className={recMes-desMes>=0?"valor-receita":"valor-despesa"}>{fmt(recMes-desMes)}</td><td><small>{fmt(recMes)} / {fmt(desMes)}</small></td><td></td></tr></tfoot>
              </table>
              {entries.length===0 && <p className="vazio">{viewMes==="todos"?"Nenhuma parcela.":"Nenhuma parcela neste mês."}</p>}
            </div>
          </>
        ) : appTab==="adicionar" ? (
          <AddScreen
            desc={desc} setDesc={setDesc}
            valor={valor} setValor={setValor}
            tipo={tipo} setTipo={setTipo}
            categoria={categoria} setCategoria={setCategoria}
            parcelas={parcelas} setParcelas={setParcelas}
            mesInicio={mesInicio} setMesInicio={setMesInicio}
            fixa={fixa} setFixa={setFixa}
            voiceListening={voiceListening}
            startVoice={startVoice}
            stopVoice={stopVoice}
            voiceTranscript={voiceTranscript}
            voiceParsed={voiceParsed}
            voiceError={voiceError}
            voiceAudioUrl={voiceAudioUrl}
            voiceSupported={voiceSupported}
            clearVoice={clearVoice}
            confirmVoice={confirmVoice}
            onSubmit={onAdd}
            onBack={() => setAppTab("inicio")}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {voiceListening && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={stopVoice}>
            <motion.div onClick={e=>e.stopPropagation()} initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} transition={{type:"spring",stiffness:320,damping:24}} style={{background:"#fff",borderRadius:16,padding:22,width:"min(360px, 100%)",textAlign:"center",boxShadow:"0 20px 40px rgba(0,0,0,0.25)"}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#fff",fontSize:"28px"}}>🎤</div>
              <strong style={{fontSize:"16px"}}>Ouvindo...</strong>
              <p className="hint" style={{marginTop:6}}>Fale agora — toque fora para parar</p>
              <button type="button" onClick={stopVoice} style={{marginTop:16,padding:"10px 18px",borderRadius:"999px",border:"1px solid var(--border)",background:"#fff",fontWeight:700,cursor:"pointer"}}>Parar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
