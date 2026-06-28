import { useState, useEffect } from 'react'

const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwt0ezhFZRU9K8oiWjNmhtqYeT8g0mB3FW8aq_1RZ2S2_-xoPKKN52PCYUCiAkaQQIdDQ/exec";
const REDIRECT_URL = "https://4volts.my.canva.site";

// Copied from POSS/src/App.jsx
export const encodeReceipt = (data) => {
  try {
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) { return ""; }
};

// Copied from POSS/src/App.jsx
export const decodeReceipt = (str) => {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  } catch (e) { return null; }
};

// Decode token from POSS receipt URL; falls back to raw value for old plain-ID links
const xorDecode = (token) => {
  try {
    const decoded = atob(token);
    return decoded.split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + i % 7))).join('');
  } catch (e) { return token; }
};
const decodeReceiptId = xorDecode;

// Copied from POSS/src/App.jsx
export const ReceiptPage = ({ data }) => {
  if (!data) {
    return (
      <div id="kawasan-resit" style={{ minHeight: "auto", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "40px", maxWidth: 800, margin: "0 auto", color: "#000" }}>
        <button className="no-print" onClick={() => { const w = window.open("","_blank"); w.document.write(`<html><head><title>Resit</title></head><body>${document.getElementById("kawasan-resit").innerHTML}</body></html>`); w.document.close(); setTimeout(() => w.print(), 500); }}
          style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 28px", borderRadius: 12, border: "none", background: "#2BA398", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          Save / Print Receipt
        </button>
        <p style={{ color: "#8E8E93", fontSize: 14 }}>Resit tidak sah atau pautan telah tamat tempoh.</p>
      </div>
    );
  }
  const { biz, items, total, method, tech, receiptNo, date, pointsEarned, pointDiscount, phone, issue } = data;
  return (
    <div id="kawasan-resit" style={{ minHeight: "100dvh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "28px 22px 100px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 16, borderBottom: "1px dashed #E5E5EA" }}>
        <div style={{ textAlign: "left", flex: 1, paddingRight: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 8 }}>{biz.name}</div>
          {biz.regNo ? <div style={{ fontSize: 8, color: "#444", marginTop: 4 }}>{biz.regNo}</div> : null}
          {biz.address ? <div style={{ fontSize: 8, color: "#444", marginTop: 2, whiteSpace: "pre-line" }}>{biz.address}</div> : null}
          {biz.phone ? <div style={{ fontSize: 8, color: "#444", marginTop: 6 }}>Tel / WhatsApp :<br /><span style={{ textDecoration: "underline" }}>{biz.phone}</span></div> : null}
        </div>
        {biz.logo ? <div style={{ textAlign: "right" }}><img src={biz.logo} alt="logo" style={{ maxHeight: 75, maxWidth: 120, objectFit: "contain" }} /></div> : null}
      </div>
      <div style={{ fontSize: 9, lineHeight: 1.7, display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}><span style={{ width: 80, textAlign: "right", color: "#666" }}>Receipt No:</span><span style={{ fontWeight: 600 }}>{receiptNo}</span></div>
        <div style={{ display: "flex", gap: 8 }}><span style={{ width: 80, textAlign: "right", color: "#666" }}>Date:</span><span style={{ fontWeight: 600 }}>{date}</span></div>
        {tech ? <div style={{ display: "flex", gap: 8 }}><span style={{ width: 80, textAlign: "right", color: "#666" }}>By:</span><span style={{ fontWeight: 600 }}>{tech}</span></div> : null}
      </div>
      {phone ? <div style={{ fontSize: 11, textAlign: "left", marginBottom: 14 }}><span style={{ color: "#666" }}>To : </span><span style={{ fontWeight: 600 }}>{phone}</span></div> : null}
      {issue ? <div style={{ fontSize: 11, textAlign: "left", marginBottom: 14 }}><span style={{ color: "#666" }}>Issue : </span><span style={{ fontWeight: 600 }}>{issue}</span></div> : null}
      <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup><col style={{ width: "64%" }} /><col style={{ width: "14%" }} /><col style={{ width: "22%" }} /></colgroup>
        <thead>
          <tr style={{ borderBottom: "2px solid #1C1C1E" }}>
            <th style={{ textAlign: "left", paddingBottom: 8, fontWeight: 700 }}>Item</th>
            <th style={{ textAlign: "center", paddingBottom: 8, fontWeight: 700 }}>Qty</th>
            <th style={{ textAlign: "right", paddingBottom: 8, fontWeight: 700 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: i === items.length - 1 ? "2px solid #1C1C1E" : "none" }}>
              <td style={{ padding: "13px 0", verticalAlign: "top" }}>
                {it.name}
                {it.warranty && it.warranty !== "Tiada Waranti" ? <div style={{ fontSize: 12, color: "#777" }}>Waranti : {it.warranty}</div> : null}
                {it.remark ? <div style={{ fontSize: 12, color: "#777", fontStyle: "italic" }}>{it.remark}</div> : null}
              </td>
              <td style={{ textAlign: "center", padding: "13px 0", verticalAlign: "top" }}>{it.qty}</td>
              <td style={{ textAlign: "right", padding: "13px 0", verticalAlign: "top", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{(it.price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 13 }}>
        {pointDiscount > 0 ? <div style={{ display: "flex", justifyContent: "space-between", color: "#34C759", marginBottom: 4 }}><span>Point Discount</span><span>− {pointDiscount.toFixed(2)}</span></div> : null}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, marginTop: 4 }}><span>Total :</span><span>{total.toFixed(2)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span>Payment :</span><span>{method}</span></div>
        {pointsEarned > 0 ? <div style={{ display: "flex", justifyContent: "space-between", color: "#FF2D55", marginTop: 2 }}><span>Points Earned :</span><span>+{pointsEarned}</span></div> : null}
      </div>
      <p style={{ textAlign: "center", marginTop: 28, fontSize: 15 }}>Thank you for your business.</p>
      <div style={{ marginTop: 18, textAlign: "left", fontSize: 8, color: "#444", lineHeight: 1.5, background: "#F2F2F7", padding: "12px 14px", borderRadius: 8 }}>
        <strong style={{ color: "#1C1C1E" }}>WARRANTY CLAIM</strong>
        <div style={{ marginTop: 4 }}>1. Warranty only covers manufacturing defect or hardware failure</div>
        <div>2. Warranty does not cover damage caused by drop, wet, crack, or visible defect</div>
        <div>3. Goods and services sold are not refundable</div>
      </div>
      <p style={{ textAlign: "center", marginTop: 18, fontSize: 12.5, fontWeight: 600 }}>REVIEW US ON GOOGLE</p>
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <span style={{ fontSize: 12, color: "#999" }}>Powered by </span>
        <img src="/logo.png" alt="4VOLTS" style={{ height: 18, verticalAlign: "middle", objectFit: "contain" }} />
      </div>
      <button data-html2canvas-ignore="true"
        onClick={() => { const el = document.getElementById("kawasan-resit"); const opt = { margin:[10,10,10,10], filename:"Resit_4VOLTS.pdf", image:{type:"jpeg",quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:"mm",format:"a4",orientation:"portrait"} }; window.html2pdf().set(opt).from(el).save(); }}
        style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 28px", borderRadius: 12, border: "none", background: "#2BA398", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", width: "max-content" }}>
        Download PDF
      </button>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('id');

    if (!raw) {
      window.location.replace(REDIRECT_URL);
      return;
    }

    const id = decodeReceiptId(raw);

    fetch(SHEET_API_URL + "?action=getReceipt&id=" + encodeURIComponent(id))
      .then(r => r.json())
      .then(json => {
        const receiptData = json?.receiptData ?? json?.data?.receiptData ?? json?.data;
        if (receiptData) {
          const parsed = typeof receiptData === 'string' ? JSON.parse(receiptData) : receiptData;
          setData(parsed);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#8E8E93", fontSize: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        Loading receipt...
      </div>
    );
  }

  return <ReceiptPage data={notFound ? null : data} />;
}
