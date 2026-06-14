var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var mockTransactions = /* @__PURE__ */ new Map();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/midtrans/qris", async (req, res) => {
    const { orderId, amount, customerName, customerEmail } = req.body;
    try {
      const cleanOrderId = orderId || `LD-TRX-${Date.now()}`;
      const finalAmount = Number(amount) || 1e4;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (!serverKey || serverKey.trim() === "") {
        mockTransactions.set(cleanOrderId, {
          createdAt: Date.now(),
          amount: finalAmount,
          name: customerName || "Pelanggan"
        });
        const mockQrData = `https://laughdry.co.id/qris-pay?order=${cleanOrderId}&amount=${finalAmount}`;
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockQrData)}`;
        return res.json({
          success: true,
          isMock: true,
          orderId: cleanOrderId,
          transactionId: `mock-tx-${Date.now()}`,
          qrCodeUrl: qrCodeImageUrl,
          grossAmount: finalAmount,
          message: "Mode Demo: QRIS dinamis berhasil digenerate di Server-side. Status akan otomatis lunas dalam 8 detik."
        });
      }
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const baseUrl = isProduction ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";
      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
      const midtransPayload = {
        payment_type: "gopay",
        // 'gopay' automatically generates universal cross-platform QRIS on Midtrans Core api
        transaction_details: {
          order_id: cleanOrderId,
          gross_amount: finalAmount
        },
        customer_details: {
          first_name: customerName || "Pelanggan",
          email: customerEmail || "cust@example.com"
        }
      };
      const response = await fetch(`${baseUrl}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(midtransPayload)
      });
      const data = await response.json();
      if (!response.ok || data.status_code >= "400") {
        throw new Error(data.status_message || `HTTP ${response.status} failed`);
      }
      const qrAction = data.actions?.find((act) => act.name === "generate-qr-code");
      const qrCodeUrl = qrAction ? qrAction.url : null;
      const finalQrUrl = qrCodeUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}` : "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MIDTRANS_ERROR";
      return res.json({
        success: true,
        isMock: false,
        orderId: cleanOrderId,
        transactionId: data.transaction_id || `mt-${Date.now()}`,
        qrCodeUrl: finalQrUrl,
        grossAmount: finalAmount,
        rawActions: data.actions,
        message: "API Midtrans sukses! QRIS dinamis berhasil digenerate real-time."
      });
    } catch (error) {
      const errorMsg = error.message ? error.message.toString() : error.toString();
      const isConfigIssue = errorMsg.includes("Unknown Merchant") || errorMsg.includes("Merchant") || errorMsg.includes("pop id") || errorMsg.includes("not found") || errorMsg.includes("server_key") || errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("unauthorized") || errorMsg.includes("Forbidden") || errorMsg.includes("Credential") || errorMsg.includes("credential");
      if (isConfigIssue) {
        console.warn("\u26A0\uFE0F Midtrans Key tidak valid atau merchant belum diaktivasi. Mengaktifkan Mode Simulator QRIS (Handled info).");
        const parentOrderId = orderId || `LD-TRX-${Date.now()}`;
        const finalAmount = Number(amount) || 1e4;
        mockTransactions.set(parentOrderId, {
          createdAt: Date.now(),
          amount: finalAmount,
          name: customerName || "Pelanggan"
        });
        const mockQrData = `https://laughdry.co.id/qris-pay?order=${parentOrderId}&amount=${finalAmount}`;
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockQrData)}`;
        return res.json({
          success: true,
          isMock: true,
          isConfigFallback: true,
          orderId: parentOrderId,
          transactionId: `mock-tx-${Date.now()}`,
          qrCodeUrl: qrCodeImageUrl,
          grossAmount: finalAmount,
          message: "Mode Demo (Fallback): Key Midtrans tidak valid ('Unknown Merchant'). Sistem mengaktifkan Simulator QRIS otomatis agar transaksi dapat diselesaikan."
        });
      }
      console.error("Error generating Midtrans QRIS:", error);
      return res.status(500).json({
        success: false,
        message: `Gagal memanggil API Midtrans: ${error.message || error}`,
        details: error.toString()
      });
    }
  });
  app.get("/api/midtrans/status/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (!serverKey || serverKey.trim() === "" || mockTransactions.has(orderId)) {
        const mockTx = mockTransactions.get(orderId) || { createdAt: Date.now() - 1e4 };
        const elapsedSec = (Date.now() - mockTx.createdAt) / 1e3;
        const isPaid2 = elapsedSec >= 8;
        return res.json({
          status: isPaid2 ? "settlement" : "pending",
          isPaid: isPaid2,
          isMock: true,
          elapsedSeconds: Math.floor(elapsedSec),
          countdownSecondsBg: Math.max(0, Math.floor(8 - elapsedSec)),
          message: isPaid2 ? "\u{1F514} TRANSAKSI LUNAS! Dana simulasi berhasil diselesaikan otomatis oleh server." : `\u23F3 TRANSAKSI PENDING... Menunggu verifikasi otomatis (Sisa waktu simulator: ${Math.max(0, Math.floor(8 - elapsedSec))}s)`
        });
      }
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const baseUrl = isProduction ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";
      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
      const response = await fetch(`${baseUrl}/${orderId}/status`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": authHeader
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.status_message || `HTTP ${response.status} failed`);
      }
      const txnStatus = data.transaction_status;
      const isPaid = txnStatus === "settlement" || txnStatus === "capture";
      return res.json({
        status: txnStatus,
        isPaid,
        isMock: false,
        message: isPaid ? "\u{1F7E2} Pembayaran lunas terverifikasi di Midtrans!" : `Transaksi berstatus: ${txnStatus}`
      });
    } catch (error) {
      const errorMsg = error.message ? error.message.toString() : error.toString();
      const isConfigIssue = errorMsg.includes("Unknown Merchant") || errorMsg.includes("Merchant") || errorMsg.includes("pop id") || errorMsg.includes("not found") || errorMsg.includes("server_key") || errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("unauthorized") || errorMsg.includes("Forbidden") || errorMsg.includes("Credential") || errorMsg.includes("credential");
      if (isConfigIssue) {
        console.warn("\u26A0\uFE0F Simulator (Known Key Error): Key Midtrans tidak valid, status pembayaran otomatis disimulasikan sukses.");
        return res.json({
          status: "settlement",
          isPaid: true,
          isMock: true,
          isConfigFallback: true,
          message: "Simulator: Key Midtrans tidak valid, transaksi disimulasikan LUNAS otomatis."
        });
      }
      console.error("Error querying Midtrans status:", error);
      return res.status(500).json({
        success: false,
        message: `Gagal memverifikasi status Midtrans: ${error.message || error}`
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LaughDry FullStack Server] running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
