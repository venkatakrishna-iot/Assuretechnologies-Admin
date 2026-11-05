import type { PartnerService } from '../types';
import { MdEdit } from 'react-icons/md';
import './ProductTable.css'; 

interface PartnerServiceTableProps {
  services: PartnerService[];
  onEditService: (id: string) => void;

  onToggleStatus?: (id: string) => void;
}

export default function PartnerServiceTable({
  services,
  onEditService,

  onToggleStatus
}: PartnerServiceTableProps) {
  if (services.length === 0) {
    return (
      <div className="glass-panel product-table-empty">
        <p>No partner services found. Add a new service to get started.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel product-table-wrapper">
      <div className="product-table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th className="id-col">ID</th>
              <th>Category</th>
              <th>Service Name</th>
              <th>Pricing</th>
              <th>Commission</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              return (
                <tr key={service.id}>
                  <td>
                    <span className="product-id">#{service.display_id || service.id}</span>
                  </td>
                  <td>
                    <span className="product-category-badge">
                      {typeof service.category === 'object' ? (service.category as any).name : service.category}
                    </span>
                  </td>
                  <td>
                    <div className="product-name">{service.name || service.serviceName}</div>
                  </td>
                  <td>
                    <div className="product-price">
                      <span>₹ {service.price !== undefined ? service.price : service.rate} / {service.pricingType?.label || 'Unknown Unit'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      {(service as any).admin_commission_rate !== undefined ? `${(service as any).admin_commission_rate}%` : '10%'}
                    </span>
                  </td>
                <td>
                  <div className="product-banner" title={service.name || service.serviceName}>
                    {service.image ? (
                      <img src={typeof service.image === 'string' ? service.image : URL.createObjectURL(service.image as File)} alt="Service Image" style={{ height: '40px', width: 'auto', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <span className="product-banner-text">No Image</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="product-actions" style={{ alignItems: 'center' }}>
                    {onToggleStatus && (
                      <label className="switch" title="Toggle Status" style={{ marginRight: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={service.status === 'Active' || (service as any).is_active === true}
                          onChange={() => onToggleStatus(service.id)}
                        />
                        <span className="slider round"></span>
                      </label>
                    )}
                    <button
                      className="icon-btn edit-icon"
                      onClick={() => onEditService(service.id)}
                      title="Edit Service"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
    </div>
  );
}
