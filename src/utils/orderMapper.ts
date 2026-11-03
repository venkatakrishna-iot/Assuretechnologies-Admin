import type { Order } from '../types';

const cleanAddress = (rawAddress?: string): string => {
  if (!rawAddress) return 'N/A';
  const cleaned = rawAddress
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .join(', ');
  return cleaned || 'N/A';
};

export const mapApiOrderToOrder = (
  o: any, 
  items: any[], 
  totalAmount: number, 
  mapItemVendorName: (i: any) => string,
  extraTransportData?: { transportName?: string; trackingId?: string; trackUrl?: string },
  extraGstData?: { subtotalAmount?: number; taxAmount?: number; gstStateCode?: string }
): Order => {
  // Determine effective status from the specific items in this order slice
  let effectiveStatus = o.status;
  if (items && items.length > 0) {
    const activeItems = items.filter((i: any) => i.status !== 'CANCELLED');
    if (activeItems.length > 0) {
      if (activeItems.every((i: any) => i.status === 'COMPLETED')) {
        effectiveStatus = 'COMPLETED';
      } else if (activeItems.some((i: any) => i.status === 'OUT_FOR_DELIVERY')) {
        effectiveStatus = 'OUT_FOR_DELIVERY';
      } else if (activeItems.some((i: any) => i.status === 'ACCEPTED')) {
        effectiveStatus = 'ACCEPTED';
      } else if (activeItems.some((i: any) => i.status === 'NEW')) {
        effectiveStatus = 'NEW';
      } else if (activeItems[0]?.status) {
        effectiveStatus = activeItems[0].status;
      }
    } else {
      effectiveStatus = 'CANCELLED';
    }
  }
  const itemTracking = items.find((i: any) => i.tracking_id);
  return {
    id: o.order_number || o.id,
    date: new Date(o.createdAt).toLocaleString(),
    user: o.customer?.full_name || o.customer_name || 'N/A',
    mobile: o.customer?.mobile || o.customer_contact || 'N/A',
    email: o.customer?.email || 'N/A',
    address: cleanAddress(o.customer_address),
    companyName: o.company_name || undefined,
    gstNumber: o.gst_number || undefined,
    gstStateCode: extraGstData?.gstStateCode || o.gst_state_code || undefined,
    subtotalAmount: extraGstData?.subtotalAmount !== undefined ? extraGstData.subtotalAmount : (parseFloat(o.subtotal_amount) || totalAmount),
    taxAmount: extraGstData?.taxAmount !== undefined ? extraGstData.taxAmount : (parseFloat(o.tax_amount) || 0),
    pincode: o.customer?.pincode || 'N/A',
    totalAmount: totalAmount,
    paymentMethod: o.payment_method ? (o.payment_method === 'UPI' ? 'UPI / QR Code' : o.payment_method === 'CARD' ? 'Credit / Debit Card' : o.payment_method) : 'Online',
    paymentStatus: (o.payment_status === 'PAID' || o.payment_status === 'REFUND_PENDING' || o.payment_status === 'REFUNDED') ? 'Paid' : 'Pending',
    razorpayPaymentId: o.razorpay_payment_id || undefined,
    paymentDetails: o.payment_details || undefined,
    paidAt: o.paid_at ? new Date(o.paid_at).toLocaleString() : ((o.payment_status === 'PAID' || o.payment_status === 'REFUND_PENDING' || o.payment_status === 'REFUNDED') ? new Date(o.updatedAt || o.createdAt).toLocaleString() : undefined),
    status: effectiveStatus === 'NEW' ? 'New' 
          : effectiveStatus === 'ACCEPTED' ? 'Accepted' 
          : effectiveStatus === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' 
          : effectiveStatus === 'COMPLETED' ? 'Completed' 
          : effectiveStatus === 'CANCELLED' ? 'Cancelled' 
          : 'Rejected',
    transportName: extraTransportData !== undefined ? extraTransportData.transportName : (itemTracking?.transport_name || undefined),
    trackingId: extraTransportData !== undefined ? extraTransportData.trackingId : (itemTracking?.tracking_id || undefined),
    trackUrl: extraTransportData !== undefined ? extraTransportData.trackUrl : (itemTracking?.tracking_url || undefined),
    items: items.map((i: any) => {
      const price = parseFloat(i.price) || 0;
      const qty = parseInt(i.qty, 10) || 0;
      const taxSlab = i.tax_slab != null ? Number(i.tax_slab) : 18;
      const taxableBase = parseFloat(i.subtotal) || parseFloat((price * qty / (1 + (taxSlab / 100))).toFixed(2));
      const taxAmount = parseFloat(i.tax_amount) || parseFloat((price * qty - taxableBase).toFixed(2));
      const itemTotal = parseFloat((price * qty).toFixed(2));

      return {
        id: i.id,
        productName: i.product?.name || 'Unknown',
        vendorName: mapItemVendorName(i),
        vendorId: i.vendor_id,
        status: i.status,
        trackingId: i.tracking_id,
        transportName: i.transport_name,
        trackUrl: i.tracking_url,
        price,
        qty,
        subtotal: taxableBase,
        taxSlab,
        taxAmount,
        taxableBase,
        itemTotal
      };
    })
  };
};
