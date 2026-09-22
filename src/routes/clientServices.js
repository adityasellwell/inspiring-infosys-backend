import express from 'express';
import {
  getAllClientServices,
  createClientService,
  updateClientService,
  deleteClientService,
  sendRenewalAlertEmail,
  autoLookupDomainExpiry,
  runAutoExpiryAlertCron
} from '../controllers/clientServiceController.js';

const router = express.Router();

router.get('/', getAllClientServices);
router.post('/', createClientService);
router.put('/:id', updateClientService);
router.delete('/:id', deleteClientService);
router.post('/send-alert/:id', sendRenewalAlertEmail);
router.post('/auto-lookup', autoLookupDomainExpiry);
router.post('/run-auto-alerts', runAutoExpiryAlertCron);
router.get('/run-expiry-cron', runAutoExpiryAlertCron);

export default router;

