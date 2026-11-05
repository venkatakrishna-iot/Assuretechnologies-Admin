export interface Product {
  id: string;
  display_id?: string;
  vendor_id?: string;
  name: string;
  category: string;
  price: string;
  discount?: string | number;
  admin_commission?: string | number;
  banner: string | File;
  bannerName: string;
  description: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Draft' | 'Active' | 'Inactive';
  stock?: number;
}

export interface Technician {
  id: string;
  display_id?: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  location: string;
  status: 'Active' | 'Inactive';
  password?: string;
  services?: string[];
  services_names?: string[];
  services_provided?: string[];
  idFile?: string | File;
  idFileName?: string;
  nocFile?: string | File;
  nocFileName?: string;
}

export interface DronePartner {
  id: string;
  display_id?: string;
  name: string;
  mobile: string;
  email: string;
  location: string;
  status: 'Active' | 'Inactive';
  password?: string;
  partnerType?: string;
  coverageAreas?: string;
  equipmentTypes?: string[];
  totalAmount?: number;
  vehicleNumber?: string;
  idFileName?: string;
  idFile?: string | File;
  licenseFileName?: string;
  licenseFile?: string | File;
  driverLicenseFileName?: string;
  driverLicenseFile?: string | File;
  rcFileName?: string;
  rcFile?: string | File;
}

export interface Vendor {
  id: string;
  display_id?: string;
  fullName: string;
  mobile: string;
  email: string;
  status: 'Active' | 'Inactive';
  password?: string;
  businessName?: string;
  gstNumber?: string;
  fullAddress?: string;
  pincode?: string;
  businessDescription?: string;
  bankAccountDetails?: string;
  aadharFile?: string | File;
  aadharFileName?: string;
  panFile?: string | File;
  panFileName?: string;
  shopPhotoFile?: string | File;
  shopPhotoFileName?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown';
  options?: string[];
  required: boolean;
}

export interface Service {
  id: string;
  display_id?: string;
  category_id: string;
  category?: string;
  subCategory?: string;
  name?: string;
  image?: string | File;
  imageName?: string;
  customFields?: CustomField[];
  custom_fields?: CustomField[];
  prebookingCharge?: number;
  prebooking_charge?: number | string;
  requiredPartnerType?: { id: string; name: string };
  required_partner_type_id?: string;
  status?: 'Active' | 'Inactive';
}

export interface OrderItem {
  id: string;
  productName: string;
  vendorName: string;
  price: number;
  qty: number;
  subtotal: number;
  status?: string;
  trackingId?: string;
  transportName?: string;
  trackUrl?: string;
  vendorId?: string;
}

export type OrderStatus = 'New' | 'Accepted' | 'Out for Delivery' | 'Completed' | 'Rejected' | 'Cancelled';

export interface Order {
  id: string;
  date: string;
  user: string;
  mobile: string;
  email: string;
  companyName?: string;
  gstNumber?: string;
  address: string;
  pincode: string;
  totalAmount: number;
  adminCommission?: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid';
  status: OrderStatus;
  items: OrderItem[];
  transportName?: string;
  trackingId?: string;
  trackUrl?: string;
  razorpayPaymentId?: string;
  paymentDetails?: any;
  paidAt?: string;
}

export type ServiceRequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Assigned'
  | 'In Progress'
  | 'Awaiting Approval'
  | 'Completed'
  | 'Cancelled';

export type ProgressUpdate = {
  id: string;
  date: string;
  description: string;
  photos: string[];
};

export interface ServiceRequest {
  id: string;
  displayId?: string;
  orderNumber?: string;
  userId: string;
  userName: string;
  userMobile: string;
  userEmail: string;
  userAddress: string;
  pincode?: string;
  serviceName: string;
  date: string;
  time: string;
  status: ServiceRequestStatus;
  technicianId?: string;
  technician?: Technician;
  startDescription?: string;
  startWorkPhotos?: string[];
  completeWorkPhotos?: string[];
  progressUpdates?: ProgressUpdate[];
  customFieldResponses?: Record<string, string>;
  paymentStatus?: 'Prebooking Paid' | 'Pending' | 'Paid in Full';
  prebookingAmountPaid?: number;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  paymentDetails?: any;
  paidAt?: string;
}

export interface QuotationService {
  id: string;
  name: string;
  qty: number;
  cost: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  mobile: string;
  email?: string;
  companyName?: string;
  gstNumber?: string;
  address?: string;
  pincode?: string;
  subtotal: number;
  additionalChargesDesc?: string;
  additionalCharges: number;
  gstPercent: number;
  grandTotal: number;
  services: QuotationService[];
  date: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  warranty?: string;
  modelNumber?: string;
  hsnCode?: string;
  serialNumbers?: string[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  mobile: string;
  email: string;
  address: string;
  items: InvoiceItem[];
  additionalChargesDesc?: string;
  additionalCharges: number;
  gstPercent: number;
  grandTotal: number;
  date: string;
  status?: string;
  srNo?: string;
  serviceName?: string;
  vendorBusinessName?: string;
  soldBy?: string;
  orderId?: string;
  type?: string;
}

export interface PartnerCustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'file';
  options?: string[]; // for dropdown
  required: boolean;
}

export interface PartnerType {
  id: string;
  name: string; // e.g. "Drone", "Tractor"
  category_id?: string;
  category?: { name: string };
  description?: string;
  is_active?: boolean;
  customFields: PartnerCustomField[];
}

export interface PricingType {
  id: string;
  name: string; // e.g. "Per Acre", "Per Hour", "Per Liter"
  label: string; // e.g. "Number of Acres", "Number of Hours"
  is_active?: boolean;
}

export interface PartnerService {
  id: string;
  display_id?: string;
  category_id: string;
  category?: string;
  serviceName: string;
  name?: string; // from backend response
  pricingTypeId: string; // reference to PricingType
  pricingType?: { id: string; name: string; label: string }; // from backend response
  required_partner_type_id?: string;
  rate: number;
  price?: number; // from backend response

  admin_commission_rate?: number;
  image?: string | File;
  imageName?: string;
  customFields?: CustomField[]; // fields required during booking this service
  custom_fields?: CustomField[]; // from backend response
  status?: 'Active' | 'Inactive';
}

export interface Partner {
  id: string;
  display_id?: string;
  name: string;
  mobile: string;
  email: string;
  location: string; // Pincodes / coverage areas
  status: 'Active' | 'Inactive';
  password?: string;
  partnerTypeId: string; // reference to PartnerType
  customFieldValues: Record<string, any>; // key: custom field id, value: response
  services: string[]; // array of PartnerService IDs
  coverage_areas?: string[];
  address?: string;
}

export type PartnerBookingStatus =
  | 'Pending'
  | 'Accepted'
  | 'Assigned'
  | 'In Progress'
  | 'Awaiting Approval'
  | 'Completed'
  | 'Cancelled';

export interface PartnerBooking {
  id: string;
  displayId?: string;
  orderNumber?: string;
  userId: string;
  userName: string;
  userMobile: string;
  surveyNumber: string;
  district: string;
  mandal: string;
  village: string;
  pincode: string;
  fullAddress?: string;
  equipmentType: string;
  date: string;
  time: string;
  status: PartnerBookingStatus;
  partnerId?: string;
  partnerType?: string;
  pricingTypeId?: string;
  quantity?: number;
  totalAmount: number;
  startWorkPhotos?: string[];
  completeWorkPhotos?: string[];
  progressUpdates?: ProgressUpdate[];
  customFieldResponses?: Record<string, string>;
  paymentStatus?: 'Paid' | 'Pending';
  cancelledBy?: string;
  cancellationReason?: string;
  assignedPartner?: {
    id: string;
    display_id?: string;
    name: string;
    mobile: string;
    email?: string;
  };
}

export interface CustomerAddressItem {
  id: string;
  fullName: string;
  mobileNumber: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
}

export interface CustomerOrderSummary {
  id: string;
  order_number: string;
  total_amount: string | number;
  status: string;
  payment_status?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  display_id?: string;
  fullName: string;
  mobile: string;
  email?: string;
  fullAddress?: string;
  pincode?: string;
  stateName?: string;
  isMobileVerified?: boolean;
  status: 'Active' | 'Inactive';
  ordersCount?: number;
  totalSpent?: number;
  createdAt?: string;
  addresses?: CustomerAddressItem[];
  orders?: CustomerOrderSummary[];
}

export interface PaymentSummary {
  totalRevenue: number;
  totalPayouts: number;
  netBalance: number;
  pendingPayoutsCount: number;
  pendingPayoutAmount: number;
}

export type PaymentType = 'incoming' | 'outgoing';
export type PaymentStatus = 'completed' | 'pending' | 'failed';

export interface PaymentTransaction {
  id: string;
  date: string;
  type: PaymentType;
  referenceId: string;
  party: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  proof_image?: string | null;
  notes?: string;
}

export interface PendingVendorPayoutItem {
  id: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  vendorMobile?: string;
  bankDetails?: string;
  productName: string;
  qty: number;
  date: string;
  amount: number;
  adminCommission: number;
  netPayable: number;
  customerPaid: boolean;
  vendorPaid: boolean;
  paymentMethod: 'online' | 'cod';
}

export interface VendorLedgerOrder {
  id: string;
  orderNumber: string;
  productName: string;
  qty: number;
  date: string;
  amount: number;
  adminCommission: number;
  customerPaid: boolean;
}

export interface VendorLedgerItem {
  vendorId: string;
  vendorName: string;
  mobile: string;
  bankDetails?: string;
  unpaidCount: number;
  pendingPayoutCount: number;
  totalPendingCustomerPaid: number;
  totalPendingCustomerUnpaid: number;
  orders: VendorLedgerOrder[];
}


export interface DashboardStats {
  totalRevenue: number;
  revenueTrend: string;
  revenueGrowthPositive: boolean;
  activeUsers: number;
  usersTrend: string;
  usersGrowthPositive: boolean;
  totalSales: number;
  salesTrend: string;
  salesGrowthPositive: boolean;
}

export interface DashboardActivityItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_mobile?: string;
  total_amount: number;
  status: string;
  payment_status: string;
  createdAt: string;
}
