import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Technician, Service } from '../types';
import './TechnicianModal.css';

interface TechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tech: any) => void;
  technician?: Technician;
  servicesList?: Service[];
}

export default function TechnicianModal({ isOpen, onClose, onSave, technician, servicesList = [] }: TechnicianModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    location: '',
    password: '',
    services: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [idFile, setIdFile] = useState<File | null>(null);
  const [nocFile, setNocFile] = useState<File | null>(null);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodesList, setPincodesList] = useState<string[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    if (technician) {
      setFormData({
        name: technician.name || '',
        mobile: technician.mobile || '',
        email: technician.email || '',
        address: technician.address || '',
        location: technician.location || '',
        password: '',
        services: technician.services || [],
      });
      if (technician.location) {
        setPincodesList(technician.location.split(',').map(p => p.trim()).filter(Boolean));
      }
      // In a real app we'd display existing files differently
    }
  }, [technician]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'mobile') {
      newValue = value.replace(/\D/g, ''); // Only digits
    } else if (name === 'name') {
      newValue = value.replace(/[^A-Za-z\s]/g, ''); // Only letters and spaces
    } else if (name === 'pincodeInput') {
      newValue = value.replace(/\D/g, ''); // Only digits
      setPincodeInput(newValue);
      setErrors(prev => ({ ...prev, location: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const getServiceName = (idOrName: string) => {
    const found = servicesList.find(s => s.id === idOrName || s.name === idOrName);
    return found?.name || idOrName;
  };

  const handleAddService = () => {
    if (!selectedServiceId) return;
    if (formData.services.includes(selectedServiceId)) {
      setErrors(prev => ({ ...prev, services: 'Service already added' }));
      return;
    }
    setFormData(prev => ({ ...prev, services: [...prev.services, selectedServiceId] }));
    setSelectedServiceId('');
    setErrors(prev => ({ ...prev, services: '' }));
  };

  const handleRemoveService = (s: string) => {
    setFormData(prev => ({ ...prev, services: prev.services.filter(svc => svc !== s) }));
  };

  const availableServices = (servicesList || []).filter(
    s => !formData.services.includes(s.id) && !formData.services.includes(s.name || '')
  );

  const handleAddPincode = () => {
    const code = pincodeInput.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrors(prev => ({ ...prev, location: 'Enter a valid 6-digit pincode' }));
      return;
    }
    if (pincodesList.includes(code)) {
      setErrors(prev => ({ ...prev, location: 'Pincode already added' }));
      return;
    }
    const newList = [...pincodesList, code];
    setPincodesList(newList);
    setFormData(prev => ({ ...prev, location: newList.join(', ') }));
    setPincodeInput('');
    setErrors(prev => ({ ...prev, location: '' }));
  };

  const handleRemovePincode = (code: string) => {
    const newList = pincodesList.filter(p => p !== code);
    setPincodesList(newList);
    setFormData(prev => ({ ...prev, location: newList.join(', ') }));
  };

  const handlePreview = (file: File | string | null | undefined) => {
    if (!file) return;
    if (typeof file === 'string') {
      window.open(file, '_blank');
    } else {
      window.open(URL.createObjectURL(file), '_blank');
    }
  };

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIdFile(e.target.files[0]);
    }
  };

  const handleNocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNocFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    let hasError = false;

    if (formData.name.length < 5) {
      newErrors.name = "Letters and spaces only (5-50 chars)";
      hasError = true;
    }
    if (formData.mobile.length !== 10) {
      newErrors.mobile = "Must be exactly 10 digits";
      hasError = true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      hasError = true;
    }
    if (formData.address.length < 5) {
      newErrors.address = "Address must be at least 5 characters long";
      hasError = true;
    }
    if (!formData.location || pincodesList.length === 0) {
      newErrors.location = "Please add at least one pincode";
      hasError = true;
    }
    if (!technician && formData.password.length < 6) {
      newErrors.password = "Must be at least 6 characters long";
      hasError = true;
    }
    if (formData.services.length === 0) {
      newErrors.services = "Please add at least one service";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    if (technician) {
      // In edit mode, exclude password so technician credentials are never overwritten
      const { password, ...editData } = formData;
      const submittedData = {
        ...editData,
        ...(idFile && { idFile, idFileName: idFile.name }),
        ...(nocFile && { nocFile, nocFileName: nocFile.name })
      };
      onSave({ ...technician, ...submittedData });
    } else {
      const submittedData = {
        ...formData,
        ...(idFile && { idFile, idFileName: idFile.name }),
        ...(nocFile && { nocFile, nocFileName: nocFile.name })
      };
      onSave(submittedData);
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content technician-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{technician ? 'Edit Technician' : 'Add Technician'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" noValidate>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              name="name" 
              className={`input-field ${errors.name ? 'input-field-error' : ''}`} 
              value={formData.name} 
              onChange={handleChange} 
              maxLength={50} 
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          
          <div className="input-group">
            <label className="input-label">Mobile</label>
            <input 
              type="tel" 
              name="mobile" 
              className={`input-field ${errors.mobile ? 'input-field-error' : ''}`} 
              value={formData.mobile} 
              onChange={handleChange} 
              maxLength={10} 
            />
            {errors.mobile && <span className="error-text">{errors.mobile}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              name="email" 
              className={`input-field ${errors.email ? 'input-field-error' : ''}`} 
              value={formData.email} 
              onChange={handleChange} 
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Address</label>
            <textarea 
              name="address" 
              className={`input-field ${errors.address ? 'input-field-error' : ''}`} 
              rows={3}
              value={formData.address} 
              onChange={handleChange} 
              maxLength={200}
            />
            {errors.address && <span className="error-text">{errors.address}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Location (Pincodes)</label>
            <div className="pincode-input-row">
              <input 
                type="text"
                name="pincodeInput" 
                className={`input-field ${errors.location ? 'input-field-error' : ''}`} 
                value={pincodeInput} 
                onChange={handleChange}
                placeholder="e.g. 500001"
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPincode();
                  }
                }}
              />
              <button type="button" className="btn-add-pincode" onClick={handleAddPincode}>Add</button>
            </div>
            {errors.location && <span className="error-text">{errors.location}</span>}
            
            {pincodesList.length > 0 && (
              <div className="pincode-tags">
                {pincodesList.map(code => (
                  <span key={code} className="pincode-tag">
                    {code}
                    <button type="button" onClick={() => handleRemovePincode(code)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {!technician ? (
            <div className="input-group">
              <label className="input-label">Set Password</label>
              <input 
                type="password" 
                name="password" 
                className={`input-field ${errors.password ? 'input-field-error' : ''}`} 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Initial login password"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                Password is encrypted and managed by the technician. They can change it in their profile or reset it via OTP.
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Services Provided</label>
            <div className="pincode-input-row">
              <select
                className={`input-field ${errors.services ? 'input-field-error' : ''}`}
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setErrors(prev => ({ ...prev, services: '' }));
                }}
              >
                <option value="">-- Select a service to add --</option>
                {availableServices.map(s => {
                  const cat = (s as any).category;
                  const categoryName = typeof cat === 'string' ? cat : cat?.name;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} {categoryName ? `(${categoryName})` : ''}
                    </option>
                  );
                })}
              </select>
              <button 
                type="button" 
                className="btn-add-pincode" 
                onClick={handleAddService}
                disabled={!selectedServiceId}
              >
                Add
              </button>
            </div>
            {errors.services && <span className="error-text">{errors.services}</span>}
            
            {formData.services.length > 0 && (
              <div className="pincode-tags">
                {formData.services.map(svc => (
                  <span key={svc} className="pincode-tag">
                    {getServiceName(svc)}
                    <button type="button" onClick={() => handleRemoveService(svc)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* New Fields: File Uploads */}
          <div className="file-upload-row">
            <div className="input-group">
              <label className="input-label">Upload ID (Aadhar/PAN/Voter ID)</label>
              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  id="idFile"
                  accept=".pdf,image/*" 
                  onChange={handleIdFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="idFile" className="file-input-button">
                  Choose File
                </label>
                <span className="file-input-name" title={idFile ? idFile.name : technician?.idFileName || (technician?.id_proof ? 'Aadhar / ID Proof' : 'No file chosen')}>
                  {idFile ? idFile.name : technician?.idFileName || (technician?.id_proof ? 'Aadhar / ID Proof' : 'No file chosen')}
                </span>
                {(idFile || technician?.idFile || technician?.id_proof) && (
                  <button 
                    type="button" 
                    className="preview-btn"
                    onClick={() => handlePreview(idFile || technician?.idFile || technician?.id_proof)}
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Upload NOC</label>
              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  id="nocFile"
                  accept=".pdf,image/*" 
                  onChange={handleNocFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="nocFile" className="file-input-button">
                  Choose File
                </label>
                <span className="file-input-name" title={nocFile ? nocFile.name : technician?.nocFileName || (technician?.noc_document ? 'NOC Document' : 'No file chosen')}>
                  {nocFile ? nocFile.name : technician?.nocFileName || (technician?.noc_document ? 'NOC Document' : 'No file chosen')}
                </span>
                {(nocFile || technician?.nocFile || technician?.noc_document) && (
                  <button 
                    type="button" 
                    className="preview-btn"
                    onClick={() => handlePreview(nocFile || technician?.nocFile || technician?.noc_document)}
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn-primary save-btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
