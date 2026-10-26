import { useState, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import type { Vendor } from '../types';
import VendorTable from '../components/VendorTable';
import VendorModal from '../components/VendorModal';
import Pagination from '../components/Pagination';
import Swal from 'sweetalert2';
import API from '../services/api';
import './ManageVendors.css';

export default function ManageVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/admin/vendors?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`);
      if (response.data.success) {
        const mappedVendors: Vendor[] = response.data.data.map((v: any) => ({
          id: v.id,
          display_id: v.display_id,
          fullName: v.full_name,
          businessName: v.business_name,
          mobile: v.mobile,
          email: v.email,
          gstNumber: v.gst_number,
          fullAddress: v.address,
          pincode: v.pincode || '',
          businessDescription: v.business_description || '',
          bankAccountDetails: v.bank_account_details || '',
          status: v.is_active ? 'Active' : 'Inactive'
        }));
        setVendors(mappedVendors);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
        } else {
          setTotalPages(1);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch vendors:', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [currentPage, debouncedSearch]);

  const handleSave = async (vendorData: Omit<Vendor, 'id' | 'status'> & { aadharFile?: File; panFile?: File; shopPhotoFile?: File; id?: string }) => {
    if (vendorData.id) {
      // Edit existing
      setVendors(prev => prev.map(v => v.id === vendorData.id ? vendorData as Vendor : v));
      setIsModalOpen(false);
      setEditingVendor(undefined);
    } else {
      // Add new
      try {
        const formData = new FormData();
        formData.append('email', vendorData.email);
        formData.append('mobile', vendorData.mobile);
        formData.append('password', vendorData.password || 'TempPass123!');
        formData.append('full_name', vendorData.fullName || '');
        formData.append('business_name', vendorData.businessName || '');
        formData.append('address', vendorData.fullAddress || '');
        formData.append('gst_number', vendorData.gstNumber || '');
        formData.append('pincode', vendorData.pincode || '');
        if (vendorData.businessDescription) formData.append('business_description', vendorData.businessDescription);
        if (vendorData.bankAccountDetails) formData.append('bank_account_details', vendorData.bankAccountDetails);

        if (vendorData.aadharFile) formData.append('aadhar_proof', vendorData.aadharFile);
        if (vendorData.panFile) formData.append('pan_proof', vendorData.panFile);
        if (vendorData.shopPhotoFile) formData.append('shop_photo', vendorData.shopPhotoFile);

        const response = await API.post('/admin/vendors', formData);
        if (response.data.success) {
          Swal.fire('Added!', 'Vendor has been added.', 'success');
          fetchVendors();
          setIsModalOpen(false);
          setEditingVendor(undefined);
        }
      } catch (error: any) {
        console.error('Create vendor error:', error);
        Swal.fire('Error', error?.response?.data?.message || 'Failed to add vendor', 'error');
      }
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Delete Vendor?',
      text: 'Are you sure you want to delete this vendor?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        setVendors(prev => prev.filter(v => v.id !== id));
        Swal.fire({
          title: 'Deleted!',
          text: 'Vendor has been removed successfully.',
          icon: 'success',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleToggleStatus = (id: string) => {
    setVendors(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, status: v.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return v;
    }));
  };

  return (
    <div className="manage-vendors-container">
      <div className="manage-vendors-header">
        <h1 className="page-title manage-vendors-title">Manage Vendors</h1>
        
        <div className="header-actions">
          <div className="search-wrapper">
            <MdSearch className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search vendors..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary add-btn" onClick={() => { setEditingVendor(undefined); setIsModalOpen(true); }}>
            Add Vendor
          </button>
        </div>
      </div>

      <div className="manage-vendors-table-wrapper">
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
        <VendorTable 
          vendors={vendors} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {isModalOpen && (
        <VendorModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingVendor(undefined); }}
          onSave={handleSave}
          vendor={editingVendor}
        />
      )}
    </div>
  );
}

