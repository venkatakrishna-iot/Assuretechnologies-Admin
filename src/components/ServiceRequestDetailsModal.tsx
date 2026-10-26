import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ServiceRequest, Technician } from '../types';
import './ServiceRequestDetailsModal.css';

interface ServiceRequestDetailsModalProps {
  request: ServiceRequest;
  technician?: Technician;
  onClose: () => void;
  onMarkAsPaid?: (id: string) => void;
}

export default function ServiceRequestDetailsModal({ request, technician, onClose, onMarkAsPaid }: ServiceRequestDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedPaymentId, setCopiedPaymentId] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const formatAddress = (addr?: string) => {
    if (!addr) return 'Address not provided';
    try {
      const obj = typeof addr === 'string' && (addr.startsWith('{') || addr.startsWith('[')) ? JSON.parse(addr) : addr;
      if (typeof obj === 'object' && obj !== null) {
        const parts = [obj.line1, obj.line2, obj.city, obj.state, obj.pincode, obj.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : JSON.stringify(obj);
      }
      return String(addr);
    } catch (e) {
      return String(addr);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content details-modal">
        <div className="details-header">
          <h2>Service Request Details</h2>
          <button className="details-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="details-body">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div className="details-badge" style={{ marginBottom: 0 }}>
              {request.status}
            </div>
            {request.paymentStatus === 'Prebooking Paid' && (
              <div className="details-badge" style={{ backgroundColor: '#10b981', color: 'white', marginBottom: 0 }}>
                {request.paymentStatus} {request.prebookingAmountPaid ? `(₹${request.prebookingAmountPaid})` : ''}
              </div>
            )}
            {request.paymentStatus === 'Paid in Full' && (
              <div className="details-badge" style={{ backgroundColor: '#166534', color: 'white', marginBottom: 0 }}>
                Paid in Full
              </div>
            )}
          </div>

          <div className="details-card">
            Customer <br/><br/>
            <div className="details-row">
              <strong>Name:</strong> {request.userName}
            </div>
            <div className="details-row">
              <strong>Mobile:</strong> {request.userMobile}
            </div>
            <div className="details-row">
              <strong>Email:</strong> {request.userEmail}
            </div>
            <div className="details-row">
              <strong>Address:</strong> {formatAddress(request.userAddress)}
            </div>
          </div>

          <div className="details-card">
            Service <br/><br/>
            <div className="details-row">
              <strong>Service:</strong> {request.serviceName}
            </div>
            <div className="details-row">
              <strong>Date:</strong> {request.date}
            </div>
            <div className="details-row">
              <strong>Time:</strong> {request.time}
            </div>
          </div>


                    <div className="details-card">
            Payment Details <br/><br/>
            <div className="details-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span><strong>Payment Status:</strong></span>
              <span style={{
                backgroundColor: (request.paymentStatus === 'Paid in Full' || request.paymentStatus === 'Prebooking Paid') ? '#dcfce7' : '#fef3c7',
                color: (request.paymentStatus === 'Paid in Full' || request.paymentStatus === 'Prebooking Paid') ? '#166534' : '#b45309',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {request.paymentStatus || 'Pending'} {request.prebookingAmountPaid ? `(₹${request.prebookingAmountPaid})` : ''}
              </span>
            </div>
            {request.paymentMethod && (
              <div className="details-row" style={{ marginBottom: '6px' }}>
                <strong>Method:</strong> {request.paymentDetails?.card ? 'Credit / Debit Card' : request.paymentDetails?.vpa ? 'UPI / QR Code' : request.paymentDetails?.bank ? 'Net Banking' : request.paymentDetails?.wallet ? `Wallet (${request.paymentDetails.wallet})` : request.paymentMethod === 'UPI' ? 'UPI / QR Code' : request.paymentMethod === 'CARD' ? 'Credit / Debit Card' : request.paymentMethod === 'ONLINE' ? 'Online Payment' : request.paymentMethod || 'Online Payment'}
              </div>
            )}
            {request.paymentDetails?.vpa && (
              <div className="details-row" style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>UPI ID:</strong> {request.paymentDetails.vpa}
              </div>
            )}
            {request.paymentDetails?.card && (
              <div className="details-row" style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>Card:</strong> {request.paymentDetails.card.network && request.paymentDetails.card.network !== 'Unknown' ? request.paymentDetails.card.network : 'Card'} •••• {request.paymentDetails.card.last4 || '****'}
              </div>
            )}
            {request.paymentDetails?.bank && (
              <div className="details-row" style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>Bank:</strong> {request.paymentDetails.bank}
              </div>
            )}
            {request.paymentDetails?.wallet && (
              <div className="details-row" style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>Wallet:</strong> {request.paymentDetails.wallet}
              </div>
            )}
            {request.paidAt && (
              <div className="details-row" style={{ marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>
                <strong>Paid on:</strong> {request.paidAt}
              </div>
            )}
            {request.razorpayPaymentId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Txn ID: <strong>{request.razorpayPaymentId}</strong></span>
                  <button
                    onClick={() => {
                      if (request.razorpayPaymentId) {
                        navigator.clipboard.writeText(request.razorpayPaymentId);
                        setCopiedPaymentId(true);
                        setTimeout(() => setCopiedPaymentId(false), 2000);
                      }
                    }}
                    style={{
                      background: copiedPaymentId ? '#dcfce7' : '#fff',
                      color: copiedPaymentId ? '#166534' : '#334155',
                      border: '1px solid',
                      borderColor: copiedPaymentId ? '#86efac' : '#cbd5e1',
                      borderRadius: '3px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: copiedPaymentId ? '600' : 'normal',
                      transition: 'all 0.2s'
                    }}
                    title="Copy Transaction ID"
                  >
                    {copiedPaymentId ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <a
                  href={'https://dashboard.razorpay.com/app/payments/' + request.razorpayPaymentId}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                >
                  View on Razorpay ↗
                </a>
              </div>
            )}
          </div>

          <div className="details-card">
            Technician <br/><br/>
            <div className="details-row">
              {technician ? technician.name : '-'}
            </div>
          </div>

          {request.startWorkPhotos && request.startWorkPhotos.length > 0 && (
            <div className="details-card">
              Photos - Before Work <br/><br/>
              {request.startDescription && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '14px', color: '#334155' }}>
                  {request.startDescription}
                </div>
              )}
              <div className="details-photo-grid">
                {request.startWorkPhotos.map((photo, index) => (
                  <img 
                    key={index} 
                    src={photo} 
                    alt={`Before work ${index + 1}`} 
                    className="details-photo-thumbnail cursor-pointer" 
                    onClick={() => setPreviewImage(photo)}
                  />
                ))}
              </div>
            </div>
          )}

          {request.progressUpdates && request.progressUpdates.length > 0 && (
            <div className="details-card">
              Daily Progress Updates <br/><br/>
              <div className="progress-timeline">
                {request.progressUpdates.map((update) => (
                  <div key={update.id} className="progress-item">
                    <div className="progress-date">{update.date}</div>
                    <div className="progress-description">{update.description}</div>
                    {update.photos && update.photos.length > 0 && (
                      <div className="details-photo-grid mt-2">
                        {update.photos.map((photo, idx) => (
                          <img 
                            key={idx} 
                            src={photo} 
                            alt={`Progress ${idx + 1}`} 
                            className="details-photo-thumbnail cursor-pointer" 
                            onClick={() => setPreviewImage(photo)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.completeWorkPhotos && request.completeWorkPhotos.length > 0 && (
            <div className="details-card">
              Photos - After Work <br/><br/>
              <div className="details-photo-grid">
                {request.completeWorkPhotos.map((photo, index) => (
                  <img 
                    key={index} 
                    src={photo} 
                    alt={`After work ${index + 1}`} 
                    className="details-photo-thumbnail cursor-pointer" 
                    onClick={() => setPreviewImage(photo)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="details-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {request.status === 'Completed' && request.paymentStatus !== 'Paid in Full' && onMarkAsPaid ? (
            <button 
              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} 
              onClick={() => onMarkAsPaid(request.id)}
            >
              Mark as Paid
            </button>
          ) : (
            <div></div>
          )}
          <button className="btn-close-gray" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-preview-close" onClick={() => setPreviewImage(null)}>&times;</button>
            <img src={previewImage} alt="Preview" className="image-preview-full" />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
