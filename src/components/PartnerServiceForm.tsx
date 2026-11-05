
import { useState, useRef, useEffect } from 'react';

import type { PartnerService, CustomField } from '../types';
import { MdCheckCircle, MdAdd, MdDelete } from 'react-icons/md';

import { usePartnerContext } from '../context/PartnerContext';
import API from '../services/api';

interface PartnerServiceFormProps {
  onSaveService: (service: Omit<PartnerService, 'id'> | PartnerService) => void;
  onCancel?: () => void;
  initialData?: PartnerService | null;
  categories: { id?: string; _id?: string; name: string }[];
  partnerTypes?: { id: string; name: string; category_id?: string }[];
  pricingTypes?: { id: string; name: string }[];
}

export default function PartnerServiceForm({ onSaveService, onCancel, initialData, categories, pricingTypes: propPricingTypes }: PartnerServiceFormProps) {
  const { pricingTypes: contextPricingTypes } = usePartnerContext();
  const pricingTypes = (propPricingTypes && propPricingTypes.length > 0) ? propPricingTypes : contextPricingTypes;

  const [category_id, setCategoryId] = useState(initialData?.category_id || '');
  const [serviceName, setServiceName] = useState(initialData?.name || initialData?.serviceName || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>(initialData?.custom_fields || initialData?.customFields || []);
  const [pricingTypeId, setPricingTypeId] = useState<string>((initialData as any)?.pricing_type_id || (initialData as any)?.pricing_type?.id || (initialData as any)?.pricingType?.id || initialData?.pricingTypeId || (pricingTypes.length > 0 ? pricingTypes[0].id : ''));
  const [required_partner_type_id, setRequiredPartnerTypeId] = useState<string>(initialData?.required_partner_type_id || (initialData as any)?.required_partner_type?.id || (initialData as any)?.requiredPartnerType?.id || '');
  const [rate, setRate] = useState<number | undefined>(initialData?.price !== undefined ? initialData.price : initialData?.rate);
  const [adminCommissionRate, setAdminCommissionRate] = useState<number>((initialData as any)?.admin_commission_rate !== undefined ? Number((initialData as any).admin_commission_rate) : 10);
  const [categoryPartnerTypes, setCategoryPartnerTypes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingPartnerTypes, setIsLoadingPartnerTypes] = useState(false);

  useEffect(() => {
    if (!category_id) {
      setCategoryPartnerTypes([]);
      setRequiredPartnerTypeId('');
      return;
    }

    let isMounted = true;
    setIsLoadingPartnerTypes(true);

    API.get(`/admin/partner-types?category_id=${category_id}`)
      .then(res => {
        if (isMounted && res.data?.success) {
          const list = res.data.data.map((pt: any) => ({
            id: pt.id || pt._id,
            name: pt.name
          }));
          setCategoryPartnerTypes(list);
          setRequiredPartnerTypeId(prev => {
            return list.some((pt: any) => pt.id === prev) ? prev : (list[0]?.id || '');
          });
        }
      })
      .catch(err => {
        console.error('Failed to load partner types for category:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPartnerTypes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category_id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.category_id || (initialData as any)?.category?.id || '');
      setServiceName(initialData.name || initialData.serviceName || '');
      setCustomFields(initialData.custom_fields || initialData.customFields || []);
      setPricingTypeId((initialData as any).pricing_type_id || (initialData as any)?.pricing_type?.id || (initialData as any)?.pricingType?.id || initialData.pricingTypeId || (pricingTypes.length > 0 ? pricingTypes[0].id : ''));
      setRequiredPartnerTypeId(initialData.required_partner_type_id || (initialData as any)?.required_partner_type?.id || (initialData as any)?.requiredPartnerType?.id || '');
      setRate(initialData.price !== undefined ? initialData.price : initialData.rate);
      setAdminCommissionRate((initialData as any)?.admin_commission_rate !== undefined ? Number((initialData as any).admin_commission_rate) : 10);
    } else {
      setCategoryId('');
      setServiceName('');
      setCustomFields([]);
      setPricingTypeId(pricingTypes.length > 0 ? pricingTypes[0].id : '');
      setRequiredPartnerTypeId('');
      setRate(undefined);
      setAdminCommissionRate(10);
    }
  }, [initialData, pricingTypes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName) return;

    const submittedData = {
      category_id,
      serviceName,
      image: imageFile || initialData?.image || '',
      imageName: imageFile ? imageFile.name : initialData?.imageName || 'No file chosen',
      pricingTypeId,
      required_partner_type_id,
      rate: rate || 0,
      admin_commission_rate: adminCommissionRate !== undefined ? adminCommissionRate : 10,
      customFields: customFields.map(cf => ({
        ...cf,
        options: cf.type === 'dropdown' ? (cf.options?.map(s => s.trim()).filter(s => s) || []) : undefined
      }))
    };

    if (initialData) {
      onSaveService({ ...initialData, ...submittedData });
    } else {
      onSaveService(submittedData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const addCustomField = () => {
    setCustomFields(prev => [
      ...prev, 
      { id: Math.random().toString(36).substring(2, 9), label: '', type: 'text', required: false }
    ]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  return (
    <div className="glass-panel product-form-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="product-form-title" style={{ margin: 0 }}>{initialData ? 'Edit Partner Service' : 'Add Partner Service'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

          <div className="input-group form-group">
            <label className="input-label" htmlFor="serviceCategory">Category</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                id="serviceCategory"
                className="input-field category-select colorful-input"
                style={{ width: '100%', paddingRight: '40px' }}
                value={category_id}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="" disabled hidden>Select Category...</option>
                {categories.map(cat => (
                  <option key={cat.id || cat._id} value={cat.id || cat._id}>{cat.name}</option>
                ))}
              </select>
              {category_id && <MdCheckCircle color="#10B981" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />}
            </div>
          </div>

          {/* Required Partner Type */}
          <div className="input-group form-group">
            <label className="input-label" htmlFor="partnerType">Partner Type</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                id="partnerType"
                className="input-field category-select colorful-input"
                style={{
                  width: '100%',
                  paddingRight: required_partner_type_id ? '40px' : '16px',
                  backgroundColor: !category_id ? '#f1f5f9' : '#ffffff',
                  cursor: !category_id ? 'not-allowed' : 'pointer'
                }}
                value={required_partner_type_id}
                onChange={(e) => setRequiredPartnerTypeId(e.target.value)}
                required
                disabled={!category_id || isLoadingPartnerTypes}
              >
                <option value="" disabled hidden>
                  {!category_id
                    ? 'Select Category first...'
                    : isLoadingPartnerTypes
                      ? 'Loading partner types...'
                      : categoryPartnerTypes.length === 0
                        ? 'No partner types for this category'
                        : 'Select Partner Type...'}
                </option>
                {categoryPartnerTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
              {required_partner_type_id && (
                <MdCheckCircle
                  color="#10B981"
                  style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }}
                />
              )}
            </div>
          </div>

          <div className="input-group form-group">
            <label className="input-label" htmlFor="serviceName">Service Name</label>
            <input
              type="text"
              id="serviceName"
              className="input-field colorful-input"
              placeholder="e.g. 10L Drone Spraying"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
            />
          </div>

          <div className="input-group form-group">
            <label className="input-label" htmlFor="pricingType">Pricing Type</label>
            <select
              id="pricingType"
              className="input-field colorful-select"
              value={pricingTypeId}
              onChange={(e) => setPricingTypeId(e.target.value)}
              required
            >
              {pricingTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group form-group">
            <label className="input-label" htmlFor="rate">Rate / User Amount (₹)</label>
            <input
              type="number"
              id="rate"
              className="input-field colorful-input"
              placeholder="e.g. 2000"
              value={rate || ''}
              onChange={(e) => setRate(e.target.value ? Number(e.target.value) : undefined)}
              min="1"
              required
            />
          </div>

          <div className="input-group form-group">
            <label className="input-label" htmlFor="adminCommission">Admin Commission (%)</label>
            <input
              type="number"
              id="adminCommission"
              className="input-field colorful-input"
              placeholder="e.g. 10"
              value={adminCommissionRate}
              onChange={(e) => setAdminCommissionRate(e.target.value ? Number(e.target.value) : 0)}
              min="0"
              max="100"
              required
            />
          </div>

          {(rate || 0) > 0 && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '5px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#166534', fontWeight: 700 }}>
                💡 Live Commission & Payout Preview (Per Unit):
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                <span style={{ color: '#4b5563' }}>User Amount (Customer / Farmer Pays):</span>
                <strong style={{ color: '#111827' }}>₹{Number(rate).toLocaleString('en-IN')} (0% GST)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                <span style={{ color: '#166534' }}>Admin Commission ({adminCommissionRate}%):</span>
                <strong style={{ color: '#166534' }}>+₹{Math.round(Number(rate) * (adminCommissionRate / 100)).toLocaleString('en-IN')} (Platform Profit)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '6px', borderTop: '1px dashed #bbf7d0' }}>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>Partner Payout ({100 - adminCommissionRate}%):</span>
                <strong style={{ color: '#2563eb' }}>₹{(Number(rate) - Math.round(Number(rate) * (adminCommissionRate / 100))).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          )}

          <div className="input-group form-group-full">
            <label className="input-label">Service Image</label>
            <div
              className="modern-file-input"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="modern-file-btn">Choose File</div>
              <div className="modern-file-name">
                {imageFile ? imageFile.name : 'No file chosen'}
              </div>
              <input
                type="file"
                id="serviceImage"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="file-input-hidden"
                accept="image/*"
              />
            </div>
          </div>

          <div className="input-group form-group-full mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="input-label" style={{ margin: 0 }}>Custom Fields (Booking Form)</label>
              <button 
                type="button" 
                onClick={addCustomField}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                <MdAdd /> Add Field
              </button>
            </div>
            
            {customFields.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '15px', borderRadius: '6px', textAlign: 'center' }}>No custom fields added. The default booking form fields will be used.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {customFields.map((field) => (
                  <div key={field.id} style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                    <button 
                      type="button" 
                      onClick={() => removeCustomField(field.id)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <MdDelete size={20} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', paddingRight: '20px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Field Label *</label>
                        <input 
                          type="text" 
                          required 
                          value={field.label} 
                          onChange={e => updateCustomField(field.id, { label: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          placeholder="e.g. Acreage"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Field Type</label>
                        <select 
                          value={field.type} 
                          onChange={e => updateCustomField(field.id, { type: e.target.value as any })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                      <div style={{ flex: 0.5, display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={field.required} 
                            onChange={e => updateCustomField(field.id, { required: e.target.checked })}
                          /> Required
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: 500 }}
            >
              Save Service
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
