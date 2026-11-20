import type { Technician, Service } from '../types';
import { MdEdit } from 'react-icons/md';
import './TechnicianTable.css';

interface TechnicianTableProps {
  technicians: Technician[];
  servicesList?: Service[];
  onEditTechnician: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export default function TechnicianTable({ technicians, servicesList = [], onEditTechnician, onToggleStatus }: TechnicianTableProps) {
  if (technicians.length === 0) {
    return (
      <div className="glass-panel empty-state">
        <p>No technicians found. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Tech ID</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Location</th>
            <th>Assigned Services</th>
            <th>ID Proof</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {technicians.map((tech) => {
            const displayServices = (tech.services_names && tech.services_names.length > 0)
              ? tech.services_names
              : (tech.services || []).map(svc => {
                  const found = servicesList.find(s => s.id === svc || s.name === svc);
                  return found?.name || svc;
                });

            return (
              <tr key={tech.id}>
                <td>{tech.display_id || tech.id}</td>
                <td>{tech.name}</td>
                <td>
                  <div>{tech.mobile}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{tech.email}</div>
                </td>
                <td>{tech.location}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {displayServices.length > 0 ? displayServices.map((svc, index) => (
                      <span key={index} style={{ fontSize: '11px', padding: '2px 8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {svc}
                      </span>
                    )) : (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>No services</span>
                    )}
                  </div>
                </td>
                <td>
                  {tech.idFile && typeof tech.idFile === 'string' ? (
                    <a 
                      href={tech.idFile} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="doc-preview-badge"
                      title="View ID / Aadhar"
                    >
                      View ID
                    </a>
                  ) : tech.id_proof ? (
                    <a 
                      href={tech.id_proof} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="doc-preview-badge"
                      title="View ID / Aadhar"
                    >
                      View ID
                    </a>
                  ) : (
                    <span className="no-doc-badge">Not uploaded</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${tech.status.toLowerCase()}`}>
                    {tech.status}
                  </span>
                </td>
              <td>
                <div className="actions-cell">
                  <label className="switch" title="Toggle Status">
                    <input 
                      type="checkbox" 
                      checked={tech.status === 'Active'}
                      onChange={() => onToggleStatus(tech.id)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <button 
                    className="icon-btn edit-icon" 
                    onClick={() => onEditTechnician(tech.id)}
                    title="Edit"
                  >
                    <MdEdit size={20} />
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
