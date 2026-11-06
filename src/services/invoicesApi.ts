import API from './api';

export interface CreateManualInvoicePayload {
  customerName: string;
  mobile: string;
  email?: string;
  companyName?: string;
  gstNumber?: string;
  address?: string;
  pincode?: string;
  items: Array<{
    name: string;
    qty: number;
    cost: number;
    total?: number;
  }>;
  additionalChargesDesc?: string;
  additionalCharges?: number;
  gstPercent: number;
  grandTotal: number;
  termsAndConditions?: string;
  isManual?: boolean;
}

export const invoicesApi = {
  getAdminInvoices: () => API.get('/invoices/admin'),
  createInvoice: (payload: CreateManualInvoicePayload) => API.post('/invoices/service', payload),
  deleteInvoice: (id: string) => API.delete(`/invoices/admin/${id}`)
};

