import prisma from '../lib/prisma.js';
import { sendServiceExpiryWarningEmail } from '../utils/mailer.js';
import tls from 'tls';
import https from 'https';

// ── Ensure MySQL Table Exists via Raw SQL Fallback ─────────────────────────
const ensureTableExists = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`client_services\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`client_name\` VARCHAR(255) NOT NULL,
        \`company_name\` VARCHAR(255) NOT NULL DEFAULT '',
        \`client_email\` VARCHAR(255) NOT NULL,
        \`client_phone\` VARCHAR(255) NOT NULL DEFAULT '',
        \`service_type\` VARCHAR(255) NOT NULL DEFAULT 'Domain Name',
        \`service_name\` VARCHAR(255) NOT NULL,
        \`provider\` VARCHAR(255) NOT NULL DEFAULT 'GoDaddy',
        \`purchase_date\` DATE NULL,
        \`expiry_date\` DATE NOT NULL,
        \`renewal_amount\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`auto_renew\` TINYINT(1) NOT NULL DEFAULT 0,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Active',
        \`last_alert_sent_at\` DATETIME NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error('ensureTableExists error:', err.message);
  }
};

// ── Helper: Calculate Days Remaining ─────────────────────────────────────
const calculateDaysRemaining = (targetDate) => {
  if (!targetDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ── 1. GET ALL CLIENT SERVICES ───────────────────────────────────────────
export const getAllClientServices = async (req, res) => {
  try {
    let services = [];

    if (prisma.clientService) {
      services = await prisma.clientService.findMany({
        orderBy: { expiryDate: 'asc' }
      });
    } else {
      await ensureTableExists();
      const rawRows = await prisma.$queryRawUnsafe(`
        SELECT id, client_name AS clientName, company_name AS companyName,
               client_email AS clientEmail, client_phone AS clientPhone,
               service_type AS serviceType, service_name AS serviceName,
               provider, purchase_date AS purchaseDate, expiry_date AS expiryDate,
               renewal_amount AS renewalAmount, auto_renew AS autoRenew,
               status, last_alert_sent_at AS lastAlertSentAt, notes, created_at AS createdAt
        FROM client_services
        ORDER BY expiry_date ASC
      `);
      services = (rawRows || []).map(r => ({
        ...r,
        autoRenew: Boolean(r.autoRenew)
      }));
    }

    const formatted = services.map(s => {
      const daysLeft = calculateDaysRemaining(s.expiryDate);

      let status = s.status || 'Active';
      if (daysLeft !== null) {
        if (daysLeft <= 0) {
          status = 'Expired';
        } else if (daysLeft <= 30) {
          status = 'Expiring Soon';
        } else {
          status = 'Active';
        }
      }

      return {
        ...s,
        status,
        daysLeft,
        renewalAmount: Number(s.renewalAmount || 0)
      };
    });

    const metrics = {
      total: formatted.length,
      expiredCount: formatted.filter(s => s.daysLeft !== null && s.daysLeft <= 0).length,
      criticalCount: formatted.filter(s => s.daysLeft !== null && s.daysLeft > 0 && s.daysLeft <= 7).length,
      expiringSoonCount: formatted.filter(s => s.daysLeft !== null && s.daysLeft > 7 && s.daysLeft <= 30).length,
      activeCount: formatted.filter(s => s.daysLeft === null || s.daysLeft > 30).length,
      totalRenewalRevenue: formatted.reduce((acc, curr) => acc + (curr.renewalAmount || 0), 0)
    };

    return res.json({
      success: true,
      data: formatted,
      metrics
    });
  } catch (error) {
    console.error('[GET /api/client-services]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch client services' });
  }
};

// ── 2. CREATE CLIENT SERVICE ─────────────────────────────────────────────
export const createClientService = async (req, res) => {
  try {
    const {
      clientName, companyName, clientEmail, clientPhone,
      serviceType, serviceName, provider, purchaseDate,
      expiryDate, renewalAmount, autoRenew, notes
    } = req.body;

    if (!clientName || !clientEmail || !serviceName || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Client name, client email, service name, and expiry date are required' });
    }

    const parseValidDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const cleanServiceName = serviceName ? serviceName.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim() : 'service';
    const parsedPurchaseDate = parseValidDate(purchaseDate);
    const parsedExpiryDate = parseValidDate(expiryDate) || new Date();
    const purchaseD = parsedPurchaseDate ? parsedPurchaseDate.toISOString().split('T')[0] : null;
    const expiryD = parsedExpiryDate.toISOString().split('T')[0];
    const amountVal = renewalAmount ? parseFloat(renewalAmount) : 0;
    const isAuto = autoRenew ? 1 : 0;

    let newService;

    if (prisma.clientService) {
      newService = await prisma.clientService.create({
        data: {
          clientName: clientName.trim(),
          companyName: companyName ? companyName.trim() : '',
          clientEmail: clientEmail.trim().toLowerCase(),
          clientPhone: clientPhone ? clientPhone.trim() : '',
          serviceType: serviceType || 'Domain Name',
          serviceName: cleanServiceName,
          provider: provider || 'GoDaddy',
          purchaseDate: parsedPurchaseDate,
          expiryDate: parsedExpiryDate,
          renewalAmount: amountVal,
          autoRenew: Boolean(autoRenew),
          notes: notes ? notes.trim() : ''
        }
      });
    } else {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(`
        INSERT INTO client_services (
          client_name, company_name, client_email, client_phone,
          service_type, service_name, provider, purchase_date,
          expiry_date, renewal_amount, auto_renew, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        clientName.trim(),
        companyName ? companyName.trim() : '',
        clientEmail.trim().toLowerCase(),
        clientPhone ? clientPhone.trim() : '',
        serviceType || 'Domain Name',
        cleanServiceName,
        provider || 'GoDaddy',
        purchaseD,
        expiryD,
        amountVal,
        isAuto,
        notes ? notes.trim() : ''
      );

      const createdRows = await prisma.$queryRawUnsafe(`
        SELECT id, client_name AS clientName, company_name AS companyName,
               client_email AS clientEmail, client_phone AS clientPhone,
               service_type AS serviceType, service_name AS serviceName,
               provider, purchase_date AS purchaseDate, expiry_date AS expiryDate,
               renewal_amount AS renewalAmount, auto_renew AS autoRenew,
               status, last_alert_sent_at AS lastAlertSentAt, notes, created_at AS createdAt
        FROM client_services
        ORDER BY id DESC LIMIT 1
      `);
      newService = createdRows[0];
    }

    return res.json({
      success: true,
      message: `Client service ${cleanServiceName} added successfully!`,
      data: newService
    });
  } catch (error) {
    console.error('[POST /api/client-services]', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create client service' });
  }
};

// ── 3. UPDATE CLIENT SERVICE ─────────────────────────────────────────────
export const updateClientService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      clientName, companyName, clientEmail, clientPhone,
      serviceType, serviceName, provider, purchaseDate,
      expiryDate, renewalAmount, autoRenew, notes, status
    } = req.body;

    let existing;
    if (prisma.clientService) {
      existing = await prisma.clientService.findUnique({ where: { id } });
    } else {
      await ensureTableExists();
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM client_services WHERE id = ? LIMIT 1`, id);
      existing = rows[0];
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client service record not found' });
    }

    const cleanServiceName = serviceName ? serviceName.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim() : (existing.serviceName || existing.service_name);
    const purchaseD = purchaseDate ? new Date(purchaseDate).toISOString().split('T')[0] : (existing.purchaseDate || existing.purchase_date);
    const expiryD = expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : (existing.expiryDate || existing.expiry_date);
    const amountVal = renewalAmount !== undefined ? parseFloat(renewalAmount) : Number(existing.renewalAmount || existing.renewal_amount || 0);
    const isAuto = autoRenew !== undefined ? (autoRenew ? 1 : 0) : (existing.autoRenew || existing.auto_renew ? 1 : 0);

    let updated;
    if (prisma.clientService) {
      updated = await prisma.clientService.update({
        where: { id },
        data: {
          clientName: clientName !== undefined ? clientName.trim() : existing.clientName,
          companyName: companyName !== undefined ? companyName.trim() : existing.companyName,
          clientEmail: clientEmail !== undefined ? clientEmail.trim().toLowerCase() : existing.clientEmail,
          clientPhone: clientPhone !== undefined ? clientPhone.trim() : existing.clientPhone,
          serviceType: serviceType !== undefined ? serviceType : existing.serviceType,
          serviceName: cleanServiceName,
          provider: provider !== undefined ? provider : existing.provider,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
          expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate,
          renewalAmount: amountVal,
          autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : Boolean(existing.autoRenew),
          status: status !== undefined ? status : existing.status,
          notes: notes !== undefined ? notes.trim() : existing.notes
        }
      });
    } else {
      await prisma.$executeRawUnsafe(`
        UPDATE client_services SET
          client_name = ?, company_name = ?, client_email = ?, client_phone = ?,
          service_type = ?, service_name = ?, provider = ?, purchase_date = ?,
          expiry_date = ?, renewal_amount = ?, auto_renew = ?, notes = ?
        WHERE id = ?
      `,
        clientName !== undefined ? clientName.trim() : existing.client_name,
        companyName !== undefined ? companyName.trim() : existing.company_name,
        clientEmail !== undefined ? clientEmail.trim().toLowerCase() : existing.client_email,
        clientPhone !== undefined ? clientPhone.trim() : existing.client_phone,
        serviceType !== undefined ? serviceType : existing.service_type,
        cleanServiceName,
        provider !== undefined ? provider : existing.provider,
        purchaseD,
        expiryD,
        amountVal,
        isAuto,
        notes !== undefined ? notes.trim() : existing.notes,
        id
      );

      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM client_services WHERE id = ? LIMIT 1`, id);
      updated = rows[0];
    }

    return res.json({
      success: true,
      message: 'Client service record updated successfully!',
      data: updated
    });
  } catch (error) {
    console.error('[PUT /api/client-services/:id]', error);
    return res.status(500).json({ success: false, message: 'Failed to update client service record' });
  }
};

// ── 4. DELETE CLIENT SERVICE ─────────────────────────────────────────────
export const deleteClientService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (prisma.clientService) {
      await prisma.clientService.delete({ where: { id } });
    } else {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(`DELETE FROM client_services WHERE id = ?`, id);
    }
    return res.json({ success: true, message: 'Client service record deleted successfully!' });
  } catch (error) {
    console.error('[DELETE /api/client-services/:id]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete client service record' });
  }
};

// ── 5. TRIGGER MANUAL RENEWAL WARNING EMAIL TO CLIENT & ADMIN ────────────
export const sendRenewalAlertEmail = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    let service;

    if (prisma.clientService) {
      service = await prisma.clientService.findUnique({ where: { id } });
    } else {
      await ensureTableExists();
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, client_name AS clientName, company_name AS companyName,
               client_email AS clientEmail, client_phone AS clientPhone,
               service_type AS serviceType, service_name AS serviceName,
               provider, purchase_date AS purchaseDate, expiry_date AS expiryDate,
               renewal_amount AS renewalAmount, auto_renew AS autoRenew,
               status, last_alert_sent_at AS lastAlertSentAt, notes, created_at AS createdAt
        FROM client_services WHERE id = ? LIMIT 1
      `, id);
      service = rows[0];
    }

    if (!service) {
      return res.status(404).json({ success: false, message: 'Client service record not found' });
    }

    const daysLeft = calculateDaysRemaining(service.expiryDate);

    const emailRes = await sendServiceExpiryWarningEmail({
      clientName: service.clientName,
      clientEmail: service.clientEmail,
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      provider: service.provider,
      expiryDate: service.expiryDate,
      daysLeft,
      renewalAmount: service.renewalAmount,
      notes: service.notes
    });

    if (emailRes && emailRes.success === false) {
      return res.status(500).json({
        success: false,
        message: `Email sending failed: ${emailRes.message || 'SMTP Authentication / Connection error'}`
      });
    }

    if (prisma.clientService) {
      await prisma.clientService.update({
        where: { id },
        data: { lastAlertSentAt: new Date() }
      });
    } else {
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await prisma.$executeRawUnsafe(`UPDATE client_services SET last_alert_sent_at = ? WHERE id = ?`, nowStr, id);
    }

    return res.json({
      success: true,
      message: `Renewal alert email sent to ${service.clientEmail} and Admin!`,
      details: emailRes
    });
  } catch (error) {
    console.error('[POST /api/client-services/send-alert/:id]', error);
    return res.status(500).json({ success: false, message: 'Failed to send alert email: ' + error.message });
  }
};

// ── 6. AUTO LOOKUP DOMAIN & SSL EXPIRY DATES ─────────────────────────────
export const autoLookupDomainExpiry = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain / hostname is required' });
    }

    const cleanHost = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();

    let sslValidTo = null;
    try {
      sslValidTo = await new Promise((resolve) => {
        const socket = tls.connect(443, cleanHost, { servername: cleanHost, timeout: 5000 }, () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (cert && cert.valid_to) {
            resolve(new Date(cert.valid_to));
          } else {
            resolve(null);
          }
        });
        socket.on('error', () => resolve(null));
        socket.on('timeout', () => { socket.destroy(); resolve(null); });
      });
    } catch (e) {
      sslValidTo = null;
    }

    let domainExpiryDate = null;
    let registrarName = 'GoDaddy';

    try {
      const rdapRes = await new Promise((resolve) => {
        const req = https.get(`https://rdap.org/domain/${cleanHost}`, { timeout: 6000 }, (response) => {
          let body = '';
          response.on('data', chunk => body += chunk);
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
      });

      if (rdapRes && rdapRes.events) {
        const expirationEvent = rdapRes.events.find(e => e.eventAction === 'expiration' || e.eventAction === 'registration expiration');
        if (expirationEvent && expirationEvent.eventDate) {
          domainExpiryDate = new Date(expirationEvent.eventDate);
        }
      }

      if (rdapRes && rdapRes.entities) {
        const registrarEntity = rdapRes.entities.find(e => e.roles && e.roles.includes('registrar'));
        if (registrarEntity && registrarEntity.vcardArray) {
          const fn = registrarEntity.vcardArray[1]?.find(item => item[0] === 'fn');
          if (fn && fn[3]) {
            registrarName = fn[3];
          }
        }
      }
    } catch (e) {
      domainExpiryDate = null;
    }

    if (!domainExpiryDate) {
      if (sslValidTo) {
        domainExpiryDate = new Date(sslValidTo);
      } else {
        const fallback = new Date();
        fallback.setFullYear(fallback.getFullYear() + 1);
        domainExpiryDate = fallback;
      }
    }

    return res.json({
      success: true,
      serviceName: cleanHost,
      expiryDate: domainExpiryDate ? domainExpiryDate.toISOString().split('T')[0] : null,
      sslExpiryDate: sslValidTo ? sslValidTo.toISOString().split('T')[0] : null,
      provider: registrarName,
      daysLeft: domainExpiryDate ? calculateDaysRemaining(domainExpiryDate) : null
    });
  } catch (error) {
    console.error('[POST /api/client-services/auto-lookup]', error);
    return res.status(500).json({ success: false, message: 'Auto lookup failed: ' + error.message });
  }
};

// ── 7. AUTOMATED EXPIRY ALERT CRON JOB RUNNER ────────────────────────────
export const runAutoExpiryAlertCron = async (req = null, res = null) => {
  console.log('\n[Auto Email Cron] Starting daily client service expiry check...');
  try {
    let services = [];
    if (prisma.clientService) {
      services = await prisma.clientService.findMany({ orderBy: { expiryDate: 'asc' } });
    } else {
      await ensureTableExists();
      const rawRows = await prisma.$queryRawUnsafe(`
        SELECT id, client_name AS clientName, company_name AS companyName,
               client_email AS clientEmail, client_phone AS clientPhone,
               service_type AS serviceType, service_name AS serviceName,
               provider, purchase_date AS purchaseDate, expiry_date AS expiryDate,
               renewal_amount AS renewalAmount, auto_renew AS autoRenew,
               status, last_alert_sent_at AS lastAlertSentAt, notes, created_at AS createdAt
        FROM client_services ORDER BY expiry_date ASC
      `);
      services = rawRows || [];
    }

    const now = new Date();
    let sentCount = 0;
    let skippedCount = 0;
    const dispatchedDetails = [];

    const toLocalDateStr = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const todayStr = toLocalDateStr(now);

    for (const service of services) {
      const daysLeft = calculateDaysRemaining(service.expiryDate);

      // Trigger alerts if service is expiring within 30 days or is already expired
      if (daysLeft !== null && daysLeft <= 30) {
        if (!service.clientEmail || !service.clientEmail.trim()) {
          console.warn(`[Auto Email Cron] Skipping '${service.serviceName}' - No valid client email provided.`);
          continue;
        }

        // Prevent duplicate alerts sent on the exact same calendar day
        const lastSentStr = toLocalDateStr(service.lastAlertSentAt);

        if (lastSentStr !== todayStr) {
          console.log(`[Auto Email Cron] Dispatching alert for '${service.serviceName}' (${service.clientEmail}) - Days left: ${daysLeft}`);
          try {
            const emailRes = await sendServiceExpiryWarningEmail({
              clientName: service.clientName,
              clientEmail: service.clientEmail,
              serviceName: service.serviceName,
              serviceType: service.serviceType,
              provider: service.provider,
              expiryDate: service.expiryDate,
              daysLeft,
              renewalAmount: service.renewalAmount,
              notes: service.notes
            });

            if (!emailRes || emailRes.success !== false) {
              sentCount++;
              dispatchedDetails.push({ service: service.serviceName, email: service.clientEmail, daysLeft });

              // Update lastAlertSentAt timestamp
              if (prisma.clientService) {
                await prisma.clientService.update({
                  where: { id: service.id },
                  data: { lastAlertSentAt: now }
                });
              } else {
                const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                await prisma.$executeRawUnsafe(`UPDATE client_services SET last_alert_sent_at = ? WHERE id = ?`, nowStr, service.id);
              }
            } else {
              console.warn(`[Auto Email Cron] Email returned error for '${service.serviceName}':`, emailRes?.message);
            }
          } catch (itemErr) {
            console.error(`[Auto Email Cron] Failed sending alert for '${service.serviceName}':`, itemErr.message);
          }
        } else {
          skippedCount++;
        }
      }
    }

    const summaryMsg = `Auto-alert scan complete. Dispatched ${sentCount} alert email(s) (${skippedCount} skipped as recently sent).`;
    console.log(`[Auto Email Cron] ✅ ${summaryMsg}\n`);

    if (res && typeof res.json === 'function') {
      return res.json({
        success: true,
        message: summaryMsg,
        sentCount,
        skippedCount,
        dispatched: dispatchedDetails
      });
    }

    return { success: true, sentCount, skippedCount, summaryMsg };
  } catch (err) {
    console.error('[Auto Email Cron Error]', err);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ success: false, message: 'Auto alert cron error: ' + err.message });
    }
    return { success: false, error: err.message };
  }
};

