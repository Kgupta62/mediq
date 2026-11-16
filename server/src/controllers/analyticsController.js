import { db } from '../config/db.js';
import { seedInitialData } from '../seedData.js';
import { handler, emit, queueUpdated } from '../utils/errors.js';

export const getAnalytics = handler((req, res) => {
  res.json(db.getAnalytics());
});

export const getNotificationsLog = handler((req, res) => {
  const limit = Math.min(Math.max(Math.floor(Number(req.query.limit)) || 25, 1), 200);
  res.json({ notifications: db.getNotifications(limit) });
});

export const resetData = handler((req, res) => {
  seedInitialData({ force: true });
  emit(req, 'DATA_RESET');
  queueUpdated(req, 'data_reset');
  res.json({ message: 'Demo data reset successfully with active clinic simulation!', analytics: db.getAnalytics() });
});

export const getPostgresSchema = handler((req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(db.exportPostgreSQLSchema());
});
