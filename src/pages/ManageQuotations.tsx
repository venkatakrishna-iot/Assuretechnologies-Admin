import { useState, useEffect } from 'react';
import { MdClose, MdVisibility, MdDownload } from 'react-icons/md';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import { quotationsApi, type CreateQuotationPayload } from '../services/quotationsApi';
import { invoicesApi, type CreateManualInvoicePayload } from '../services/invoicesApi';
import type { Quotation, QuotationService, Invoice } from '../types';
import Pagination from '../components/Pagination';
import './ManageQuotations.css';

export const DEFAULT_QUOTATION_TERMS = `Payment Terms & Conditions

• Payment Milestone Schedule: 100% upfront deposit prior to equipment procurement on material value, 50% upon physical installation of hardware, and the final 50% balance upon successful testing, commissioning, and handover of the system about service.
• Payment Due Date: Full payment is strictly due within 5 days from the final invoice date.
• Late Payment Interest: A late fee of 3.5% per month will be charged on all overdue balances.
• Retention of Title: All equipment remains the legal property of the service provider until the invoice is paid in full. The provider reserves the right to de-install or remotely deactivates equipment if payment is breached.
• Work Suspension: Failure to pay milestones on time grants the provider the right to pause installation, programming, or remote viewing setup until accounts are cleared.
• The material quantity may vary depending on site condition will be charged as per actual.
• If necessary, it may vary (cables, wire laying charges, cameras and installation, if any).
• All civil work at customer scope (Digging), Iron poles and height support should be provided by customer while installation and if any electrical UPS provision, PVC pipes and fittings, welding work also customer scope.
• Transportation Extra.
• Accommodation and food facilities to the technician and engineers should be provided by customers.
• Delivery of goods within 1-2 weeks.
• Electrical UPS Wiring provision should be done by customers as per Network switch position.
• Camera positions and rack mounting place should be declared before work starts, if any changes done after work start will be considered as extra work and considered as accountable to those particulars.

Company's Bank Details

In favor of Assure Technologies, Bank - INDIAN Bank, A/C - 8018432127
IFSC - IDIB000K088, A. Konduru Branch`;

export const DEFAULT_INVOICE_TERMS = `Component Warranty Conditions

• Manufacturer Warranty: Hardware components (cameras, NVRs/DVRs, hard drives) carry a 1-to-3-year manufacturer warranty from the date of purchase. The installer acts as the facilitator for these claims.
• Workmanship/Labor Warranty: Installation labor is typically covered for 90 days to 1 year. This covers faulty wiring, loose mounts, or incorrect configuration by the technicians.
• Warranty Exclusions: The warranty is strictly void under the following conditions:
  ◦ Damage caused by lightning strikes, power surges, floods, or acts of God.
  ◦ Vandalism, physical tampering, or unauthorized relocation of cameras.
  ◦ Modifications to software settings, network routing, or firmware updates done by the client or a third party.
• Consumables Exclusion: Cables, connectors, power adapters, and batteries are generally excluded from long-term warranties or carry a heavily reduced coverage period (e.g., 90 days).
• Advance Replacement Policy: Defective components must be tested and verified before a replacement is issued. Loaner cameras during the manufacturer repair window are not included unless a separate Annual Maintenance Contract (AMC) is signed.

Company's Bank Details

In favor of Assure Technologies, Bank - INDIAN Bank, A/C - 8018432127
IFSC - IDIB000K088, A. Konduru Branch`;

type TabType = 'quotations' | 'generate_quotation' | 'invoices' | 'generate_invoice' | 'view_quotation' | 'view_invoice';

function renderFormattedTerms(rawTerms: string) {
  if (!rawTerms || !rawTerms.trim()) return null;

  const sections = rawTerms.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

  return sections.map((section, secIdx) => {
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const isBankSection = section.toLowerCase().includes("bank details") || section.toLowerCase().includes("in favor of");

    if (isBankSection) {
      return (
        <div key={secIdx} className="terms-bank-box">
          <div className="terms-bank-title">
            <span>🏦 Company's Bank Details</span>
          </div>
          {lines
            .filter(l => !l.toLowerCase().includes("company's bank details") && !l.toLowerCase().includes("bank details"))
            .map((line, lIdx) => (
              <div key={lIdx} className="terms-bank-line">{line}</div>
            ))
          }
        </div>
      );
    }

    return (
      <div key={secIdx} className="terms-section-block">
        {lines.map((line, lIdx) => {
          if (line.startsWith('•') || line.startsWith('-')) {
            const content = line.replace(/^[•\-]\s*/, '');
            const colonIdx = content.indexOf(':');
            if (colonIdx !== -1) {
              const title = content.substring(0, colonIdx + 1);
              const text = content.substring(colonIdx + 1);
              return (
                <div key={lIdx} className="terms-bullet-item">
                  <span className="terms-bullet-dot">•</span>
                  <span className="terms-bullet-text">
                    <strong>{title}</strong>{text}
                  </span>
                </div>
              );
            }
            return (
              <div key={lIdx} className="terms-bullet-item">
                <span className="terms-bullet-dot">•</span>
                <span className="terms-bullet-text">{content}</span>
              </div>
            );
          }

          if (line.startsWith('◦') || line.startsWith('*')) {
            return (
              <div key={lIdx} className="terms-sub-bullet-item">
                <span className="terms-bullet-dot">◦</span>
                <span className="terms-bullet-text">{line.replace(/^[◦\*]\s*/, '')}</span>
              </div>
            );
          }

          if (lIdx === 0 && (line.toLowerCase().includes('terms') || line.toLowerCase().includes('conditions') || line.length < 45)) {
            return <div key={lIdx} className="terms-subheading">{line}</div>;
          }

          return <div key={lIdx} className="terms-regular-line">{line}</div>;
        })}
      </div>
    );
  });
}

export default function ManageQuotations() {
  const [activeTab, setActiveTab] = useState<TabType>('quotations');
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Pagination State
  const [quotationPage, setQuotationPage] = useState<number>(1);
  const [invoicePage, setInvoicePage] = useState<number>(1);
  const itemsPerPage = 10;

  // Quotation Form State
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  const [services, setServices] = useState<QuotationService[]>([
    { id: '1', name: '', qty: 1, cost: 0, total: 0 }
  ]);

  const [additionalChargesDesc, setAdditionalChargesDesc] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(18);
  const [taxType, setTaxType] = useState<'GST' | 'IGST'>('GST');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(DEFAULT_QUOTATION_TERMS);

  // Quotation Derived calculations
  const servicesTotal = services.reduce((sum, s) => sum + (s.qty * s.cost), 0);
  const totalBeforeGst = servicesTotal + (additionalCharges || 0);
  const gstAmount = (totalBeforeGst * gstPercent) / 100;
  const grandTotal = totalBeforeGst + gstAmount;

  // Invoice Form State (Exact Replica)
  const [invCustomerName, setInvCustomerName] = useState('');
  const [invMobile, setInvMobile] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invCompanyName, setInvCompanyName] = useState('');
  const [invGstNumber, setInvGstNumber] = useState('');
  const [invAddress, setInvAddress] = useState('');
  const [invPincode, setInvPincode] = useState('');

  const [invServices, setInvServices] = useState<QuotationService[]>([
    { id: '1', name: '', qty: 1, cost: 0, total: 0 }
  ]);

  const [invAdditionalChargesDesc, setInvAdditionalChargesDesc] = useState('');
  const [invAdditionalCharges, setInvAdditionalCharges] = useState<number>(0);
  const [invGstPercent, setInvGstPercent] = useState<number>(18);
  const [invTaxType, setInvTaxType] = useState<'GST' | 'IGST'>('GST');
  const [invTermsAndConditions, setInvTermsAndConditions] = useState<string>(DEFAULT_INVOICE_TERMS);

  // Invoice Derived calculations
  const invServicesTotal = invServices.reduce((sum, s) => sum + (s.qty * s.cost), 0);
  const invTotalBeforeGst = invServicesTotal + (invAdditionalCharges || 0);
  const invGstAmount = (invTotalBeforeGst * invGstPercent) / 100;
  const invGrandTotal = invTotalBeforeGst + invGstAmount;

  // Quotation pagination slices
  const totalQuotationPages = Math.ceil(quotations.length / itemsPerPage) || 1;
  const paginatedQuotations = quotations.slice(
    (quotationPage - 1) * itemsPerPage,
    quotationPage * itemsPerPage
  );

  // Invoice pagination slices
  const totalInvoicePages = Math.ceil(invoices.length / itemsPerPage) || 1;
  const paginatedInvoices = invoices.slice(
    (invoicePage - 1) * itemsPerPage,
    invoicePage * itemsPerPage
  );

  useEffect(() => {
    fetchQuotations();
    fetchInvoices();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await quotationsApi.getQuotations();
      if (res.data) {
        const mapped: Quotation[] = res.data.map((q: any) => ({
          id: q.id,
          quotationNumber: q.quotation_number,
          customerName: q.customer_name,
          mobile: q.mobile,
          email: q.email || '',
          companyName: q.company_name || '',
          gstNumber: q.gst_number || '',
          address: q.address || '',
          pincode: q.pincode || '',
          subtotal: parseFloat(q.subtotal || 0),
          additionalChargesDesc: q.additional_charges_desc || '',
          additionalCharges: parseFloat(q.additional_charges || 0),
          gstPercent: parseFloat(q.gst_percent || 18),
          grandTotal: parseFloat(q.grand_total || 0),
          termsAndConditions: q.terms_and_conditions || DEFAULT_QUOTATION_TERMS,
          taxType: (q.tax_type as 'GST' | 'IGST') || (q.gst_number && !q.gst_number.startsWith('37') ? 'IGST' : 'GST'),
          services: (q.items || []).map((it: any) => ({
            id: it.id,
            name: it.service_name,
            qty: it.qty,
            cost: parseFloat(it.cost || 0),
            total: parseFloat(it.total || 0)
          })),
          date: q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''
        }));
        setQuotations(mapped);
      }
    } catch (err: any) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const res = await invoicesApi.getAdminInvoices();
      if (res.data?.data) {
        // Filter strictly for manual invoices created via Generate Invoice
        const manualOnly = res.data.data.filter((inv: any) => inv.is_manual === true || inv.is_manual === 1 || inv.isManual === true);
        const mapped: Invoice[] = manualOnly.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customerName: inv.customer_name,
          mobile: inv.mobile,
          email: inv.email || '',
          companyName: inv.company_name || '',
          gstNumber: inv.gst_number || '',
          address: inv.address || '',
          pincode: inv.pincode || '',
          subtotal: (inv.items || []).reduce((s: number, i: any) => s + (parseFloat(i.amount) || (parseFloat(i.rate) * parseInt(i.qty || 1, 10))), 0),
          additionalChargesDesc: inv.additional_charges_desc || '',
          additionalCharges: parseFloat(inv.additional_charges || 0),
          gstPercent: parseFloat(inv.gst_percent || 18),
          grandTotal: parseFloat(inv.grand_total || 0),
          termsAndConditions: inv.terms_and_conditions || DEFAULT_INVOICE_TERMS,
          date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '',
          status: inv.status || 'Paid',
          isManual: true,
          taxType: (inv.tax_type as 'GST' | 'IGST') || (inv.gst_number && !inv.gst_number.startsWith('37') ? 'IGST' : 'GST'),
          items: (inv.items || []).map((it: any) => ({
            id: it.id,
            description: it.description,
            qty: it.qty,
            rate: parseFloat(it.rate || 0),
            amount: parseFloat(it.amount || 0)
          }))
        }));
        setInvoices(mapped);
      }
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Quotation row handlers
  const handleAddRow = () => {
    setServices([
      ...services,
      { id: Date.now().toString(), name: '', qty: 1, cost: 0, total: 0 }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleServiceChange = (id: string, field: keyof QuotationService, value: any) => {
    setServices(services.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (field === 'qty' || field === 'cost') {
          const q = field === 'qty' ? parseInt(value) || 0 : s.qty;
          const c = field === 'cost' ? parseFloat(value) || 0 : s.cost;
          updated.total = q * c;
        }
        return updated;
      }
      return s;
    }));
  };

  // Invoice row handlers (Exact Replica)
  const handleAddInvRow = () => {
    setInvServices([
      ...invServices,
      { id: Date.now().toString(), name: '', qty: 1, cost: 0, total: 0 }
    ]);
  };

  const handleRemoveInvRow = (id: string) => {
    if (invServices.length > 1) {
      setInvServices(invServices.filter(s => s.id !== id));
    }
  };

  const handleInvServiceChange = (id: string, field: keyof QuotationService, value: any) => {
    setInvServices(invServices.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (field === 'qty' || field === 'cost') {
          const q = field === 'qty' ? parseInt(value) || 0 : s.qty;
          const c = field === 'cost' ? parseFloat(value) || 0 : s.cost;
          updated.total = q * c;
        }
        return updated;
      }
      return s;
    }));
  };

  const handleSaveQuotation = async () => {
    if (!customerName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Missing Details', text: 'Please enter Customer Name.' });
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      Swal.fire({ icon: 'warning', title: 'Invalid Mobile', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    if (gstNumber.trim() && gstNumber.trim().length !== 15) {
      Swal.fire({ icon: 'warning', title: 'Invalid GSTIN', text: 'GST Number must be 15 characters.' });
      return;
    }

    if (pincode.trim() && pincode.trim().length !== 6) {
      Swal.fire({ icon: 'warning', title: 'Invalid Pincode', text: 'Pincode must be 6 digits.' });
      return;
    }

    const validServices = services.filter(s => s.name.trim() && s.cost > 0);
    if (validServices.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Missing Service Details', text: 'Please add at least one service with a name and cost.' });
      return;
    }

    try {
      const payload: CreateQuotationPayload = {
        customer_name: customerName.trim(),
        mobile: cleanMobile,
        email: email.trim() || undefined,
        company_name: companyName.trim() || undefined,
        gst_number: gstNumber.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
        services: validServices.map(s => ({
          service_name: s.name.trim(),
          sac_code: '9987',
          qty: s.qty,
          cost: s.cost
        })),
        additional_charges_desc: additionalChargesDesc.trim() || undefined,
        additional_charges: additionalCharges || 0,
        gst_percent: gstPercent,
        tax_type: taxType,
        terms_and_conditions: termsAndConditions.trim() || undefined
      };

      await quotationsApi.createQuotation(payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Quotation Generated!',
        timer: 1500,
        showConfirmButton: false
      });

      // Reset Form
      setCustomerName('');
      setMobile('');
      setEmail('');
      setCompanyName('');
      setGstNumber('');
      setAddress('');
      setPincode('');
      setServices([{ id: Date.now().toString(), name: '', qty: 1, cost: 0, total: 0 }]);
      setAdditionalChargesDesc('');
      setAdditionalCharges(0);
      setGstPercent(18);
      setTaxType('GST');
      setTermsAndConditions(DEFAULT_QUOTATION_TERMS);

      // Refresh list & switch to table
      await fetchQuotations();
      setActiveTab('quotations');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save quotation';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    }
  };

  const handleSaveInvoice = async () => {
    if (!invCustomerName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Missing Details', text: 'Please enter Customer Name.' });
      return;
    }

    const cleanMobile = invMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      Swal.fire({ icon: 'warning', title: 'Invalid Mobile', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    if (invGstNumber.trim() && invGstNumber.trim().length !== 15) {
      Swal.fire({ icon: 'warning', title: 'Invalid GSTIN', text: 'GST Number must be 15 characters.' });
      return;
    }

    if (invPincode.trim() && invPincode.trim().length !== 6) {
      Swal.fire({ icon: 'warning', title: 'Invalid Pincode', text: 'Pincode must be 6 digits.' });
      return;
    }

    const validServices = invServices.filter(s => s.name.trim() && s.cost > 0);
    if (validServices.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Missing Service Details', text: 'Please add at least one service with a name and cost.' });
      return;
    }

    try {
      const payload: CreateManualInvoicePayload = {
        customerName: invCustomerName.trim(),
        mobile: cleanMobile,
        email: invEmail.trim() || undefined,
        companyName: invCompanyName.trim() || undefined,
        gstNumber: invGstNumber.trim().toUpperCase() || undefined,
        address: invAddress.trim() || undefined,
        pincode: invPincode.trim() || undefined,
        items: validServices.map(s => ({
          name: s.name.trim(),
          qty: s.qty,
          cost: s.cost,
          total: s.total
        })),
        additionalChargesDesc: invAdditionalChargesDesc.trim() || undefined,
        additionalCharges: invAdditionalCharges || 0,
        gstPercent: invGstPercent,
        grandTotal: invGrandTotal,
        taxType: invTaxType,
        termsAndConditions: invTermsAndConditions.trim() || undefined,
        isManual: true
      };

      await invoicesApi.createInvoice(payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Invoice Generated!',
        timer: 1500,
        showConfirmButton: false
      });

      // Reset Form
      setInvCustomerName('');
      setInvMobile('');
      setInvEmail('');
      setInvCompanyName('');
      setInvGstNumber('');
      setInvAddress('');
      setInvPincode('');
      setInvServices([{ id: Date.now().toString(), name: '', qty: 1, cost: 0, total: 0 }]);
      setInvAdditionalChargesDesc('');
      setInvAdditionalCharges(0);
      setInvGstPercent(18);
      setInvTaxType('GST');
      setInvTermsAndConditions(DEFAULT_INVOICE_TERMS);

      // Refresh list & switch to invoices table
      await fetchInvoices();
      setActiveTab('invoices');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save invoice';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Quotation?',
      text: 'Are you sure you want to delete this quotation?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await quotationsApi.deleteQuotation(id);
        setQuotations(prev => {
          const updated = prev.filter(q => q.id !== id);
          if (quotationPage > 1 && updated.length <= (quotationPage - 1) * itemsPerPage) {
            setQuotationPage(p => p - 1);
          }
          return updated;
        });
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Invoice?',
      text: 'Are you sure you want to delete this invoice?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await invoicesApi.deleteInvoice(id);
        setInvoices(prev => {
          const updated = prev.filter(inv => inv.id !== id);
          if (invoicePage > 1 && updated.length <= (invoicePage - 1) * itemsPerPage) {
            setInvoicePage(p => p - 1);
          }
          return updated;
        });
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  const handleDownloadPDF = async (quotationNumber: string) => {
    const input = document.getElementById('quotation-details-pdf');
    if (!input) return;

    const actionButtons = input.querySelector('.pdf-exclude-buttons');
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = 'none';
    }

    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Quotation_${quotationNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to generate PDF' });
    } finally {
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = 'flex';
      }
    }
  };

  const handleDownloadInvoicePDF = async (invoiceNumber: string) => {
    const input = document.getElementById('invoice-details-pdf');
    if (!input) return;

    const actionButtons = input.querySelector('.pdf-exclude-buttons');
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = 'none';
    }

    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to generate PDF' });
    } finally {
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = 'flex';
      }
    }
  };

  return (
    <div className="manage-quotations">
      <h3 className="quotations-title">Quotation & Invoice Management</h3>

      <div className="quotation-tabs">
        <button 
          className={`quotation-tab ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => { setActiveTab('quotations'); setViewingQuotation(null); setViewingInvoice(null); setQuotationPage(1); }}
        >
          Quotations
        </button>
        <button 
          className={`quotation-tab ${activeTab === 'generate_quotation' ? 'active' : ''}`}
          onClick={() => { setActiveTab('generate_quotation'); setViewingQuotation(null); setViewingInvoice(null); }}
        >
          Generate Quotation
        </button>
        <button 
          className={`quotation-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => { setActiveTab('invoices'); setViewingQuotation(null); setViewingInvoice(null); setInvoicePage(1); }}
        >
          Invoices
        </button>
        <button 
          className={`quotation-tab ${activeTab === 'generate_invoice' ? 'active' : ''}`}
          onClick={() => { setActiveTab('generate_invoice'); setViewingQuotation(null); setViewingInvoice(null); }}
        >
          Generate Invoice
        </button>
      </div>

      <div className="quotation-container">
        {/* Quotations List Tab */}
        {activeTab === 'quotations' && (
          <>
            <div className="ref-table-wrapper" style={{ margin: 0 }}>
              <table className="quotations-list-table ref-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>Quotation No</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center' }}>
                        Loading quotations...
                      </td>
                    </tr>
                  ) : quotations.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#333' }}>
                        No quotations found
                      </td>
                    </tr>
                  ) : (
                    paginatedQuotations.map(q => (
                      <tr key={q.id}>
                        <td><strong>{q.quotationNumber}</strong></td>
                        <td>{q.customerName}</td>
                        <td>{q.mobile}</td>
                        <td>₹{q.grandTotal.toFixed(2)}</td>
                        <td>{q.date}</td>
                        <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-action-green"
                            onClick={() => {
                              setViewingQuotation(q);
                              setActiveTab('view_quotation');
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <MdVisibility /> View
                          </button>
                          <button 
                            className="btn-action-green"
                            onClick={() => {
                              setViewingQuotation(q);
                              setActiveTab('view_quotation');
                              setTimeout(() => {
                                handleDownloadPDF(q.quotationNumber);
                              }, 300);
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#3b82f6' }}
                          >
                            <MdDownload /> Download
                          </button>
                          <button 
                            className="btn-remove-row"
                            onClick={() => handleDeleteQuotation(q.id)}
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
            <Pagination
              currentPage={quotationPage}
              totalPages={totalQuotationPages}
              onPageChange={setQuotationPage}
            />
          </>
        )}

        {/* Generate Quotation Tab */}
        {activeTab === 'generate_quotation' && (
          <div>
            <h4 className="section-title">Customer Details</h4>
            
            <div className="form-grid-3">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Customer Name" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                required 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Mobile" 
                maxLength={10}
                value={mobile} 
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} 
                required 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            
            <div className="form-grid-2">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Company Name (Optional)" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="GST Number (Optional)" 
                maxLength={15}
                value={gstNumber} 
                onChange={e => setGstNumber(e.target.value.toUpperCase())} 
              />
            </div>
            
            <div className="form-grid-1">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Address" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
              />
            </div>
            
            <div className="form-grid-1">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Pincode" 
                maxLength={6}
                value={pincode} 
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} 
              />
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #dee2e6', margin: '20px 0' }} />

            <h4 className="section-title">Service Details</h4>
            
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th className="col-num">#</th>
                    <th className="col-name">Service Name</th>
                    <th className="col-qty">Qty</th>
                    <th className="col-cost">Cost</th>
                    <th className="col-total">Total</th>
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc, idx) => (
                    <tr key={svc.id}>
                      <td className="col-num">{idx + 1}</td>
                      <td>
                        <input 
                          type="text" 
                          className="ref-input"
                          value={svc.name}
                          onChange={e => handleServiceChange(svc.id, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="ref-input"
                          value={svc.qty || ''}
                          onChange={e => handleServiceChange(svc.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="ref-input"
                          value={svc.cost || ''}
                          onChange={e => handleServiceChange(svc.id, 'cost', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <div className="ref-input" style={{ background: '#e9ecef', border: '1px solid transparent', color: '#495057' }}>
                          {svc.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="col-action">
                        <button type="button" className="btn-remove-row" onClick={() => handleRemoveRow(svc.id)}>
                          <MdClose />
                        </button>
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

            <div className="calc-grid-4">
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tax Type</label>
                <select 
                  className="ref-input" 
                  value={taxType} 
                  onChange={e => setTaxType(e.target.value as 'GST' | 'IGST')}
                  style={{ width: '100%', height: '42px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="GST">GST (CGST + SGST)</option>
                  <option value="IGST">IGST (Inter-State)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>GST Rate (%)</label>
                <input 
                  type="number" 
                  className="ref-input" 
                  placeholder="18" 
                  value={gstPercent}
                  onChange={e => setGstPercent(parseFloat(e.target.value) || 0)}
                  style={{ height: '42px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  {taxType === 'GST' ? 'CGST + SGST' : 'IGST Amount'}
                </label>
                <div className="ref-readonly" style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
                  {gstAmount.toFixed(2)} {taxType === 'GST' ? `(CGST: ${(gstAmount / 2).toFixed(2)}, SGST: ${(gstAmount / 2).toFixed(2)})` : ''}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Grand Total</label>
                <div className="ref-readonly" style={{ height: '42px', display: 'flex', alignItems: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="quotation-terms-edit-section">
              <div className="terms-header">
                <label className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                  Terms & Conditions & Bank Details
                </label>
                <button
                  type="button"
                  className="btn-reset-terms"
                  onClick={() => setTermsAndConditions(DEFAULT_QUOTATION_TERMS)}
                  title="Reset terms to default template"
                >
                  Reset to Default
                </button>
              </div>
              <textarea
                className="ref-input terms-textarea"
                rows={12}
                value={termsAndConditions}
                onChange={e => setTermsAndConditions(e.target.value)}
                placeholder="Enter quotation terms and conditions..."
              />
              <span className="terms-hint">
                You can customize or edit these terms and bank details for this specific quotation before saving.
              </span>
            </div>

            <button className="btn-save-quotation" onClick={handleSaveQuotation}>
              Save Quotation
            </button>
          </div>
        )}

        {/* Invoices List Tab */}
        {activeTab === 'invoices' && (
          <>
            <div className="ref-table-wrapper" style={{ margin: 0 }}>
              <table className="quotations-list-table ref-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center' }}>
                        Loading invoices...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#333' }}>
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td><strong>{inv.invoiceNumber}</strong></td>
                        <td>{inv.customerName}</td>
                        <td>{inv.mobile}</td>
                        <td>₹{inv.grandTotal.toFixed(2)}</td>
                        <td>{inv.date}</td>
                        <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-action-green"
                            onClick={() => {
                              setViewingInvoice(inv);
                              setActiveTab('view_invoice');
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <MdVisibility /> View
                          </button>
                          <button 
                            className="btn-action-green"
                            onClick={() => {
                              setViewingInvoice(inv);
                              setActiveTab('view_invoice');
                              setTimeout(() => {
                                handleDownloadInvoicePDF(inv.invoiceNumber);
                              }, 300);
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#3b82f6' }}
                          >
                            <MdDownload /> Download
                          </button>
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
            <Pagination
              currentPage={invoicePage}
              totalPages={totalInvoicePages}
              onPageChange={setInvoicePage}
            />
          </>
        )}

        {/* Generate Invoice Tab (Exact Replica of Generate Quotation) */}
        {activeTab === 'generate_invoice' && (
          <div>
            <h4 className="section-title">Customer Details</h4>
            
            <div className="form-grid-3">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Customer Name" 
                value={invCustomerName} 
                onChange={e => setInvCustomerName(e.target.value)} 
                required 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Mobile" 
                maxLength={10}
                value={invMobile} 
                onChange={e => setInvMobile(e.target.value.replace(/\D/g, ''))} 
                required 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Email" 
                value={invEmail} 
                onChange={e => setInvEmail(e.target.value)} 
              />
            </div>
            
            <div className="form-grid-2">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Company Name (Optional)" 
                value={invCompanyName} 
                onChange={e => setInvCompanyName(e.target.value)} 
              />
              <input 
                type="text" 
                className="ref-input" 
                placeholder="GST Number (Optional)" 
                maxLength={15}
                value={invGstNumber} 
                onChange={e => setInvGstNumber(e.target.value.toUpperCase())} 
              />
            </div>
            
            <div className="form-grid-1">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Address" 
                value={invAddress} 
                onChange={e => setInvAddress(e.target.value)} 
              />
            </div>
            
            <div className="form-grid-1">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Pincode" 
                maxLength={6}
                value={invPincode} 
                onChange={e => setInvPincode(e.target.value.replace(/\D/g, ''))} 
              />
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #dee2e6', margin: '20px 0' }} />

            <h4 className="section-title">Service Details</h4>
            
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th className="col-num">#</th>
                    <th className="col-name">Service Name</th>
                    <th className="col-qty">Qty</th>
                    <th className="col-cost">Cost</th>
                    <th className="col-total">Total</th>
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {invServices.map((svc, idx) => (
                    <tr key={svc.id}>
                      <td className="col-num">{idx + 1}</td>
                      <td>
                        <input 
                          type="text" 
                          className="ref-input"
                          value={svc.name}
                          onChange={e => handleInvServiceChange(svc.id, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="ref-input"
                          value={svc.qty || ''}
                          onChange={e => handleInvServiceChange(svc.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="ref-input"
                          value={svc.cost || ''}
                          onChange={e => handleInvServiceChange(svc.id, 'cost', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <div className="ref-input" style={{ background: '#e9ecef', border: '1px solid transparent', color: '#495057' }}>
                          {svc.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="col-action">
                        <button type="button" className="btn-remove-row" onClick={() => handleRemoveInvRow(svc.id)}>
                          <MdClose />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn-add-row" onClick={handleAddInvRow}>
              + Add Row
            </button>

            <div className="calc-grid-2">
              <input 
                type="text" 
                className="ref-input" 
                placeholder="Additional Charges Description" 
                value={invAdditionalChargesDesc}
                onChange={e => setInvAdditionalChargesDesc(e.target.value)}
              />
              <input 
                type="number" 
                className="ref-input" 
                placeholder="0" 
                value={invAdditionalCharges || ''}
                onChange={e => setInvAdditionalCharges(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="calc-grid-4">
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tax Type</label>
                <select 
                  className="ref-input" 
                  value={invTaxType} 
                  onChange={e => setInvTaxType(e.target.value as 'GST' | 'IGST')}
                  style={{ width: '100%', height: '42px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="GST">GST (CGST + SGST)</option>
                  <option value="IGST">IGST (Inter-State)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>GST Rate (%)</label>
                <input 
                  type="number" 
                  className="ref-input" 
                  placeholder="18" 
                  value={invGstPercent}
                  onChange={e => setInvGstPercent(parseFloat(e.target.value) || 0)}
                  style={{ height: '42px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  {invTaxType === 'GST' ? 'CGST + SGST' : 'IGST Amount'}
                </label>
                <div className="ref-readonly" style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
                  {invGstAmount.toFixed(2)} {invTaxType === 'GST' ? `(CGST: ${(invGstAmount / 2).toFixed(2)}, SGST: ${(invGstAmount / 2).toFixed(2)})` : ''}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Grand Total</label>
                <div className="ref-readonly" style={{ height: '42px', display: 'flex', alignItems: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {invGrandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="quotation-terms-edit-section">
              <div className="terms-header">
                <label className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                  Terms & Conditions & Bank Details
                </label>
                <button
                  type="button"
                  className="btn-reset-terms"
                  onClick={() => setInvTermsAndConditions(DEFAULT_INVOICE_TERMS)}
                  title="Reset terms to default template"
                >
                  Reset to Default
                </button>
              </div>
              <textarea
                className="ref-input terms-textarea"
                rows={12}
                value={invTermsAndConditions}
                onChange={e => setInvTermsAndConditions(e.target.value)}
                placeholder="Enter invoice terms and conditions..."
              />
              <span className="terms-hint">
                You can customize or edit these terms and bank details for this specific invoice before saving.
              </span>
            </div>

            <button className="btn-save-invoice" onClick={handleSaveInvoice}>
              Save Invoice
            </button>
          </div>
        )}

        {/* View Quotation Preview */}
        {activeTab === 'view_quotation' && viewingQuotation && (
          <div id="quotation-details-pdf" style={{ padding: '20px', background: 'white' }}>
            <div className="pdf-exclude-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className="section-title" style={{ margin: 0 }}>Quotation Details</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-action-green"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6' }}
                  onClick={() => handleDownloadPDF(viewingQuotation.quotationNumber)}
                >
                  <MdDownload /> Download PDF
                </button>
                <button
                  className="btn-remove-row"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem' }}
                  onClick={() => {
                    setActiveTab('quotations');
                    setViewingQuotation(null);
                  }}
                >
                  Back to List
                </button>
              </div>
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '18px 20px', borderRadius: '6px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', border: '1px solid #e2e8f0' }}>
              {/* Left Column: Customer & Document Details */}
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Quotation Details & Bill To
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.9rem', color: '#1e293b' }}>
                  <strong>Quotation No:</strong> <span>{viewingQuotation.quotationNumber}</span>
                  <strong>Date:</strong> <span>{viewingQuotation.date}</span>
                  <strong>Customer:</strong> <span>{viewingQuotation.customerName}</span>
                  {viewingQuotation.companyName && (
                    <>
                      <strong>Company:</strong> <span style={{ fontWeight: 600 }}>{viewingQuotation.companyName}</span>
                    </>
                  )}
                  <strong>Mobile:</strong> <span>{viewingQuotation.mobile}</span>
                  {viewingQuotation.email && (
                    <>
                      <strong>Email:</strong> <span>{viewingQuotation.email}</span>
                    </>
                  )}
                  {viewingQuotation.gstNumber && (
                    <>
                      <strong>GSTIN:</strong> <span style={{ fontWeight: 600 }}>{viewingQuotation.gstNumber}</span>
                    </>
                  )}
                  {viewingQuotation.address && (
                    <>
                      <strong>Address:</strong> <span>{viewingQuotation.address}{viewingQuotation.pincode ? ` - ${viewingQuotation.pincode}` : ''}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Assure Technologies Details */}
              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Issued By
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Assure Technologies
                </div>
                <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                  1st Floor, 5-15 Shop No 1,<br />
                  Dandu Venkata Ramaiah Commercial,<br />
                  A Konduru, NTR District, Andhra Pradesh - 521227
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', marginTop: '6px' }}>
                  GSTIN: 37DJPPN2516B1Z9
                </div>
              </div>
            </div>

            <div className="ref-table-wrapper" style={{ margin: '0 0 20px 0' }}>
              <table className="quotations-list-table ref-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service Name</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingQuotation.services.map((svc, idx) => (
                    <tr key={svc.id}>
                      <td>{idx + 1}</td>
                      <td>{svc.name}</td>
                      <td>{svc.qty}</td>
                      <td>₹{svc.cost.toFixed(2)}</td>
                      <td>₹{svc.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(() => {
              const taxableBase = viewingQuotation.subtotal + viewingQuotation.additionalCharges;
              const gstAmount = (taxableBase * viewingQuotation.gstPercent) / 100;
              const isIgst = viewingQuotation.taxType === 'IGST';

              return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <div style={{ width: '340px', background: '#f8f9fa', padding: '15px 18px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Subtotal:</span>
                      <strong>₹{viewingQuotation.subtotal.toFixed(2)}</strong>
                    </div>
                    {viewingQuotation.additionalCharges > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{viewingQuotation.additionalChargesDesc || 'Additional Charges'}:</span>
                        <strong>₹{viewingQuotation.additionalCharges.toFixed(2)}</strong>
                      </div>
                    )}
                    {isIgst ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>IGST ({viewingQuotation.gstPercent}%):</span>
                        <strong>₹{gstAmount.toFixed(2)}</strong>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>CGST ({(viewingQuotation.gstPercent / 2).toFixed(1)}%):</span>
                          <strong>₹{(gstAmount / 2).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>SGST ({(viewingQuotation.gstPercent / 2).toFixed(1)}%):</span>
                          <strong>₹{(gstAmount / 2).toFixed(2)}</strong>
                        </div>
                      </>
                    )}
                    <hr style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#0f172a' }}>
                      <strong>Grand Total:</strong>
                      <strong>₹{viewingQuotation.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {viewingQuotation.termsAndConditions && (
              <div className="quotation-terms-card">
                <h5 className="terms-card-title">Terms & Conditions & Bank Details</h5>
                <div className="terms-card-content">
                  {renderFormattedTerms(viewingQuotation.termsAndConditions)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Invoice Preview */}
        {activeTab === 'view_invoice' && viewingInvoice && (
          <div id="invoice-details-pdf" style={{ padding: '20px', background: 'white' }}>
            <div className="pdf-exclude-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className="section-title" style={{ margin: 0 }}>Invoice Details</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-action-green"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6' }}
                  onClick={() => handleDownloadInvoicePDF(viewingInvoice.invoiceNumber)}
                >
                  <MdDownload /> Download PDF
                </button>
                <button
                  className="btn-remove-row"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem' }}
                  onClick={() => {
                    setActiveTab('invoices');
                    setViewingInvoice(null);
                  }}
                >
                  Back to List
                </button>
              </div>
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '18px 20px', borderRadius: '6px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', border: '1px solid #e2e8f0' }}>
              {/* Left Column: Customer & Document Details */}
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Invoice Details & Bill To
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.9rem', color: '#1e293b' }}>
                  <strong>Invoice No:</strong> <span>{viewingInvoice.invoiceNumber}</span>
                  <strong>Date:</strong> <span>{viewingInvoice.date}</span>
                  <strong>Customer:</strong> <span>{viewingInvoice.customerName}</span>
                  {viewingInvoice.companyName && (
                    <>
                      <strong>Company:</strong> <span style={{ fontWeight: 600 }}>{viewingInvoice.companyName}</span>
                    </>
                  )}
                  <strong>Mobile:</strong> <span>{viewingInvoice.mobile}</span>
                  {viewingInvoice.email && (
                    <>
                      <strong>Email:</strong> <span>{viewingInvoice.email}</span>
                    </>
                  )}
                  {viewingInvoice.gstNumber && (
                    <>
                      <strong>GSTIN:</strong> <span style={{ fontWeight: 600 }}>{viewingInvoice.gstNumber}</span>
                    </>
                  )}
                  {viewingInvoice.address && (
                    <>
                      <strong>Address:</strong> <span>{viewingInvoice.address}{viewingInvoice.pincode ? ` - ${viewingInvoice.pincode}` : ''}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Assure Technologies Details */}
              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Issued By
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Assure Technologies
                </div>
                <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                  1st Floor, 5-15 Shop No 1,<br />
                  Dandu Venkata Ramaiah Commercial,<br />
                  A Konduru, NTR District, Andhra Pradesh - 521227
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', marginTop: '6px' }}>
                  GSTIN: 37DJPPN2516B1Z9
                </div>
              </div>
            </div>

            <div className="ref-table-wrapper" style={{ margin: '0 0 20px 0' }}>
              <table className="quotations-list-table ref-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service Name</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingInvoice.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td>{idx + 1}</td>
                      <td>{it.description}</td>
                      <td>{it.qty}</td>
                      <td>₹{it.rate.toFixed(2)}</td>
                      <td>₹{it.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(() => {
              const taxableBase = (viewingInvoice.subtotal || 0) + (viewingInvoice.additionalCharges || 0);
              const gstAmount = (taxableBase * viewingInvoice.gstPercent) / 100;
              const isIgst = viewingInvoice.taxType === 'IGST';

              return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <div style={{ width: '340px', background: '#f8f9fa', padding: '15px 18px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Subtotal:</span>
                      <strong>₹{(viewingInvoice.subtotal || 0).toFixed(2)}</strong>
                    </div>
                    {viewingInvoice.additionalCharges > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{viewingInvoice.additionalChargesDesc || 'Additional Charges'}:</span>
                        <strong>₹{viewingInvoice.additionalCharges.toFixed(2)}</strong>
                      </div>
                    )}
                    {isIgst ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>IGST ({viewingInvoice.gstPercent}%):</span>
                        <strong>₹{gstAmount.toFixed(2)}</strong>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>CGST ({(viewingInvoice.gstPercent / 2).toFixed(1)}%):</span>
                          <strong>₹{(gstAmount / 2).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>SGST ({(viewingInvoice.gstPercent / 2).toFixed(1)}%):</span>
                          <strong>₹{(gstAmount / 2).toFixed(2)}</strong>
                        </div>
                      </>
                    )}
                    <hr style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#0f172a' }}>
                      <strong>Grand Total:</strong>
                      <strong>₹{viewingInvoice.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {viewingInvoice.termsAndConditions && (
              <div className="quotation-terms-card">
                <h5 className="terms-card-title">Terms & Conditions & Bank Details</h5>
                <div className="terms-card-content">
                  {renderFormattedTerms(viewingInvoice.termsAndConditions)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
