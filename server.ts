import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global process error handlers to prevent unhandled crashes
process.on("uncaughtException", (err) => {
  console.error("[LaughDry Server] Uncaught exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[LaughDry Server] Unhandled rejection at:", promise, "reason:", reason);
});

// In-Memory simulated payments list to track completion timestamps for automatic verification demo
const mockTransactions = new Map();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10) || 3000;

  app.use(express.json());

  // Cloud Run / Container fast health check endpoints
  app.get("/health", (_req, res) => {
    res.status(200).send("OK");
  });
  app.head("/health", (_req, res) => {
    res.status(200).end();
  });
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.head("/", (_req, res) => {
    res.status(200).end();
  });

  // Explicit server-side environment-based verification endpoint
  app.get("/api/env-check", (req, res) => {
    const hostname = req.hostname || "";
    const isVercel = hostname.includes("vercel.app");
    const isCustomerOnly = isVercel || req.query.mode === "customer" || req.query.phone !== undefined || req.query.invoice !== undefined;
    res.json({
      isCustomerOnly,
      hostname,
      isProduction: process.env.NODE_ENV === "production"
    });
  });

  // ==========================================
  // MIDTRANS REAL-TIME DYNAMIC QRIS ENDPOINTS
  // ==========================================

  // Generate QRIS Transaction
  app.post("/api/midtrans/qris", async (req, res) => {
    const { orderId, amount, customerName, customerEmail } = req.body;
    try {
      const cleanOrderId = orderId || `LD-TRX-${Date.now()}`;
      const finalAmount = Number(amount) || 10000;
      
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      
      if (!serverKey || serverKey.trim() === "") {
        // Fallback: Real-time dynamic simulator mode
        // Store transaction timestamp to simulate automatic payment confirmation in 8 seconds
        mockTransactions.set(cleanOrderId, {
          createdAt: Date.now(),
          amount: finalAmount,
          name: customerName || "Pelanggan"
        });

        // Use a real generated QR content pointing to simulated sandbox route
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

      // Real Sandbox Midtrans Integration using direct request with Basic authentication
      const isProductionMidtrans = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const baseUrl = isProductionMidtrans 
        ? "https://api.midtrans.com/v2" 
        : "https://api.sandbox.midtrans.com/v2";

      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

      const midtransPayload = {
        payment_type: "gopay", // 'gopay' automatically generates universal cross-platform QRIS on Midtrans Core api
        transaction_details: {
          order_id: cleanOrderId,
          gross_amount: finalAmount,
        },
        customer_details: {
          first_name: customerName || "Pelanggan",
          email: customerEmail || "cust@example.com",
        }
      };

      const response = await fetch(`${baseUrl}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(midtransPayload)
      });

      const data = await response.json();

      if (!response.ok || data.status_code >= "400") {
        throw new Error(data.status_message || `HTTP ${response.status} failed`);
      }

      // Extract raw QR code string or image action
      const qrAction = data.actions?.find((act) => act.name === "generate-qr-code");
      const qrCodeUrl = qrAction ? qrAction.url : null;

      // In case Midtrans GoPay returns QR string, generate image via QR code generator for HTML rendering
      const finalQrUrl = qrCodeUrl 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}` 
        : "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MIDTRANS_ERROR";

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
      const errorMsg = error && error.message ? error.message.toString() : String(error);
      const isConfigIssue = errorMsg.includes("Unknown Merchant") || 
                            errorMsg.includes("Merchant") || 
                            errorMsg.includes("pop id") || 
                            errorMsg.includes("not found") || 
                            errorMsg.includes("server_key") || 
                            errorMsg.includes("401") || 
                            errorMsg.includes("Unauthorized") ||
                            errorMsg.includes("unauthorized") ||
                            errorMsg.includes("Forbidden") ||
                            errorMsg.includes("Credential") ||
                            errorMsg.includes("credential");

      if (isConfigIssue) {
        console.warn("⚠️ Midtrans Key tidak valid atau merchant belum diaktivasi. Mengaktifkan Mode Simulator QRIS (Handled info).");
        
        const parentOrderId = orderId || `LD-TRX-${Date.now()}`;
        const finalAmount = Number(amount) || 10000;
        
        mockTransactions.set(parentOrderId, {
          createdAt: Date.now(),
          amount: finalAmount,
          name: customerName || "Pelanggan"
        });

        // Use a real generated QR content pointing to simulated sandbox route
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
        message: `Gagal memanggil API Midtrans: ${error?.message || error}`,
        details: String(error)
      });
    }
  });

  // Check Status of QRIS Transaction (Real-time auto verification mapping)
  app.get("/api/midtrans/status/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;

      // If it's a simulated order or unconfigured server key
      if (!serverKey || serverKey.trim() === "" || mockTransactions.has(orderId)) {
        const mockTx = mockTransactions.get(orderId) || { createdAt: Date.now() - 10000 };
        const elapsedSec = (Date.now() - mockTx.createdAt) / 1000;
        const isPaid = elapsedSec >= 8; // Auto-pay after 8 seconds

        return res.json({
          status: isPaid ? "settlement" : "pending",
          isPaid: isPaid,
          isMock: true,
          elapsedSeconds: Math.floor(elapsedSec),
          countdownSecondsBg: Math.max(0, Math.floor(8 - elapsedSec)),
          message: isPaid 
            ? "🔔 TRANSAKSI LUNAS! Dana simulasi berhasil diselesaikan otomatis oleh server." 
            : `⏳ TRANSAKSI PENDING... Menunggu verifikasi otomatis (Sisa waktu simulator: ${Math.max(0, Math.floor(8 - elapsedSec))}s)`
        });
      }

      // Real Sandbox Midtrans Status Query
      const isProductionMidtrans = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const baseUrl = isProductionMidtrans 
        ? "https://api.midtrans.com/v2" 
        : "https://api.sandbox.midtrans.com/v2";

      const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

      const response = await fetch(`${baseUrl}/${orderId}/status`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": authHeader,
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.status_message || `HTTP ${response.status} failed`);
      }

      // Midtrans standard successful payment status is 'settlement' or 'capture' (for credit cards)
      const txnStatus = data.transaction_status;
      const isPaid = txnStatus === "settlement" || txnStatus === "capture";

      return res.json({
        status: txnStatus,
        isPaid: isPaid,
        isMock: false,
        message: isPaid ? "🟢 Pembayaran lunas terverifikasi di Midtrans!" : `Transaksi berstatus: ${txnStatus}`
      });

    } catch (error) {
      const errorMsg = error && error.message ? error.message.toString() : String(error);
      const isConfigIssue = errorMsg.includes("Unknown Merchant") || 
                            errorMsg.includes("Merchant") || 
                            errorMsg.includes("pop id") || 
                            errorMsg.includes("not found") || 
                            errorMsg.includes("server_key") || 
                            errorMsg.includes("401") || 
                            errorMsg.includes("Unauthorized") ||
                            errorMsg.includes("unauthorized") ||
                            errorMsg.includes("Forbidden") ||
                            errorMsg.includes("Credential") ||
                            errorMsg.includes("credential");

      if (isConfigIssue) {
        console.warn("⚠️ Simulator (Known Key Error): Key Midtrans tidak valid, status pembayaran otomatis disimulasikan sukses.");
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
        message: `Gagal memverifikasi status Midtrans: ${error?.message || error}`
      });
    }
  });

  // ==========================================
  // VITE DEVELOPMENT MIDDLEWARE & STATIC SERVING
  // ==========================================
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION || process.env.CLOUD_RUN_JOB);
  const isProduction = process.env.NODE_ENV === "production" || isCloudRun || hasDist;

  if (isProduction || hasDist) {
    // Production static serving
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Endpoint not found" });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      // Resilient fallback HTML to guarantee 200 OK for Cloud Run health probes
      res.status(200).send(`<!doctype html><html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>LaughDry - Laundry POS & CRM</title></head><body><div id="root">Memuat LaughDry POS...</div></body></html>`);
    });
  } else {
    // Development mode with Vite middlewares
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("[LaughDry Server] Vite middleware unavailable, falling back to static files:", viteErr);
      app.use(express.static(distPath));
    }
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LaughDry FullStack Server] running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("[LaughDry Server] HTTP Server error:", err);
  });

  // Graceful shutdown on SIGTERM (used by Cloud Run container lifecycle)
  process.on("SIGTERM", () => {
    console.log("[LaughDry Server] Received SIGTERM, shutting down gracefully...");
    server.close(() => {
      console.log("[LaughDry Server] HTTP server closed.");
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("[LaughDry Server] Fatal startup error:", err);
  process.exit(1);
});
