import { useState, useMemo, useEffect } from 'react';
import PartnerServiceForm from '../components/PartnerServiceForm';
import PartnerServiceTable from '../components/PartnerServiceTable';
import type { PartnerService } from '../types';
import { usePartnerContext } from '../context/PartnerContext';
import Swal from 'sweetalert2';
import API from '../services/api';
import './ManageProducts.css';

export default function ManagePartnerServices() {
  const { setPartnerServices } = usePartnerContext(); // Optional: update context if needed elsewhere, but we'll manage list locally
  const [services, setServices] = useState<PartnerService[]>([]);
  const [categories, setCategories] = useState<{ id?: string; _id?: string; name: string }[]>([]);
  const [partnerTypes, setPartnerTypes] = useState<{ id: string; name: string }[]>([]);
  const [pricingTypes, setPricingTypes] = useState<{ id: string; name: string }[]>([]);

  const [editingService, setEditingService] = useState<PartnerService | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCategories();
    fetchServices();
    fetchPartnerTypes();
    fetchPricingTypes();
  }, []);

  
  const fetchPricingTypes = async () => {
    try {
      const res = await API.get('/admin/pricing-types');
      if (res.data.success) {
        setPricingTypes(res.data.data.map((pt: any) => ({
          id: pt.id || pt._id,
          name: pt.name
        })));
      }
    } catch (error) {
      console.error('Error fetching pricing types:', error);
    }
  };

  const fetchPartnerTypes = async () => {
    try {
      const res = await API.get('/admin/partner-types');
      if (res.data.success) {
        setPartnerTypes(res.data.data.map((pt: any) => ({
          id: pt.id || pt._id,
          name: pt.name,
          category_id: pt.category_id || pt.category?.id
        })));
      }
    } catch (error) {
      console.error('Error fetching partner types:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get('/admin/categories');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await API.get('/admin/services?service_owner_type=Partner');
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data;
      } else if (res.data?.data?.services && Array.isArray(res.data.data.services)) {
        data = res.data.data.services;
      }
      setServices(data);
      setPartnerServices(data); // Sync context if needed by other components
    } catch (error) {
      console.error('Error fetching partner services:', error);
    }
  };

  const handleSaveService = async (serviceData: Omit<PartnerService, 'id'> | PartnerService) => {
    try {
      const isEditing = 'id' in serviceData && serviceData.id;
      
      const formData = new FormData();
      formData.append('category_id', serviceData.category_id);
      formData.append('service_owner_type', 'Partner');
      formData.append('name', serviceData.serviceName);
      formData.append('pricing_type_id', serviceData.pricingTypeId);
      formData.append('price', String(serviceData.rate));
      if ((serviceData as any).admin_commission_rate !== undefined) {
        formData.append('admin_commission_rate', String((serviceData as any).admin_commission_rate));
      }
      
      if (serviceData.required_partner_type_id) {
        formData.append('required_partner_type_id', serviceData.required_partner_type_id);
      }
      
      if (serviceData.customFields) {
        formData.append('custom_fields', JSON.stringify(serviceData.customFields));
      }
      if (serviceData.image && serviceData.image instanceof File) {
        formData.append('image', serviceData.image);
      }

      if (isEditing) {
        await API.put(`/admin/services/${serviceData.id}`, formData);
        Swal.fire('Updated!', 'Partner service updated successfully.', 'success');
      } else {
        await API.post('/admin/services', formData);
        Swal.fire('Added!', 'New partner service added successfully.', 'success');
      }
      
      setEditingService(null);
      setIsAdding(false);
      fetchServices();
    } catch (error: any) {
      console.error('Error saving partner service:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to save partner service', 'error');
    }
  };

  const handleEditService = (id: string) => {
    const targetService = services.find(s => s.id === id);
    if (targetService) {
      setEditingService(targetService); // For now, editing can just open a generic modal or be skipped to simplify. Let's assume edit opens a modal.
    }
  };



  const handleToggleStatus = async (id: string) => {
    const targetService = services.find(s => s.id === id);
    if (!targetService) return;

    const isCurrentlyActive = targetService.status === 'Active' || (targetService as any).is_active === true;
    const newIsActive = !isCurrentlyActive;

    setServices(prevServices => prevServices.map(s => {
      if (s.id === id) {
        return { ...s, status: newIsActive ? 'Active' : 'Inactive', is_active: newIsActive };
      }
      return s;
    }));

    try {
      const res = await API.patch(`/admin/services/${id}/status`, { is_active: newIsActive });
      Swal.fire({
        title: newIsActive ? 'Activated!' : 'Deactivated!',
        text: res.data?.message || `Service status updated to ${newIsActive ? 'active' : 'inactive'}`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      setServices(prevServices => prevServices.map(s => {
        if (s.id === id) {
          return { ...s, status: isCurrentlyActive ? 'Active' : 'Inactive', is_active: isCurrentlyActive };
        }
        return s;
      }));
      Swal.fire({
        title: 'Error',
        text: 'Failed to update service status',
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return services.filter(s => {
      const matchCategory = s.category && typeof s.category === 'string' && s.category.toLowerCase().includes(query);
      const matchName = s.serviceName && typeof s.serviceName === 'string' && s.serviceName.toLowerCase().includes(query);
      return matchCategory || matchName || query === '';
    });
  }, [services, searchQuery]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="manage-products-header" style={{ flexWrap: 'wrap', gap: '15px' }}>
        <h1 className="page-title manage-products-title">Manage Partner Services</h1>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by category, name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              minWidth: '250px'
            }}
          />
          <button
            onClick={() => setIsAdding(!isAdding)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isAdding ? '#ef4444' : '#4F46E5',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isAdding ? 'Cancel' : '+ Add Service'}
          </button>
        </div>
      </div>

      {(isAdding || editingService) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
             <button 
               onClick={() => { setIsAdding(false); setEditingService(null); }}
               style={{ position: 'absolute', top: '25px', right: '25px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10, color: '#64748b' }}
             >
               &times;
             </button>
             <PartnerServiceForm 
               onSaveService={handleSaveService} 
               onCancel={() => { setIsAdding(false); setEditingService(null); }}
               initialData={editingService}
               categories={categories}
               partnerTypes={partnerTypes}
               pricingTypes={pricingTypes}
             />
          </div>
        </div>
      )}

      <PartnerServiceTable
        services={paginatedServices}
        onEditService={handleEditService}

        onToggleStatus={handleToggleStatus}
      />

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px', alignItems: 'center' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: currentPage === 1 ? '#f1f5f9' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 15px', background: 'white', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 500 }}>
            Page {currentPage} of {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: currentPage === totalPages ? '#f1f5f9' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
