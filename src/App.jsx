import { useState, useEffect } from 'react'

const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzHHIgKxjtDz2ns6RFfaLAiKFvKm2YbAUUPrJhyeCSbAnKG4rrokc4Qd9uJ0dNZlrxexg/exec";
const REDIRECT_URL = "https://4volts.my.canva.site";

// Logo kedai disimpan sebagai fail statik di sini, BUKAN ditarik dari server.
// Dulu setiap resit membawa salinan penuh logo (base64 ~42,700 aksara =
// 97% saiz satu resit) - itu yang buat setiap checkout/edit menolak ~44KB
// masuk satu sel Sheet dan hampir mencecah had 50,000 aksara. Resit baru
// tak bawa logo lagi; yang lama masih bawa dan tetap guna logo sendiri.
// Sengaja fail statik dan bukan satu lagi request ke Apps Script: backend
// tu memang sesak waktu petang, dan logo WAJIB muncul untuk customer.
const SHOP_LOGO = "/shop-logo.png";

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
  const warrantyDescs = [...new Set(items.map(it => it.supplierDesc).filter(Boolean))];
  // Box WARRANTY CLAIM hanya relevan kalau ada item yang betul-betul
  // berwaranti (bukan "No Warranty") atau ada terma supplier. Kalau tidak,
  // jangan papar terma default — mengelirukan customer yang beli tanpa waranti.
  const hasWarranty = items.some(it => it.warranty && it.warranty !== "No Warranty");

  // PDF muat SATU muka A4. Dulu html2pdf potong ikut tinggi, jadi resit
  // dengan description item yang panjang keluar 2 muka (kes 4V2608088,
  // 16/8/2026). Kini kanvas dikecilkan ikut kekangan paling ketat - lebar
  // ATAU tinggi - supaya seluruh resit sentiasa masuk satu muka. Resit
  // pendek tak berubah rupa (lebar yang mengikat, sama macam dulu);
  // hanya resit panjang yang mengecut.
  const downloadPdf = async () => {
    const el = document.getElementById("kawasan-resit");
    if (!el || !window.html2pdf) return;
    // minHeight 100dvh + padding bawah 100px (ruang butang terapung) jadi
    // ruang KOSONG dalam tangkapan dan paksa kandungan mengecut lebih dari
    // sepatutnya. Buang sekejap masa capture, pulihkan selepas.
    const prevMinH = el.style.minHeight;
    const prevPadB = el.style.paddingBottom;
    el.style.minHeight = "auto";
    el.style.paddingBottom = "28px";
    const opt = {
      margin: [10, 10, 10, 10],
      filename: "Resit_4VOLTS.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    try {
      const canvas = await window.html2pdf().set(opt).from(el).toCanvas().get("canvas");
      // Bundle html2pdf 0.10.1 TIDAK dedah jsPDF sebagai global (window.jspdf
      // tiada - disahkan dalam browser 16/8/2026), jadi kita pinjam instance
      // dari worker dia sendiri melalui satu elemen kosong, buang muka kosong
      // tu, dan lukis resit sebagai SATU imej pada muka yang bersih.
      const holder = document.createElement("div");
      holder.style.width = "10px";
      holder.style.height = "10px";
      document.body.appendChild(holder);
      const pdf = await window.html2pdf().set(opt).from(holder).toPdf().get("pdf");
      holder.remove();
      pdf.deletePage(1);
      pdf.addPage();
      const M = 10;
      const maxW = pdf.internal.pageSize.getWidth() - M * 2;
      const maxH = pdf.internal.pageSize.getHeight() - M * 2;
      const fit = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * fit;
      const h = canvas.height * fit;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", M + (maxW - w) / 2, M, w, h);
      pdf.save("Resit_4VOLTS.pdf");
    } catch (e) {
      // Kalau apa-apa gagal, guna cara lama. PDF 2 muka masih lebih baik
      // daripada butang yang langsung tak jadi apa-apa.
      try { await window.html2pdf().set(opt).from(el).save(); } catch (e2) {}
    } finally {
      el.style.minHeight = prevMinH;
      el.style.paddingBottom = prevPadB;
    }
  };

  return (
    <div id="kawasan-resit" style={{ minHeight: "100dvh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "28px 22px 100px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 16, borderBottom: "1px dashed #E5E5EA" }}>
        <div style={{ textAlign: "left", flex: 1, paddingRight: 10 }}>
          {/* Hierarki header: nama kedai paling besar, butiran di bawahnya kecil
              tapi masih terbaca. Dulu SEMUA 8px - lebih kecil daripada
              description item (12px), jadi resit nampak terbalik. */}
          <div style={{ fontWeight: 800, fontSize: 14 }}>{biz.name}</div>
          {biz.regNo ? <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>{biz.regNo}</div> : null}
          {biz.address ? <div style={{ fontSize: 9, color: "#444", marginTop: 2, whiteSpace: "pre-line" }}>{biz.address}</div> : null}
          {biz.phone ? <div style={{ fontSize: 9, color: "#444", marginTop: 6 }}>Tel / WhatsApp :<br /><span style={{ textDecoration: "underline" }}>{biz.phone}</span></div> : null}
        </div>
        <div style={{ textAlign: "right" }}><img src={biz.logo || SHOP_LOGO} alt="logo" style={{ maxHeight: 75, maxWidth: 120, objectFit: "contain" }} /></div>
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
                {/* Baris sokongan di bawah nama item - mesti lebih kecil
                    daripada nama item (14px), bukan hampir sama. */}
                {it.warranty && it.warranty !== "No Warranty" ? <div style={{ fontSize: 9.5, color: "#777" }}>Warranty : {it.warranty}</div> : null}
                {it.remark ? <div style={{ fontSize: 9.5, color: "#777", fontStyle: "italic" }}>{it.remark}</div> : null}
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
      {(warrantyDescs.length > 0 || hasWarranty) && (
        <div style={{ marginTop: 18, textAlign: "left", fontSize: 8, color: "#444", lineHeight: 1.5, background: "#F2F2F7", padding: "12px 14px", borderRadius: 8 }}>
          <strong style={{ color: "#1C1C1E" }}>WARRANTY CLAIM</strong>
          {warrantyDescs.length > 0 ? (
            // TIADA bulet. Terma supplier disimpan sebagai teks BERBILANG BARIS
            // yang sudah bernombor sendiri (1) 2) 3)), jadi satu bulet di depan
            // blok hanya melekat pada baris PERTAMA — customer nampak
            // "• 1) Items listed..." sedangkan baris 2 dan 3 kosong di depan.
            // Blok terma lalai di bawah pun tak berbulet. (16/8/2026)
            warrantyDescs.map((desc, i) => <div key={i} style={{ marginTop: i === 0 ? 4 : 2, whiteSpace: "pre-line" }}>{desc}</div>)
          ) : (
            <>
              <div style={{ marginTop: 4 }}>1. Warranty only covers manufacturing defect or hardware failure</div>
              <div>2. Warranty does not cover damage caused by drop, wet, crack, or visible defect</div>
              <div>3. Goods and services sold are not refundable</div>
            </>
          )}
        </div>
      )}
      <p style={{ textAlign: "center", marginTop: 18 }}><a href="https://g.page/r/CZsy48G5EhoIEBM/review" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#1C1C1E", fontWeight: 600, fontSize: 12.5 }}>REVIEW US ON GOOGLE</a></p>
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <span style={{ fontSize: 12, color: "#999" }}>Powered by </span>
        <img src="/logo.png" alt="4VOLTS" style={{ height: 18, verticalAlign: "middle", objectFit: "contain" }} />
      </div>
      <button data-html2canvas-ignore="true"
        onClick={downloadPdf}
        style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 28px", borderRadius: 12, border: "none", background: "#2BA398", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", width: "max-content" }}>
        Download PDF
      </button>
    </div>
  );
};

const FETCH_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [2000, 5000];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Apps Script pulangkan HALAMAN HTML (bukan JSON) bila dia kena throttle
// atau terlebih beban - app POS kongsi backend yang sama. Dulu keadaan
// sementara ni jatuh ke .catch yang sama dengan resit yang betul-betul
// tiada, jadi customer nampak "pautan telah tamat tempoh" sedangkan link
// resit tak pernah expire. Bezakan dua-dua supaya mesej tak menipu.
const fetchReceiptOnce = async (id, signal) => {
  const res = await fetch(SHEET_API_URL + "?action=getReceipt&id=" + encodeURIComponent(id), { signal });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) throw new Error("server-busy");
  return JSON.parse(text);
};

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound | busy

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('id');

    if (!raw) {
      window.location.replace(REDIRECT_URL);
      return;
    }

    const id = decodeReceiptId(raw);
    let cancelled = false;

    (async () => {
      setStatus("loading");
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;
        if (i > 0) {
          // Backoff sebelum cuba lagi - tembak semula serta-merta pada
          // backend yang sedang tersumbat cuma tambah beban.
          await sleep(RETRY_DELAY_MS[i - 1] ?? 5000);
          if (cancelled) return;
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        try {
          const json = await fetchReceiptOnce(id, ctrl.signal);
          if (cancelled) return;
          const receiptData = json?.receiptData ?? json?.data?.receiptData ?? json?.data;
          if (receiptData) {
            setData(typeof receiptData === 'string' ? JSON.parse(receiptData) : receiptData);
            setStatus("ok");
          } else {
            // Server jawab elok - resit ni memang tiada. Muktamad, jangan retry.
            setStatus("notfound");
          }
          return;
        } catch (e) {
          // Sibuk / timeout / network - jatuh ke cubaan seterusnya.
        } finally {
          clearTimeout(timer);
        }
      }
      if (!cancelled) setStatus("busy");
    })();

    return () => { cancelled = true; };
  }, []);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#8E8E93", fontSize: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        Loading receipt...
      </div>
    );
  }

  // Backend sesak / timeout selepas semua cubaan. Berasingan dari "notfound"
  // supaya customer tak diberitahu link dia tamat tempoh (link tak pernah
  // expire) sedangkan masalahnya sementara sahaja.
  if (status === "busy") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#8E8E93", fontSize: 14, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        Server peak, Please Retry
      </div>
    );
  }

  return <ReceiptPage data={status === "notfound" ? null : data} />;
}
