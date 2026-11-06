import { useState, useEffect } from 'react';
import API from '../services/api';
import { MdClose, MdVisibility, MdDownload } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, InvoiceItem } from '../types';
import { isSameStateAsCompany, getGstStateCode } from '../data/gstStateCodes';
import './ManageInvoices.css';
import { Toast } from '../utils/errorHandler';


interface MockSR {
  id: string;
  srNo: string;
  customerName: string;
  mobile: string;
  service: string;
  category: string;
  completedOn: string;
  email?: string;
  address?: string;
  qty: number;
  rate: number;
  extraItems?: { description: string, qty: number }[];
}



export default function ManageInvoices() {
  const [activeTab, setActiveTab] = useState<'vendor_invoices' | 'service_invoices' | 'form' | 'view'>('vendor_invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingSRs, setPendingSRs] = useState<MockSR[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPendingSRs();
  }, []);

  const fetchPendingSRs = async () => {
    try {
      const response = await API.get('/invoices/service-bookings/pending');
      if (response.data && response.data.data) {
        setPendingSRs(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch pending SRs', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const vendorMap: Record<string, string> = {};
      try {
        const vRes = await API.get('/admin/vendors?limit=200');
        if (vRes.data?.data && Array.isArray(vRes.data.data)) {
          vRes.data.data.forEach((v: any) => {
            if (v.gst_number) {
              if (v.id) vendorMap[v.id] = v.gst_number;
              if (v.business_name) vendorMap[v.business_name.toLowerCase().trim()] = v.gst_number;
              if (v.full_name) vendorMap[v.full_name.toLowerCase().trim()] = v.gst_number;
            }
          });
        }
      } catch (e) {
        console.error('Failed to pre-fetch vendors for GST lookup', e);
      }
      const response = await API.get('/invoices/admin');
      const fetchedInvoices = response.data.data.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerName: inv.customer_name,
        mobile: inv.mobile,
        email: inv.email,
        address: inv.address,
        items: inv.items.map((i: any) => ({
          id: i.id,
          description: i.description,
          qty: i.qty,
          rate: parseFloat(i.rate) || 0,
          amount: parseFloat(i.amount) || 0,
          warranty: i.warranty,
          modelNumber: i.model_number,
          hsnCode: i.hsn_code,
          serialNumbers: (() => {
            let sn = i.serial_numbers;
            if (typeof sn === 'string') {
              try {
                const parsed = JSON.parse(sn);
                sn = parsed;
              } catch(e) {
                sn = sn.split(',').map((s: string) => s.trim()).filter(Boolean);
              }
            }
            return Array.isArray(sn) ? sn : (typeof sn === 'string' ? [sn] : []);
          })()
        })),
        additionalChargesDesc: inv.additional_charges_desc,
        additionalCharges: parseFloat(inv.additional_charges) || 0,
        gstPercent: parseFloat(inv.gst_percent) || 0,
        grandTotal: parseFloat(inv.grand_total) || 0,
        date: new Date(inv.createdAt).toLocaleString(),
        status: inv.status,
        serviceName: inv.type === 'VENDOR' 
          ? (inv.product_name || inv.items?.[0]?.description || 'Product') 
          : (inv.service_name 
              || inv.items?.find((i: any) => i.description && (i.description.includes(' - ') || i.description.toLowerCase().includes('solution') || i.description.toLowerCase().includes('service') || i.description.toLowerCase().includes('networking') || i.description.toLowerCase().includes('drone') || i.description.toLowerCase().includes('tractor')))?.description 
              || inv.items?.find((i: any) => i.description && !i.description.toLowerCase().startsWith('a/c'))?.description
              || inv.items?.[0]?.description 
              || 'Service'),
        soldBy: inv.sold_by || inv.vendor?.business_name || inv.vendor?.full_name || (inv.type === 'VENDOR' ? 'Assure Technologies' : '-'),
        vendorBusinessName: inv.vendor?.business_name || inv.vendor?.full_name || '',
        vendorGstin: inv.vendor?.gst_number || inv.vendor_gstin || (inv.vendor_id ? vendorMap[inv.vendor_id] : '') || vendorMap[((inv.vendor?.business_name || inv.vendor?.full_name || inv.sold_by || '').toLowerCase().trim())] || '',
        vendorGstStateCode: inv.vendor_gst_state_code || inv.vendor?.gst_state_code || (inv.vendor?.gst_number ? inv.vendor.gst_number.slice(0, 2) : '') || '',
        customerGstin: inv.gst_number || inv.customer?.gst_number || '',
        gstStateCode: inv.gst_state_code || (inv.gst_number ? inv.gst_number.slice(0, 2) : ''),
        orderId: inv.order_id,
        type: inv.type,
        isPartner: Boolean(inv.is_partner || (inv.service_name && (inv.service_name.toLowerCase().includes('harvester') || inv.service_name.toLowerCase().includes('tractor') || inv.service_name.toLowerCase().includes('drone'))))
      }));
      setInvoices(fetchedInvoices);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    }
  };

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [selectedSR, setSelectedSR] = useState<MockSR | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: Date.now().toString(), description: '', qty: 1, rate: 0, amount: 0, warranty: '', modelNumber: '', hsnCode: '', serialNumbers: [] }
  ]);
  const [additionalChargesDesc, setAdditionalChargesDesc] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(18);

  // Derived calculations
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalBeforeGst = itemsTotal + additionalCharges;
  const gstAmount = (totalBeforeGst * gstPercent) / 100;
  const grandTotal = totalBeforeGst + gstAmount;

  const handleAddRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', qty: 1, rate: 0, amount: 0, warranty: '', modelNumber: '', hsnCode: '', serialNumbers: [] }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          updated.amount = updated.qty * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSaveInvoice = () => {
    if (!customerName || !mobile) {
      Toast.fire({ icon: 'warning', title: "Please fill in the required customer details (Name, Mobile)." });
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      mobile,
      email,
      address,
      items,
      additionalChargesDesc,
      additionalCharges,
      gstPercent,
      grandTotal,
      date: new Date().toLocaleDateString(),
      status: 'Paid',
      srNo: selectedSR ? selectedSR.srNo : `SR${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      serviceName: selectedSR ? `${selectedSR.category} - ${selectedSR.service}` : items[0]?.description || 'Custom Service'
    };    API.post('/invoices/service', newInvoice)
      .then(() => {
        Toast.fire({ icon: 'success', title: 'Invoice generated successfully' });
        fetchInvoices();
        fetchPendingSRs();
        
        // Reset Form
    setCustomerName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setItems([{ id: Date.now().toString(), description: '', qty: 1, rate: 0, amount: 0, warranty: '', modelNumber: '', hsnCode: '', serialNumbers: [] }]);
    setAdditionalChargesDesc('');
    setAdditionalCharges(0);
    setGstPercent(18);
    setSelectedSR(null);
            // Switch to table
        setActiveTab('service_invoices' as any);
      })
      .catch(err => {
        console.error(err);
        Toast.fire({ icon: 'error', title: 'Failed to generate invoice' });
      });
  };

  const handleSelectSR = (sr: MockSR) => {
    setSelectedSR(sr);
    setCustomerName(sr.customerName);
    setMobile(sr.mobile);
    setEmail(sr.email || "");
    setAddress(sr.address || "");
    
    let newItems = [];
    if (items.length === 1 && items[0].description === '') {
      newItems = [{ ...items[0], description: `${sr.category} - ${sr.service}`, qty: sr.qty || 1, rate: sr.rate || 0, amount: (sr.qty || 1) * (sr.rate || 0), _isFixed: true } as any];
    } else {
      newItems = [{ id: Date.now().toString(), description: `${sr.category} - ${sr.service}`, qty: sr.qty || 1, rate: sr.rate || 0, amount: (sr.qty || 1) * (sr.rate || 0), warranty: '', modelNumber: '', hsnCode: '', serialNumbers: [], _isFixed: true } as any];
    }

    if (sr.extraItems && sr.extraItems.length > 0) {
      sr.extraItems.forEach((extra, idx) => {
        newItems.push({
          id: (Date.now() + idx + 1).toString(),
          description: extra.description,
          qty: extra.qty,
          rate: 0,
          amount: 0,
          warranty: '',
          modelNumber: '',
          hsnCode: '',
          serialNumbers: [],
          _isFixed: true,
          _isExtra: true
        } as any);
      });
    }
    
    setItems(newItems);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    try {
      await API.delete(`/invoices/admin/${id}`);
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete invoice', err);
      Toast.fire({ icon: 'error', title: 'Failed to delete invoice. Please try again.' });
    }
  };

  const handleDownloadCommissionPDF = async (bookingId: string) => {
    if (!bookingId) {
      Toast.fire({ icon: 'warning', title: 'Booking ID not found for this invoice' });
      return;
    }
    try {
      Toast.fire({ icon: 'info', title: 'Downloading B2B Commission Invoice...' });
      const res = await API.get(`/invoices/service/${encodeURIComponent(bookingId)}/commission-invoice/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Commission-Invoice-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      Toast.fire({ icon: 'success', title: 'Commission invoice downloaded successfully' });
    } catch (err: any) {
      console.error('Failed to download commission invoice:', err);
      let errMsg = 'Failed to download commission invoice';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errMsg = parsed.message || errMsg;
        } catch {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      Toast.fire({ icon: 'error', title: errMsg });
    }
  };

  const handleDownloadPDF = async (invoiceNumber: string) => {
    const input = document.getElementById('invoice-details-pdf');
    if (!input) return;

    const actionButtons = input.querySelector('.pdf-exclude-buttons');
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = 'none';
    }

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = 'flex';
      }
    }
  };

  const isServiceInvoice = (inv: Invoice) => {
    if (inv.orderId && (inv.orderId.startsWith('SR-') || inv.orderId.startsWith('BKG-'))) return true;
    if (inv.type === 'SERVICE') return true;
    return false;
  };

  const isVendorInvoice = (inv: Invoice) => !isServiceInvoice(inv);
  const displayedInvoices = invoices.filter(inv => activeTab === 'vendor_invoices' ? isVendorInvoice(inv) : isServiceInvoice(inv));

  return (
    <div className="manage-invoices">
      <h3 className="invoices-title">Invoices</h3>

      <div className="invoice-tabs">
        <button
          className={`invoice-tab ${activeTab === 'vendor_invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendor_invoices')}
        >
          Vendor Invoices
        </button>
        <button
          className={`invoice-tab ${activeTab === 'service_invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('service_invoices')}
        >
          Service Invoices
        </button>
        <button
          className={`invoice-tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('form');
            setSelectedSR(null); // Reset selection when clicking the tab
          }}
        >
          Generate Invoice
        </button>
      </div>

      <div className="invoice-container">
        {(activeTab === 'vendor_invoices' || activeTab === 'service_invoices') && (
          <div className="ref-table-wrapper" style={{ margin: 0 }}>
            <table className="invoices-list-table ref-table" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th className='tableheadings'>Invoice No</th>
                  <th>Customer</th>
                  <th>Sold By</th>
                  <th>{activeTab === 'service_invoices' ? 'Service' : 'Product'}</th>
                  {activeTab === 'service_invoices' && <th>SR No</th>}
                  <th>Order ID</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'service_invoices' ? 10 : 9} style={{ padding: '40px', textAlign: 'center', color: '#333' }}>
                      No invoices generated yet
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>
                        {activeTab === 'vendor_invoices' || inv.type === 'VENDOR' || !!inv.vendorBusinessName ? (
                          <div>
                            <div>Assure Technologies</div>
                            <small className="text-muted" style={{ color: '#6c757d', fontSize: '0.8rem' }}>GSTIN: 37DJPPN2516B1Z9</small>
                          </div>
                        ) : (
                          inv.customerName
                        )}
                      </td>
                      <td>
                        <div>{inv.soldBy || inv.vendorBusinessName || 'Assure Technologies'}</div>
                        {(activeTab === 'vendor_invoices' || inv.type === 'VENDOR' || !!inv.vendorBusinessName) && inv.vendorGstin && (
                          <small className="text-muted" style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                            GSTIN: {inv.vendorGstin}
                          </small>
                        )}
                      </td>
                      <td>{inv.serviceName}</td>
                      {activeTab === 'service_invoices' && <td>{inv.srNo || '-'}</td>}
                      <td>{inv.orderId || '-'}</td>
                      <td>
                        {inv.grandTotal > 0
                          ? inv.grandTotal.toFixed(2)
                          : (inv.items?.reduce((sum, item) => sum + item.amount, 0) || 0).toFixed(2)}
                      </td>
                      <td>{inv.status}</td>
                      <td>{inv.date}</td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn-action-green"
                          onClick={() => {
                            setViewingInvoice(inv);
                            setActiveTab('view');
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MdVisibility /> View
                        </button>
                        <button
                          className="btn-action-green"
                          onClick={() => {
                            setViewingInvoice(inv);
                            setActiveTab('view');
                            // Delay to allow DOM update
                            setTimeout(() => {
                              handleDownloadPDF(inv.invoiceNumber);
                            }, 300);
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#3b82f6' }}
                        >
                          <MdDownload /> Download
                        </button>
                        {activeTab === 'service_invoices' && inv.isPartner && (
                          <button
                            className="btn-action-green"
                            onClick={() => handleDownloadCommissionPDF(inv.orderId || inv.srNo || '')}
                            title="Download B2B Commission Invoice for Partner & Tax Filing"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#10b981' }}
                          >
                            <MdDownload /> Commission Inv
                          </button>
                        )}
                        <button
                          className="btn-remove-row"
                          onClick={() => handleDeleteInvoice(inv.id)}
                          style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                        >
                          <MdClose />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'form' && !selectedSR && (
          <div className="ref-table-wrapper" style={{ margin: 0 }}>
            <table className="invoices-list-table ref-table" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th>SR No</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Completed On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingSRs.map(sr => (
                  <tr key={sr.id}>
                    <td>{sr.srNo}</td>
                    <td>
                      {sr.customerName}<br />
                      <small className="text-muted">{sr.mobile}</small>
                    </td>
                    <td>
                      {sr.service}<br />
                      <small className="text-muted" style={{ color: '#6c757d' }}>{sr.category}</small>
                    </td>
                    <td>{sr.completedOn}</td>
                    <td>
                      <button
                        className="btn-action-green"
                        onClick={() => handleSelectSR(sr)}
                      >
                        Generate Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'form' && selectedSR && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className="section-title" style={{ margin: 0 }}>Customer Details</h4>
              <button
                className="btn-remove-row"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                onClick={() => setSelectedSR(null)}
              >
                Back to SR List
              </button>
            </div>

            <div className="form-grid-3">
              <input type="text" className="ref-input" placeholder="Name" value={customerName} readOnly disabled style={{backgroundColor: '#e9ecef'}} required />
              <input type="text" className="ref-input" placeholder="Mobile" value={mobile} readOnly disabled style={{backgroundColor: '#e9ecef'}} required />
              <input type="text" className="ref-input" placeholder="Email" value={email} readOnly disabled style={{backgroundColor: '#e9ecef'}} />
            </div>

            <div className="form-grid-1">
              <input type="text" className="ref-input" placeholder="Address" value={address} readOnly disabled style={{backgroundColor: '#e9ecef'}} />
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #dee2e6', margin: '20px 0' }} />

            <h4 className="section-title">Items</h4>

            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th className="col-num">S.No</th>
                    <th className="col-name">Description</th>
                    
                    <th className="col-qty">Qty</th>
                    <th className="col-cost">Rate</th>
                    <th className="col-total">Amount</th>
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="col-num">{idx + 1}</td>
                      <td>
                        <input type="text" className="ref-input" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} readOnly={(item as any)._isFixed} disabled={(item as any)._isFixed} style={(item as any)._isFixed ? {backgroundColor: '#e9ecef'} : {}} />
                      </td>
                      <td>
                        <input type="number" className="ref-input" value={item.qty === 0 ? 0 : (item.qty || '')} onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)} readOnly={(item as any)._isFixed} disabled={(item as any)._isFixed} style={(item as any)._isFixed ? {backgroundColor: '#e9ecef'} : {}} />
                      </td>
                      <td>
                        <input type="number" className="ref-input" value={item.rate === 0 ? 0 : (item.rate || '')} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} readOnly={(item as any)._isFixed && !(item as any)._isExtra} disabled={(item as any)._isFixed && !(item as any)._isExtra} style={(item as any)._isFixed && !(item as any)._isExtra ? {backgroundColor: '#e9ecef'} : {}} />
                      </td>
                      <td>
                        <div className="ref-input" style={{ background: '#e9ecef', border: '1px solid transparent', color: '#495057' }}>
                          {item.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="col-action">
                        {!(item as any)._isFixed && (<button type="button" className="btn-remove-row" onClick={() => handleRemoveRow(item.id)}><MdClose /></button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn-add-row" onClick={handleAddRow}>
              + Add Row
            </button>

            <div className="calc-grid-2">
              <input
                type="text"
                className="ref-input"
                placeholder="Additional Charges Description"
                value={additionalChargesDesc}
                onChange={e => setAdditionalChargesDesc(e.target.value)}
              />
              <input
                type="number"
                className="ref-input"
                placeholder="0"
                value={additionalCharges || ''}
                onChange={e => setAdditionalCharges(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="calc-grid-3">
              <input
                type="number"
                className="ref-input"
                placeholder="18"
                value={gstPercent}
                onChange={e => setGstPercent(parseFloat(e.target.value) || 0)}
              />
              <div className="ref-readonly">
                {gstAmount.toFixed(2)}
              </div>
              <div className="ref-readonly">
                {grandTotal.toFixed(2)}
              </div>
            </div>

            <div className="terms-box">
              <p>• Prices valid for 15 days</p>
              <p>• GST applicable as per norms</p>
              <p>• Payment due immediately</p>
            </div>

            <button className="btn-save-invoice" onClick={handleSaveInvoice}>
              Save Invoice
            </button>
          </div>
        )}
        {activeTab === 'view' && viewingInvoice && (
          <div id="invoice-details-pdf" style={{ padding: '20px', background: 'white' }}>
            <div className="pdf-exclude-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className="section-title" style={{ margin: 0 }}>Invoice Details</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-action-green"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6' }}
                  onClick={() => handleDownloadPDF(viewingInvoice.invoiceNumber)}
                >
                  <MdDownload /> Download PDF
                </button>
                <button
                  className="btn-remove-row"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem' }}
                  onClick={() => {
                    setActiveTab(viewingInvoice.vendorBusinessName || viewingInvoice.type === 'VENDOR' ? 'vendor_invoices' : 'service_invoices');
                    setViewingInvoice(null);
                  }}
                >
                  Back to List
                </button>
              </div>
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><strong>Invoice No:</strong> {viewingInvoice.invoiceNumber}</div>
              <div><strong>Date:</strong> {viewingInvoice.date}</div>
              {viewingInvoice.srNo && <div><strong>SR No:</strong> {viewingInvoice.srNo}</div>}
              <div>
                <strong>Customer:</strong> {viewingInvoice.type === 'VENDOR' || viewingInvoice.vendorBusinessName ? 'Assure Technologies' : viewingInvoice.customerName}
                {(viewingInvoice.type === 'VENDOR' || viewingInvoice.vendorBusinessName) && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>GSTIN:</strong> 37DJPPN2516B1Z9
                  </div>
                )}
              </div>
              <div>
                <strong>Sold By:</strong> {viewingInvoice.soldBy || viewingInvoice.vendorBusinessName || 'Assure Technologies'}
                {(viewingInvoice.type === 'VENDOR' || viewingInvoice.vendorBusinessName) && viewingInvoice.vendorGstin && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>GSTIN:</strong> {viewingInvoice.vendorGstin}
                  </div>
                )}
              </div>
              <div><strong>Order ID:</strong> {viewingInvoice.orderId || 'N/A'}</div>
              <div><strong>Mobile:</strong> {viewingInvoice.mobile}</div>
              <div><strong>Email:</strong> {viewingInvoice.email || 'N/A'}</div>
              <div><strong>Address:</strong> {viewingInvoice.address || 'N/A'}</div>
              <div><strong>{viewingInvoice.type === 'SERVICE' ? 'Service Name' : 'Product Name'}:</strong> {viewingInvoice.serviceName || 'N/A'}</div>
              <div><strong>Status:</strong> {viewingInvoice.status || 'N/A'}</div>
            </div>

            <h4 className="section-title">Items</h4>
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th className="col-num">S.No</th>
                    <th className="col-name">Description</th>
                    <th className="col-qty">Qty</th>
                    <th className="col-cost">Rate (Incl. of Tax)</th>
                    <th className="col-cost">Rate (Excl. of Tax)</th>
                    <th className="col-total">Amount</th>
                    <th>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items.map((item, idx) => {
                    const gstPct = viewingInvoice.gstPercent || 18;
                    const qty = item.qty || 1;
                    const rateExcl = (item.amount && item.amount < (item.rate * qty))
                      ? (item.amount / qty)
                      : item.rate;
                    const rateIncl = (item.rate > rateExcl)
                      ? item.rate
                      : (rateExcl * (1 + (gstPct / 100)));
                    const amount = item.amount || (rateExcl * qty);

                    return (
                      <tr key={item.id}>
                        <td className="col-num">{idx + 1}</td>
                        <td>
                          <div>{item.description}</div>
                        </td>
                        <td>{qty}</td>
                        <td style={{ fontWeight: 600, color: '#0f766e' }}>₹{rateIncl.toFixed(2)}</td>
                        <td>₹{rateExcl.toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>₹{amount.toFixed(2)}</td>
                        <td>{item.warranty || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(() => {
              const itemsTotal = viewingInvoice.items.reduce((sum, item) => sum + item.amount, 0);
              const isVendorInvoice = viewingInvoice.type === 'VENDOR' || !!viewingInvoice.vendorBusinessName;

              if (isVendorInvoice) {
                const total = viewingInvoice.grandTotal > 0 ? viewingInvoice.grandTotal : itemsTotal;
                const gstPercent = viewingInvoice.gstPercent || 18;
                const gst = viewingInvoice.grandTotal > itemsTotal && itemsTotal > 0
                  ? (viewingInvoice.grandTotal - itemsTotal)
                  : (total - (total / (1 + (gstPercent / 100))));
                const taxable = total - gst;
                const vendorCode = viewingInvoice.vendorGstStateCode || (viewingInvoice.vendorGstin ? viewingInvoice.vendorGstin.slice(0, 2) : '');
                const isIntraState = isSameStateAsCompany(vendorCode);

                return (
                  <div style={{ marginTop: '20px', padding: '15px', background: '#e9ecef', borderRadius: '4px', textAlign: 'right' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong>Subtotal (Taxable):</strong> ₹{taxable.toFixed(2)}</p>
                    {isIntraState ? (
                      <>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong>CGST:</strong> ₹{(gst / 2).toFixed(2)}</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong>SGST:</strong> ₹{(gst / 2).toFixed(2)}</p>
                      </>
                    ) : (
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}><strong>IGST:</strong> ₹{gst.toFixed(2)}</p>
                    )}
                    <h4 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}><strong>Total:</strong> ₹{total.toFixed(2)}</h4>
                  </div>
                );
              }

              const totalBeforeGst = itemsTotal + viewingInvoice.additionalCharges;
              const gstAmount = (totalBeforeGst * viewingInvoice.gstPercent) / 100;
              const customerCode = viewingInvoice.gstStateCode || (viewingInvoice.customerGstin ? viewingInvoice.customerGstin.slice(0, 2) : '') || getGstStateCode(viewingInvoice.address);
              const isServiceIntraState = isSameStateAsCompany(customerCode);

              return (
                <div style={{ marginTop: '20px', padding: '15px', background: '#e9ecef', borderRadius: '4px', textAlign: 'right' }}>
                  <p><strong>Items Total:</strong> ₹{itemsTotal.toFixed(2)}</p>
                  <p><strong>Additional Charges {viewingInvoice.additionalChargesDesc ? `(${viewingInvoice.additionalChargesDesc})` : ''}:</strong> ₹{viewingInvoice.additionalCharges.toFixed(2)}</p>
                  {isServiceIntraState ? (
                    <>
                      <p><strong>CGST:</strong> ₹{(gstAmount / 2).toFixed(2)}</p>
                      <p><strong>SGST:</strong> ₹{(gstAmount / 2).toFixed(2)}</p>
                    </>
                  ) : (
                    <p><strong>IGST:</strong> ₹{gstAmount.toFixed(2)}</p>
                  )}
                  <h4><strong>Grand Total:</strong> ₹{viewingInvoice.grandTotal.toFixed(2)}</h4>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}








