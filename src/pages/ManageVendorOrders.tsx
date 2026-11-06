import Loading from '../components/Loading';
import Pagination from '../components/Pagination';
import { useState, useEffect } from 'react';
import API from '../services/api';
import { MdShoppingCart, MdSearch } from 'react-icons/md';
import Swal from 'sweetalert2';
import type { Order, OrderStatus, OrderItem } from '../types';
import OrderTable from '../components/OrderTable';
import OrderModal from '../components/OrderModal';
import TrackOrderModal from '../components/TrackOrderModal';
import SplitOrderModal from '../components/SplitOrderModal';
import { mapApiOrderToOrder } from '../utils/orderMapper';
import './ManageOrders.css';



export default function ManageVendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await API.get('/admin/orders');
      const vendorOrdersFetched: any[] = [];
      
      response.data.forEach((o: any) => {
        const vendorItems = (o.items || []).filter((i: any) => i.vendor || i.vendor_id);
        
        if (vendorItems.length > 0) {
          // Group by vendor so each vendor sub-order has its own accurate items, total, and status
          const itemsByVendorMap = vendorItems.reduce((acc: any, item: any) => {
            const vKey = item.vendor_id || item.vendor?.id || item.vendor?.business_name || 'Vendor Product';
            if (!acc[vKey]) acc[vKey] = [];
            acc[vKey].push(item);
            return acc;
          }, {});

          Object.values(itemsByVendorMap).forEach((vItems: any) => {
            const itemWithTracking = vItems.find((i: any) => i.tracking_id);
            const vendorTotal = vItems.reduce((sum: number, i: any) => sum + ((parseFloat(i.price) || 0) * (parseInt(i.qty, 10) || 1)), 0);
            const vendorSubtotal = vItems.reduce((sum: number, i: any) => sum + (parseFloat(i.subtotal) || 0), 0);
            const vendorTax = vItems.reduce((sum: number, i: any) => sum + (parseFloat(i.tax_amount) || 0), 0);

            vendorOrdersFetched.push(mapApiOrderToOrder(
              o, 
              vItems, 
              parseFloat(vendorTotal.toFixed(2)), 
              (i: any) => i.vendor?.business_name || i.vendor?.full_name || 'Vendor Product',
              {
                transportName: itemWithTracking?.transport_name,
                trackingId: itemWithTracking?.tracking_id,
                trackUrl: itemWithTracking?.tracking_url
              },
              {
                subtotalAmount: parseFloat(vendorSubtotal.toFixed(2)),
                taxAmount: parseFloat(vendorTax.toFixed(2)),
                gstStateCode: o.gst_state_code
              }
            ));
          });
        }
      });
      
      setOrders(vendorOrdersFetched);
    } catch (error: any) {
      console.error('Failed to fetch orders', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to fetch vendor orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  const [activeTab, setActiveTab] = useState<string>('New');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [splittingItem, setSplittingItem] = useState<{ orderId: string; item: OrderItem } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const tabs: string[] = ['New', 'Accepted', 'Out for Delivery', 'Completed', 'Cancelled'];

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || 
      order.id.toLowerCase().includes(query) ||
      order.user.toLowerCase().includes(query) ||
      order.mobile.includes(query) ||
      order.email.toLowerCase().includes(query);
    const matchesTab = order.status === activeTab;
    return matchesTab && matchesSearch;
  });

  const vendorOrders = filteredOrders;

  const itemsPerPage = 10;
  const totalPages = Math.ceil(vendorOrders.length / itemsPerPage) || 1;
  const paginatedOrders = vendorOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleActionOrder = (orderId: string, action: 'Accept' | 'Reject' | 'Out for Delivery' | 'Complete' | 'MarkPaid', rowOrder?: Order) => {
    let actionText = '';
    let successText = '';
    let nextStatus: OrderStatus = 'New';

    const targetOrder = rowOrder || orders.find(o => o.id === orderId);
    const targetVendorId = targetOrder?.items[0]?.vendorId;

    if (action === 'Reject') {
      Swal.fire({
        title: 'Reject Vendor Order Item?',
        text: 'Please select a reason for rejecting this vendor item (this will queue a partial customer refund if paid):',
        input: 'select',
        inputOptions: {
          'Out of stock': 'Out of stock',
          'Damaged / Defective inventory': 'Damaged / Defective inventory',
          'Delivery location unserviceable': 'Delivery location unserviceable',
          'Pricing error': 'Pricing error',
          'Vendor requested cancellation': 'Vendor requested cancellation',
          'Other': 'Other reason'
        },
        inputPlaceholder: 'Select rejection reason',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Confirm Rejection',
        inputValidator: (value) => {
          if (!value) return 'Please select a reason for rejection!';
          return null;
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await API.put(`/admin/orders/${orderId}/status`, {
              status: 'CANCELLED',
              reason: result.value,
              vendorId: targetVendorId
            });
            setOrders(orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                items: o.items.map(item => (!targetVendorId || item.vendorId === targetVendorId) ? { ...item, status: 'Cancelled' } : item)
              };
            }));
            Swal.fire('Item Rejected', 'The vendor order item has been rejected and queued for refund if paid.', 'success');
          } catch (error: any) {
            console.error('Failed to update order status', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to update order status. Please try again.', 'error');
          }
        }
      });
      return;
    }

    if (action === 'Accept') {
      actionText = 'accept this order';
      successText = 'Order status updated to Accepted.';
      nextStatus = 'Accepted';
    } else if (action === 'Out for Delivery') {
      actionText = 'mark this order as Out for Delivery';
      successText = 'Order status updated to Out for Delivery.';
      nextStatus = 'Out for Delivery';
    } else if (action === 'Complete') {
      actionText = 'mark this order as Delivered';
      successText = 'Order status updated to Completed.';
      nextStatus = 'Completed';
    } else if (action === 'MarkPaid') {
      actionText = 'collect cash and mark this order as Paid';
      successText = 'Payment status updated to Paid.';
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionText}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          let payload = {};
          if (action === 'MarkPaid') {
            payload = { payment_status: 'PAID' };
          } else {
            const dbStatus = nextStatus === 'Accepted' ? 'ACCEPTED' :
                             nextStatus === 'Out for Delivery' ? 'OUT_FOR_DELIVERY' :
                             nextStatus === 'Completed' ? 'COMPLETED' : 'NEW';
            payload = { 
              status: dbStatus,
              vendorId: targetVendorId,
              target: 'vendor'
            };
          }
          await API.put(`/admin/orders/${orderId}/status`, payload);
          
          if (action === 'MarkPaid') {
            setOrders(orders.map(o => o.id === orderId ? { ...o, paymentStatus: 'Paid' } : o));
          } else {
            setOrders(orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                status: nextStatus,
                items: o.items.map(item => (!targetVendorId || item.vendorId === targetVendorId) ? { ...item, status: nextStatus } : item)
              };
            }));
          }
          Swal.fire('Updated!', successText, 'success');
        } catch (error: any) {
          console.error('Failed to update order status', error);
          Swal.fire('Error', error?.response?.data?.message || 'Failed to update order status. Please try again.', 'error');
        }
      }
    });
  };

  const handleSplitOrder = async (orderId: string, originalItemId: string, newVendorName: string | null, transferQty: number) => {
    try {
      const payload = {
        newVendorId: newVendorName,
        qtyToTransfer: transferQty
      };
      await API.post(`/admin/orders/${orderId}/items/${originalItemId}/split`, payload);
      setSplittingItem(null);
      fetchOrders();
      Swal.fire('Split Successful', 'Order item split assigned', 'success');
    } catch (error: any) {
      console.error('Failed to split order', error);
      Swal.fire('Error', error?.response?.data?.message || 'Failed to split order', 'error');
    }
  };

  return (
    <div className="page-content">
      <div className="manage-orders-header">
        <MdShoppingCart size={28} color="#6b7280" />
        <h1>Product Orders</h1>
      </div>

      <div className="orders-toolbar">
        <div className="orders-tabs-container">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`order-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'New' ? 'New Orders' : tab}
            </button>
          ))}
        </div>
        <div className="orders-search-container">
          <MdSearch className="orders-search-icon" size={20} />
          <input 
            type="text" 
            className="orders-search-input" 
            placeholder="Search by ID, name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <OrderTable 
            orders={paginatedOrders} 
            currentTab={activeTab} 
            onViewOrder={setSelectedOrder} 
            onActionOrder={handleActionOrder} 
            onTrackOrder={setTrackingOrder}
            showVendor={true}
            hideActions={false}
            hideAcceptReject={true}
            readOnlyStatus={true}
          />

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </>
      )}

      {selectedOrder && (
        <OrderModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onSplitClick={(item) => setSplittingItem({ orderId: selectedOrder.id, item })}
        />
      )}

      {splittingItem && (
        <SplitOrderModal
          orderId={splittingItem.orderId}
          item={splittingItem.item}
          onClose={() => setSplittingItem(null)}
          onSplit={handleSplitOrder}
        />
      )}

      {trackingOrder && (
        <TrackOrderModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          onSubmit={async (transportName, trackingId, trackUrl) => {
            try {
              const targetVendorId = trackingOrder.items[0]?.vendorId;
              await API.put(`/admin/orders/${trackingOrder.id}/tracking`, { transportName, trackingId, trackUrl: trackUrl, vendorId: targetVendorId });
              setOrders(orders.map(o => {
                if (o.id !== trackingOrder.id) return o;
                return {
                  ...o,
                  items: o.items.map(item => (!targetVendorId || item.vendorId === targetVendorId) ? { ...item, transportName, trackingId, trackUrl } : item),
                  transportName,
                  trackingId,
                  trackUrl
                };
              }));
              Swal.fire('Saved!', `Tracking info saved for order ${trackingOrder.id}.`, 'success');
              setTrackingOrder(null);
            } catch (error: any) {
              console.error('Failed to save tracking', error);
              Swal.fire('Error', error?.response?.data?.message || 'Failed to save tracking information.', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

