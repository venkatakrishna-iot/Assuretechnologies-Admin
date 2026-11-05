import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PartnerBooking, DronePartner } from '../types';
import './ServiceRequestDetailsModal.css';
import { usePartnerContext } from '../context/PartnerContext';
import API from '../services/api';
import { Toast } from '../utils/errorHandler';
import { MdDownload } from 'react-icons/md';

interface PartnerBookingDetailsModalProps {
  booking: PartnerBooking;
  partner?: DronePartner;
  onClose: () => void;
}

export default function PartnerBookingDetailsModal({ booking, partner, onClose }: PartnerBookingDetailsModalProps) {
  const { pricingTypes } = usePartnerContext();
  const [mounted, setMounted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleDownloadCommission = async () => {
    const bookingId = booking.displayId || booking.id;
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
      Toast.fire({ icon: 'error', title: err.response?.data?.message || 'Failed to download commission invoice' });
    }
  };

  if (!mounted) return null;

  const pType = pricingTypes.find(pt => pt.id === booking.pricingTypeId);
  const unitName = pType ? pType.name.replace('Per ', '') : 'Units';

  const assignedPartnerInfo = booking.assignedPartner || (partner ? {
    id: partner.id,
    display_id: partner.id,
    name: partner.name,
    mobile: partner.mobile,
    email: partner.email
  } : undefined);

  return createPortal(
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content details-modal">
        <div className="details-header">
          <h2>Partner Booking Details</h2>
          <button className="details-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="details-body">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div className="details-badge" style={{ marginBottom: 0 }}>
              {booking.status}
            </div>
            {booking.paymentStatus === 'Paid' && (
              <div className="details-badge" style={{ backgroundColor: '#10b981', color: 'white', marginBottom: 0 }}>
                Paid (?{booking.totalAmount?.toLocaleString('en-IN')})
              </div>
            )}
            {booking.quantity && (
              <div className="details-badge" style={{ backgroundColor: '#6366f1', color: 'white', marginBottom: 0 }}>
                {booking.quantity} {unitName}
              </div>
            )}
          </div>

          <div className="details-card">
            Farmer Information <br/><br/>
            <div className="details-row">
              <strong>Name:</strong> {booking.userName}
            </div>
            <div className="details-row">
              <strong>Mobile:</strong> {booking.userMobile}
            </div>
            <div className="details-row">
              <strong>Location:</strong> {[booking.village, booking.mandal, booking.district, booking.pincode].filter(x => x && x !== 'N/A').join(', ') || 'Address not provided'}
            </div>
            {booking.surveyNumber && booking.surveyNumber !== 'N/A' && (
              <div className="details-row" style={{ color: '#4f46e5', fontWeight: 600 }}>
                <strong>Survey Number:</strong> {booking.surveyNumber}
              </div>
            )}
          </div>

          <div className="details-card">
            Service Details <br/><br/>
            <div className="details-row">
              <strong>Equipment / Service:</strong> {booking.equipmentType}
            </div>
            <div className="details-row">
              <strong>Scheduled Date:</strong> {booking.date}
            </div>
            <div className="details-row">
              <strong>Scheduled Time:</strong> {booking.time}
            </div>
          </div>

          <div className="details-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Financial & Payout Split</span><br/><br/>
            <div className="details-row">
              <strong>Farmer / Customer Paid:</strong> ₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')} <span style={{ color: '#166534', fontSize: '12px' }}>(0% GST - Exempt)</span>
            </div>
            <div className="details-row mt-2" style={{ color: '#2563eb' }}>
              <strong>Partner Payout:</strong>
              <span style={{ fontWeight: 700, fontSize: '15px', marginLeft: '6px' }}>
                ₹{Number(booking.partnerPayoutAmount ?? Math.round(Number(booking.totalAmount || 0) * 0.90)).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="details-row mt-2" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
              <strong>Platform Gross Commission ({booking.adminCommissionRate ?? 10}%):</strong>
              <span style={{ color: '#166534', fontWeight: 600, marginLeft: '6px' }}>
                ₹{Number(booking.adminCommissionAmount ?? Math.round(Number(booking.totalAmount || 0) * 0.10)).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="details-row mt-1" style={{ fontSize: '13px', color: '#64748b' }}>
              <span>• Net Platform Revenue:</span>
              <span style={{ marginLeft: '6px' }}>₹{(Number(booking.adminCommissionAmount ?? Math.round(Number(booking.totalAmount || 0) * 0.10)) / 1.18).toFixed(2)}</span>
            </div>
            <div className="details-row mt-1" style={{ fontSize: '13px', color: '#64748b' }}>
              <span>• 18% GST to Deposit (Paid by Assure):</span>
              <span style={{ marginLeft: '6px' }}>₹{(Number(booking.adminCommissionAmount ?? Math.round(Number(booking.totalAmount || 0) * 0.10)) - (Number(booking.adminCommissionAmount ?? Math.round(Number(booking.totalAmount || 0) * 0.10)) / 1.18)).toFixed(2)}</span>
            </div>
          </div>

          <div className="details-card">
            Assigned Partner <br/><br/>
            {assignedPartnerInfo ? (
              <>
                <div className="details-row" style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>
                  {assignedPartnerInfo.name} {assignedPartnerInfo.display_id ? `(${assignedPartnerInfo.display_id})` : ''}
                </div>
                <div className="details-row mt-2" style={{ fontSize: '14px', color: '#64748b' }}>
                  <strong>Contact:</strong> {assignedPartnerInfo.mobile || 'N/A'} {assignedPartnerInfo.email ? `| ${assignedPartnerInfo.email}` : ''}
                </div>
              </>
            ) : (
              <div className="details-row" style={{ color: '#94a3b8' }}>
                No partner assigned yet
              </div>
            )}
          </div>

          {booking.status === 'Cancelled' && (
            <div className="details-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' }}>
              <span style={{ color: '#b91c1c', fontWeight: 600 }}>Cancellation Information</span><br/><br/>
              <div className="details-row">
                <strong>Cancelled By:</strong> {booking.cancelledBy === 'ADMIN' ? 'Assure Admin' : booking.cancelledBy === 'CUSTOMER' ? 'Customer' : (booking.cancelledBy || 'N/A')}
              </div>
              <div className="details-row mt-2">
                <strong>Reason:</strong> {booking.cancellationReason || 'No reason provided'}
              </div>
            </div>
          )}

          {booking.startWorkPhotos && booking.startWorkPhotos.length > 0 && (
            <div className="details-card">
              Photos - Before Work <br/><br/>
              <div className="details-photo-grid">
                {booking.startWorkPhotos.map((photo, index) => (
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

          {booking.progressUpdates && booking.progressUpdates.length > 0 && (
            <div className="details-card">
              Daily Progress Updates <br/><br/>
              <div className="progress-timeline">
                {booking.progressUpdates.map((update) => (
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

          {booking.completeWorkPhotos && booking.completeWorkPhotos.length > 0 && (
            <div className="details-card">
              Photos - After Work <br/><br/>
              <div className="details-photo-grid">
                {booking.completeWorkPhotos.map((photo, index) => (
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
          <div>
            {booking.status === 'Completed' && (
              <button
                className="btn-action-green"
                onClick={handleDownloadCommission}
                style={{ backgroundColor: '#10b981', color: '#fff', padding: '6px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
              >
                <MdDownload /> Download Commission Invoice
              </button>
            )}
          </div>
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
