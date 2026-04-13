import { Hono } from 'hono';
import pdfGenerator from './controllers/pdf-generator';
import { auth } from '../middlewares/auth';

const app = new Hono();

// Apply authentication middleware to all PDF routes
app.use('*', auth);

// PDF generation routes
app.route('/api/pdf', pdfGenerator);

export default app;

