import { useState, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import TechnicianTable from '../components/TechnicianTable';
import TechnicianModal from '../components/TechnicianModal';
import Pagination from '../components/Pagination';
import type { Technician, Service } from '../types';
import Swal from 'sweetalert2';
import API from '../services/api';
import './ManageTechnicians.css';

export default function ManageTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  const fetchServices = async () => {
    try {
      const res = await API.get('/admin/services?limit=500');
      let data: Service[] = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data;
      } else if (res.data?.data?.services && Array.isArray(res.data.data.services)) {
        data = res.data.data.services;
      } else if (res.data?.services && Array.isArray(res.data.services)) {
        data = res.data.services;
      }
      setServicesList(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const getFileNameFromUrl = (url?: string, defaultLabel: string = 'Document') => {
    if (!url) return '';
    try {
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('/');
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename) || defaultLabel;
    } catch {
      return defaultLabel;
    }
  };

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/admin/technicians?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`);
      if (response.data.success) {
        const mappedTechs: Technician[] = response.data.data.map((t: any) => ({
          id: t.id,
          display_id: t.display_id,
          name: t.full_name,
          mobile: t.mobile,
          email: t.email,
          address: t.address || '',
          location: Array.isArray(t.service_pincodes) ? t.service_pincodes.join(', ') : '',
          services: Array.isArray(t.services_provided) ? t.services_provided : [],
          services_provided: Array.isArray(t.services_provided) ? t.services_provided : [],
          services_names: Array.isArray(t.services_names) ? t.services_names : [],
          status: t.is_active ? 'Active' : 'Inactive',
          id_proof: t.id_proof || '',
          noc_document: t.noc_document || '',
          idFile: t.id_proof || undefined,
          idFileName: t.id_proof ? getFileNameFromUrl(t.id_proof, 'Aadhar / ID Proof') : '',
          nocFile: t.noc_document || undefined,
          nocFileName: t.noc_document ? getFileNameFromUrl(t.noc_document, 'NOC Document') : '',
        }));
        setTechnicians(mappedTechs);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
        } else {
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
      Swal.fire('Error', 'Failed to load technicians', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [currentPage, debouncedSearch]);

  const handleAddTechnician = async (newTechData: Omit<Technician, 'id' | 'status'> & { idFile?: File; nocFile?: File }) => {
    try {
      const formData = new FormData();
      formData.append('email', newTechData.email);
      formData.append('mobile', newTechData.mobile);
      formData.append('password', newTechData.password || 'TempPass123!');
      formData.append('full_name', newTechData.name);
      formData.append('address', newTechData.address);
      
      const pincodes = newTechData.location ? newTechData.location.split(',').map(s => s.trim()) : [];
      formData.append('service_pincodes', JSON.stringify(pincodes));
      formData.append('services_provided', JSON.stringify(newTechData.services || []));

      if (newTechData.idFile) {
        formData.append('id_proof', newTechData.idFile);
      }
      if (newTechData.nocFile) {
        formData.append('noc_document', newTechData.nocFile);
      }

      const response = await API.post('/admin/technicians', formData);
      if (response.data.success) {
        Swal.fire('Added!', 'New technician added successfully.', 'success');
        fetchTechnicians();
        setIsModalOpen(false);
      }
    } catch (error: any) {
      console.error('Create technician error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to create technician', 'error');
    }
  };

  const handleUpdateTechnician = async (updatedTechData: any) => {
    try {
      const formData = new FormData();
      formData.append('email', updatedTechData.email);
      formData.append('mobile', updatedTechData.mobile);
      if (updatedTechData.password && updatedTechData.password.trim()) {
        formData.append('password', updatedTechData.password.trim());
      }
      formData.append('full_name', updatedTechData.name);
      formData.append('address', updatedTechData.address || '');
      
      const pincodes = updatedTechData.location ? updatedTechData.location.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      formData.append('service_pincodes', JSON.stringify(pincodes));
      formData.append('services_provided', JSON.stringify(updatedTechData.services || []));

      if (updatedTechData.idFile instanceof File) {
        formData.append('id_proof', updatedTechData.idFile);
      }
      if (updatedTechData.nocFile instanceof File) {
        formData.append('noc_document', updatedTechData.nocFile);
      }

      const response = await API.put(`/admin/technicians/${updatedTechData.id}`, formData);
      if (response.data && response.data.success) {
        Swal.fire({
          title: 'Updated!',
          text: 'Technician has been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#4F46E5',
          timer: 2000,
          showConfirmButton: false
        });
        setEditingTechnician(null);
        fetchTechnicians();
      }
    } catch (error: any) {
      console.error('Update technician error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update technician', 'error');
    }
  };

  const handleEditTechnician = (id: string) => {
    const target = technicians.find(t => t.id === id);
    if (target) {
      setEditingTechnician(target);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const tech = technicians.find(t => t.id === id);
    if (!tech) return;
    const newActive = tech.status !== 'Active';
    try {
      await API.patch(`/admin/technicians/${id}/status`, { is_active: newActive });
      setTechnicians(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, status: newActive ? 'Active' : 'Inactive' };
        }
        return t;
      }));
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="manage-technicians-container">
      <div className="manage-technicians-header">
        <h1 className="page-title manage-technicians-title">Manage Technicians</h1>
        
        <div className="header-actions">
          <div className="search-wrapper">
            <MdSearch className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search technicians..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary add-btn" onClick={() => setIsModalOpen(true)}>
            Add Technician
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', minHeight: '300px' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}
        <TechnicianTable
          technicians={technicians}
          servicesList={servicesList}
          onEditTechnician={handleEditTechnician}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {isModalOpen && (
        <TechnicianModal
          isOpen={isModalOpen}
          servicesList={servicesList}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddTechnician}
        />
      )}

      {editingTechnician && (
        <TechnicianModal
          isOpen={Boolean(editingTechnician)}
          technician={editingTechnician}
          servicesList={servicesList}
          onClose={() => setEditingTechnician(null)}
          onSave={(tech) => handleUpdateTechnician(tech as Technician)}
        />
      )}
    </div>
  );
}
