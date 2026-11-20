import type { Vendor } from '../types';
import { MdEdit, MdDelete } from 'react-icons/md';
import './VendorTable.css';

interface VendorTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  updatingStatusId?: string | null;
}

export default function VendorTable({ vendors, onEdit, onDelete, onToggleStatus, updatingStatusId }: VendorTableProps) {
  if (vendors.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">No vendors found.</div>
      </div>
    );
  }

  return (
    <div className="table-container vendor-table-container">
      <table className="custom-table vendor-table">
        <thead>
          <tr>
            <th>Vendor ID</th>
            <th>Full Name</th>
            <th>Business Name</th>
            <th>Contact</th>
            <th>GST</th>
            <th>Full Address</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id}>
              <td>{vendor.display_id || vendor.id}</td>
              <td>{vendor.fullName}</td>
              <td>{vendor.businessName}</td>
              <td>
                <div>{vendor.mobile}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{vendor.email}</div>
              </td>
              <td>{vendor.gstNumber}</td>
              <td title={vendor.fullAddress}>{vendor.fullAddress}</td>
              <td>
                <span className={`status-badge ${vendor.status.toLowerCase()}`}>
                  {vendor.status}
                </span>
              </td>
              <td>
                <div className="actions-cell">
                  <label 
                    className={`switch ${updatingStatusId === vendor.id ? 'switch-loading' : ''}`} 
                    title={updatingStatusId === vendor.id ? "Updating status..." : "Toggle Status"}
                  >
                    <input 
                      type="checkbox" 
                      checked={vendor.status === 'Active'}
                      disabled={updatingStatusId === vendor.id}
                      onChange={() => onToggleStatus(vendor.id)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <button className="icon-btn edit-icon" onClick={() => onEdit(vendor)} title="Edit">
                    <MdEdit size={20} />
                  </button>
                  <button className="icon-btn delete-icon" onClick={() => onDelete(vendor.id)} title="Delete">
                    <MdDelete size={20} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
