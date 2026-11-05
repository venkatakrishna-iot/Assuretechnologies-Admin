import { useCallback } from 'react';
import PartnerBookingTable from '../components/PartnerBookingTable';
import Pagination from '../components/Pagination';
import AssignPartnerModal from '../components/AssignPartnerModal';
import PartnerBookingDetailsModal from '../components/PartnerBookingDetailsModal';
import type { PartnerBooking } from '../types';
import useAssignmentPage from '../hooks/useAssignmentPage';
import './ManageServiceAssignments.css';

const mapPartnerBooking = (b: any): PartnerBooking => {
  const customFields = b.metadata?.custom_field_responses || b.metadata?.custom_fields || b.metadata || {};
  
  let addressObj: any = {};
  let addressText = '';

  const rawAddress = b.address || b.Order?.customer_address || '';
  if (typeof rawAddress === 'string') {
    try {
      addressObj = JSON.parse(rawAddress);
      addressText = [addressObj.line1, addressObj.line2, addressObj.city, addressObj.state].filter(Boolean).join(', ');
    } catch {
      addressText = rawAddress;
    }
  } else if (typeof rawAddress === 'object' && rawAddress) {
    addressObj = rawAddress;
    addressText = [addressObj.line1, addressObj.line2, addressObj.city, addressObj.state].filter(Boolean).join(', ');
  }

  const village = customFields['Village'] || customFields['village'] || customFields['fld_5'] || addressObj.line1 || '';
  const mandal = customFields['Mandal'] || customFields['mandal'] || customFields['fld_4'] || addressObj.city || '';
  const district = customFields['District'] || customFields['district'] || customFields['fld_3'] || addressObj.state || '';
  const pincode = b.pincode || customFields['Pincode'] || customFields['fld_6'] || addressObj.pincode || 'N/A';

  return {
    id: b.id,
    displayId: b.display_id || b.Order?.order_number || 'N/A',
    orderNumber: b.Order?.order_number || '',
    userId: b.Order?.customer_id || '',
    userName: b.Order?.customer_name || 'N/A',
    userMobile: b.Order?.customer_contact || 'N/A',
    surveyNumber: customFields['Survey Number'] || customFields['Survey No'] || customFields['Survey No.'] || customFields['Survey'] || customFields['fld_1'] || b.metadata?.fld_1 || '',
    district,
    mandal,
    village,
    pincode,
    fullAddress: addressText || [village, mandal, district].filter(Boolean).join(', '),
    equipmentType: b.Service?.name || 'Unknown',
    date: b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
    time: b.scheduled_time_slot || b.metadata?.scheduled_time_slot || b.metadata?.time_slot || (b.scheduled_date && !String(b.scheduled_date).includes('T00:00:00') ? new Date(b.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'),
    status: b.status,
    partnerId: b.assigned_partner_id,
    totalAmount: b.Order?.total_amount || 0,
    adminCommissionRate: b.metadata?.admin_commission_rate ?? b.Service?.admin_commission_rate,
    adminCommissionAmount: b.metadata?.admin_commission_amount,
    partnerPayoutAmount: b.metadata?.partner_payout_amount,
  };
};

export default function ManagePartnerAssignments() {
  const mapBooking = useCallback(mapPartnerBooking, []);

  const {
    statuses, activeTab, setActiveTab,
    items: bookings, currentPage, totalPages, setCurrentPage,
    assignModalOpen, viewModalOpen, selectedItem,
    handleAccept, handleReject, openAssignModal, handleView,
    handleAssignSuccess, closeAssignModal, closeViewModal,
  } = useAssignmentPage<PartnerBooking>({
    ownerType: 'PARTNER',
    mapBooking,
    entityLabel: 'booking',
    assigneeLabel: 'Partner',
  });

  return (
    <div className="manage-assignments-page">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Partner Assignments</h1>
      </div>
      
      <div className="content-card">
        <div className="tabs-container">
          {statuses.map(status => {
            let label = status.replace('_', ' ');
            if (status === 'NEW') label = 'Pending Requests';
            if (status === 'ACCEPTED') label = 'Accepted (Assign Partner)';
            
            return (
              <button 
                key={status}
                className={`tab-btn ${activeTab === status ? 'active' : ''}`}
                onClick={() => setActiveTab(status)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="tab-content">
          <PartnerBookingTable 
            bookings={bookings}
            viewType={['NEW'].includes(activeTab) ? "assignments-new" : "assignments-accepted"}
            onAccept={handleAccept}
            onReject={handleReject}
            onView={handleView}
            onAssign={openAssignModal}
          />

          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {assignModalOpen && selectedItem && (
        <AssignPartnerModal 
          booking={selectedItem}
          onClose={closeAssignModal}
          onAssignSuccess={handleAssignSuccess}
        />
      )}

      {viewModalOpen && selectedItem && (
        <PartnerBookingDetailsModal 
          booking={selectedItem}
          partner={undefined}
          onClose={closeViewModal}
        />
      )}
    </div>
  );
}
