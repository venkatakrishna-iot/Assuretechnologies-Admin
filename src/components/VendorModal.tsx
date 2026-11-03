import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiUploadCloud } from 'react-icons/fi';
import type { Vendor } from '../types';
import { GST_STATE_CODES, getGstStateCode } from '../data/gstStateCodes';
import './VendorModal.css';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendor: any) => Promise<void>;
  vendor?: Vendor;
}

export default function VendorModal({ isOpen, onClose, onSave, vendor }: VendorModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    mobile: '',
    email: '',
    gstNumber: '',
    gstStateCode: '37',
    fullAddress: '',
    pincode: '',
    businessDescription: '',
    bankAccountDetails: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [shopPhotoFile, setShopPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (vendor) {
      const vGst = vendor.gstNumber || '';
      const vCode = (vendor as any).gstStateCode || getGstStateCode(vGst) || '37';
      setFormData({
        fullName: vendor.fullName || '',
        businessName: vendor.businessName || '',
        mobile: vendor.mobile || '',
        email: vendor.email || '',
        gstNumber: vGst,
        gstStateCode: vCode,
        fullAddress: vendor.fullAddress || '',
        pincode: vendor.pincode || '',
        businessDescription: vendor.businessDescription || '',
        bankAccountDetails: vendor.bankAccountDetails || '',
        password: vendor.password || '',
      });
    }
  }, [vendor]);

  if (!isOpen) return null;

  const handleStateCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setFormData(prev => {
      let updatedGst = prev.gstNumber;
      if (!updatedGst) {
        updatedGst = newCode;
      } else if (updatedGst.length >= 2) {
        updatedGst = newCode + updatedGst.slice(2);
      } else {
        updatedGst = newCode;
      }
      return {
        ...prev,
        gstStateCode: newCode,
        gstNumber: updatedGst
      };
    });
    setErrors(prev => ({ ...prev, gstNumber: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'mobile' || name === 'pincode') {
      newValue = value.replace(/\D/g, ''); // Only digits
    } else if (name === 'fullName') {
      newValue = value.replace(/[^A-Za-z\s]/g, ''); // Only letters and spaces
    } else if (name === 'businessName') {
      newValue = value.replace(/[^A-Za-z0-9\s]/g, ''); // Alphanumeric and spaces
    } else if (name === 'gstNumber') {
      newValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); // Alphanumeric uppercase only
      // Auto sync state code dropdown if first 2 digits match a known code
      if (newValue.length >= 2) {
        const detectedCode = getGstStateCode(newValue.slice(0, 2));
        if (detectedCode) {
          setFormData(prev => ({ ...prev, gstNumber: newValue, gstStateCode: detectedCode }));
          setErrors(prev => ({ ...prev, [name]: '' }));
          return;
        }
      }
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePreview = (file: File | string | null | undefined) => {
    if (!file) return;
    if (typeof file === 'string') {
      window.open(file, '_blank');
    } else {
      window.open(URL.createObjectURL(file), '_blank');
    }
  };

  const handleAadharFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAadharFile(e.target.files[0]);
    }
  };

  const handlePanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPanFile(e.target.files[0]);
    }
  };

  const handleShopPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setShopPhotoFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    let hasError = false;

    if (formData.fullName.length < 5) {
      newErrors.fullName = "Letters and spaces only (5-50 chars)";
      hasError = true;
    }
    if (formData.businessName.length < 5) {
      newErrors.businessName = "Alphanumeric only (5-50 chars)";
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
    if (formData.gstNumber.length !== 15) {
      newErrors.gstNumber = "Must be exactly 15 characters";
      hasError = true;
    }
    if (formData.fullAddress.length < 5) {
      newErrors.fullAddress = "Address must be at least 5 characters long";
      hasError = true;
    }
    if (formData.pincode.length !== 6) {
      newErrors.pincode = "Must be exactly 6 digits";
      hasError = true;
    }
    if (formData.businessDescription && formData.businessDescription.length < 10) {
      newErrors.businessDescription = "Description must be at least 10 characters long";
      hasError = true;
    }
    if (formData.bankAccountDetails.length < 10) {
      newErrors.bankAccountDetails = "Bank details must be at least 10 characters long";
      hasError = true;
    }

    if (!vendor && formData.password.length < 6) {
      newErrors.password = "Must be at least 6 characters long";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    const submittedData = {
      ...formData,
      ...(aadharFile && { aadharFile, aadharFileName: aadharFile.name }),
      ...(panFile && { panFile, panFileName: panFile.name }),
      ...(shopPhotoFile && { shopPhotoFile, shopPhotoFileName: shopPhotoFile.name })
    };

    if (vendor) {
      onSave({ ...vendor, ...submittedData });
    } else {
      onSave(submittedData);
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vendor-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body scrollable-body" noValidate>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" name="fullName" className={`input-field ${errors.fullName ? 'input-field-error' : ''}`} value={formData.fullName} onChange={handleChange} maxLength={50} />
            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Business Name</label>
            <input type="text" name="businessName" className={`input-field ${errors.businessName ? 'input-field-error' : ''}`} value={formData.businessName} onChange={handleChange} maxLength={50} />
            {errors.businessName && <span className="error-text">{errors.businessName}</span>}
          </div>
          
          <div className="input-group">
            <label className="input-label">Mobile</label>
            <input type="tel" name="mobile" className={`input-field ${errors.mobile ? 'input-field-error' : ''}`} value={formData.mobile} onChange={handleChange} maxLength={10} />
            {errors.mobile && <span className="error-text">{errors.mobile}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" name="email" className={`input-field ${errors.email ? 'input-field-error' : ''}`} value={formData.email} onChange={handleChange} />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">GST State Code</label>
              <select
                name="gstStateCode"
                className="input-field"
                value={formData.gstStateCode}
                onChange={handleStateCodeChange}
              >
                {GST_STATE_CODES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">GST Number</label>
              <input type="text" name="gstNumber" className={`input-field ${errors.gstNumber ? 'input-field-error' : ''}`} value={formData.gstNumber} onChange={handleChange} maxLength={15} />
              {errors.gstNumber && <span className="error-text">{errors.gstNumber}</span>}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Full Address</label>
            <textarea name="fullAddress" className={`input-field ${errors.fullAddress ? 'input-field-error' : ''}`} rows={3} value={formData.fullAddress} onChange={handleChange} maxLength={200} />
            {errors.fullAddress && <span className="error-text">{errors.fullAddress}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Pincode</label>
            <input type="text" name="pincode" className={`input-field ${errors.pincode ? 'input-field-error' : ''}`} value={formData.pincode} onChange={handleChange} maxLength={6} />
            {errors.pincode && <span className="error-text">{errors.pincode}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Business Description</label>
            <textarea name="businessDescription" className={`input-field ${errors.businessDescription ? 'input-field-error' : ''}`} rows={3} value={formData.businessDescription} onChange={handleChange} maxLength={200} />
            {errors.businessDescription && <span className="error-text">{errors.businessDescription}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Bank Account Details</label>
            <textarea name="bankAccountDetails" className={`input-field ${errors.bankAccountDetails ? 'input-field-error' : ''}`} rows={3} value={formData.bankAccountDetails} onChange={handleChange} maxLength={200} />
            {errors.bankAccountDetails && <span className="error-text">{errors.bankAccountDetails}</span>}
          </div>



          <div className="input-group">
            <label className="input-label">Set Password</label>
            <input type="password" name="password" className={`input-field ${errors.password ? 'input-field-error' : ''}`} value={formData.password} onChange={handleChange} />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {/* New Fields: File Uploads */}
          <div className="file-upload-row">
            <div className="input-group">
              <label className="input-label">Upload Aadhar</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="aadharFile"
                  accept=".pdf,image/*"
                  onChange={handleAadharFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="aadharFile" className="upload-dropzone">
                  <FiUploadCloud className="upload-icon" />
                  <span className="upload-text">Click to browse file</span>
                </label>

                <div className="file-info-area">
                  <span className="file-input-name" title={aadharFile ? aadharFile.name : vendor?.aadharFileName || 'No file chosen'}>
                    {aadharFile ? aadharFile.name : vendor?.aadharFileName || 'No file chosen'}
                  </span>
                  {(aadharFile || vendor?.aadharFile) && (
                    <button
                      type="button"
                      className="preview-btn"
                      onClick={() => handlePreview(aadharFile || vendor?.aadharFile)}
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Upload PAN Card</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="panFile"
                  accept=".pdf,image/*"
                  onChange={handlePanFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="panFile" className="upload-dropzone">
                  <FiUploadCloud className="upload-icon" />
                  <span className="upload-text">Click to browse file</span>
                </label>

                <div className="file-info-area">
                  <span className="file-input-name" title={panFile ? panFile.name : vendor?.panFileName || 'No file chosen'}>
                    {panFile ? panFile.name : vendor?.panFileName || 'No file chosen'}
                  </span>
                  {(panFile || vendor?.panFile) && (
                    <button
                      type="button"
                      className="preview-btn"
                      onClick={() => handlePreview(panFile || vendor?.panFile)}
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Upload Shop Photo</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="shopPhotoFile"
                  accept=".jpg,.jpeg,.png,image/*"
                  onChange={handleShopPhotoChange}
                  className="file-input-hidden"
                />
                <label htmlFor="shopPhotoFile" className="upload-dropzone">
                  <FiUploadCloud className="upload-icon" />
                  <span className="upload-text">Click to browse file</span>
                </label>

                <div className="file-info-area">
                  <span className="file-input-name" title={shopPhotoFile ? shopPhotoFile.name : vendor?.shopPhotoFileName || 'No file chosen'}>
                    {shopPhotoFile ? shopPhotoFile.name : vendor?.shopPhotoFileName || 'No file chosen'}
                  </span>
                  {(shopPhotoFile || vendor?.shopPhotoFile) && (
                    <button
                      type="button"
                      className="preview-btn"
                      onClick={() => handlePreview(shopPhotoFile || vendor?.shopPhotoFile)}
                    >
                      Preview
                    </button>
                  )}
                </div>
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

