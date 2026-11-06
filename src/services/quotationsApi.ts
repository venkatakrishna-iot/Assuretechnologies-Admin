import API from './api';

export interface CreateQuotationPayload {
  customer_name: string;
  mobile: string;
  email?: string;
  company_name?: string;
  gst_number?: string;
  address?: string;
  pincode?: string;
  services: {
    service_name: string;
    qty: number;
    cost: number;
  }[];
  additional_charges_desc?: string;
  additional_charges?: number;
  gst_percent?: number;
  terms_and_conditions?: string;
}

export const quotationsApi = {
  getQuotations: async () => {
    const res = await API.get('/admin/quotations');
    return res.data;
  },

  getQuotationById: async (id: string) => {
    const res = await API.get(`/admin/quotations/${id}`);
    return res.data;
  },

  createQuotation: async (payload: CreateQuotationPayload) => {
    const res = await API.post('/admin/quotations', payload);
    return res.data;
  },

  deleteQuotation: async (id: string) => {
    const res = await API.delete(`/admin/quotations/${id}`);
    return res.data;
  }
};
