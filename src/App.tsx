import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Package,
  Truck,
  Printer,
  BarChart3,
  Users,
  Plus,
  Search,
  Copy,
  Check,
  Upload,
  Eye,
  X,
  LogOut,
  ShieldCheck,
  UserCheck,
  Trash2,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  Image as ImageIcon,
  Edit3,
  CheckSquare,
  SlidersHorizontal
} from 'lucide-react';

// ============================================================================
// 1. CẤU HÌNH FIREBASE FIRESTORE & FALLBACK AN TOÀN
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAusVgOjx6G5-VptO47ED3hoVZKCBJrkIA",
  authDomain: "ordertaobao-pro.firebaseapp.com",
  projectId: "ordertaobao-pro",
  storageBucket: "ordertaobao-pro.firebasestorage.app",
  messagingSenderId: "858203900002",
  appId: "1:858203900002:web:06a46138d005b63eeae93b",
  measurementId: "G-1EH1CW30DY"
};

let db = null;
let STATE_DOC_REF = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  STATE_DOC_REF = doc(db, 'ordertaobao_app', 'main_state_2026');
} catch (err) {
  console.warn('Firebase init fallback to local state:', err);
}

// ============================================================================
// 2. BỘ MÃ HÓA MÃ VẠCH CHUẨN CÔNG NGHIỆP CODE 128B (MÁY QUÉT BƯU TÁ ĐỌC 100%)
// ============================================================================
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

const encodeCode128B = (text) => {
  const cleanText = String(text || 'SPXVN06829104').replace(/[^\x20-\x7E]/g, '');
  const codes = [104]; // Start Code B
  let checksum = 104;
  for (let i = 0; i < cleanText.length; i++) {
    const val = cleanText.charCodeAt(i) - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }
  codes.push(checksum % 103); // Check digit mod 103
  codes.push(106); // Stop pattern

  return codes.map((c) => CODE128_PATTERNS[c] || '').join('');
};

const BarcodeCode128 = ({ value = 'SPXVN06829104' }) => {
  const { modules, totalWidth } = useMemo(() => {
    const pattern = encodeCode128B(value);
    const rects = [];
    let x = 14; // Quiet zone trái
    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i], 10) * 1.5;
      if (i % 2 === 0) {
        rects.push({ x, w });
      }
      x += w;
    }
    return { modules: rects, totalWidth: x + 14 }; // Quiet zone phải
  }, [value]);

  return (
    <div className="flex flex-col items-center bg-white p-2 border border-gray-300 rounded-lg">
      <svg
        viewBox={`0 0 ${totalWidth} 52`}
        className="w-full max-w-[230px] h-12"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width={totalWidth} height="52" fill="#FFFFFF" />
        {modules.map((m, idx) => (
          <rect key={idx} x={m.x} y="2" width={m.w} height="48" fill="#000000" />
        ))}
      </svg>
      <span className="text-[11px] font-mono font-bold tracking-widest text-gray-900 mt-1 notranslate" translate="no">
        {value}
      </span>
    </div>
  );
};

// ============================================================================
// 3. TIỆN ÍCH XỬ LÝ ẢNH & ĐỊNH DẠNG TIỀN TỆ
// ============================================================================
const compressImageToBase64 = (file, maxWidth = 650, quality = 0.65) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const formatVND = (num) => {
  const n = Number(num) || 0;
  return n.toLocaleString('vi-VN') + ' ₫';
};

// 6 trạng thái cốt lõi + 2 trạng thái điều chỉnh/hủy
const ORDER_STATUSES = [
  { id: 'pending', label: 'Chờ đặt hàng', color: 'bg-gray-100 text-gray-700 border-gray-300', group: 'active' },
  { id: 'ordered_cn', label: 'Đã đặt hàng', color: 'bg-blue-100 text-blue-700 border-blue-300', group: 'active' },
  { id: 'shipping_cn', label: 'Xuất kho', color: 'bg-orange-100 text-orange-700 border-orange-300', group: 'active' },
  { id: 'arrived_vn', label: 'Có sẵn', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', group: 'active' },
  { id: 'keep', label: 'Keep', color: 'bg-purple-100 text-purple-700 border-purple-300', group: 'adjust' },
  { id: 'lost_reorder', label: 'Thất lạc / Đặt lại', color: 'bg-amber-100 text-amber-800 border-amber-300', group: 'adjust' },
  { id: 'shipped_done', label: 'Đã trả hàng', color: 'bg-teal-100 text-teal-700 border-teal-300', group: 'done' },
  { id: 'cancelled', label: 'Hủy / Hoàn', color: 'bg-red-100 text-red-700 border-red-300', group: 'done' }
];

const INITIAL_DATA = {
  exchangeRate: 3550,
  ctvs: [
    {
      id: 'ctv1',
      username: 'lananh',
      password: '123',
      name: 'Lan Anh',
      bankName: 'MB Bank',
      bankAccount: '0987654321',
      bankHolder: 'NGUYEN THI LAN ANH',
      active: true
    }
  ],
  orders: [
    {
      id: 'ord_sample_1',
      code: '2601',
      createdAt: new Date().toISOString().slice(0, 10),
      ctvId: 'ctv1',
      ctvName: 'Lan Anh',
      customerName: 'Trần Minh Thư',
      customerPhone: '0912345678',
      customerAddress: '128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
      productName: 'Set Áo Khoác Tweed Tiểu Thư Phối Nơ',
      sizeColor: 'Kem - Size S',
      quantity: 1,
      salePriceVnd: 350000,
      depositVnd: 150000,
      codVnd: 200000,
      commissionVnd: 35000,
      commissionPaid: false,
      commissionBillImage: '',
      costCny: 58,
      cnTracking: 'SF1682940123CN',
      batchId: '',
      vnShippingCostVnd: 25000,
      spxTracking: '',
      shippingPayer: 'customer',
      shopShipFeeVnd: 0,
      status: 'arrived_vn',
      note: 'Khách dặn kiểm tra kỹ cúc áo trước khi gửi',
      productImages: [],
      depositBillImage: ''
    },
    {
      id: 'ord_sample_2',
      code: '2602',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
      ctvId: 'ctv1',
      ctvName: 'Lan Anh',
      customerName: 'Trần Minh Thư',
      customerPhone: '0912345678',
      customerAddress: '128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
      productName: 'Chân Váy Xếp Ly Len Tăm',
      sizeColor: 'Đen - Size M',
      quantity: 1,
      salePriceVnd: 280000,
      depositVnd: 100000,
      codVnd: 180000,
      commissionVnd: 25000,
      commissionPaid: true,
      commissionBillImage: '',
      costCny: 42,
      cnTracking: 'YT7482910099CN',
      batchId: '',
      vnShippingCostVnd: 20000,
      spxTracking: 'SPXVN06829104',
      shippingPayer: 'customer',
      shopShipFeeVnd: 0,
      status: 'shipped_done',
      note: '',
      productImages: [],
      depositBillImage: ''
    }
  ],
  taobaoOrders: [],
  batches: [],
  shipments: []
};

// ============================================================================
// 4. COMPONENT CHÍNH
// ============================================================================
export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting');
  const [appData, setAppData] = useState(INITIAL_DATA);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  // Trạng thái đăng nhập
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('otb_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Trạng thái tra cứu đơn hàng dành cho khách
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOrderCode, setGuestOrderCode] = useState('');
  const [guestLookupError, setGuestLookupError] = useState('');
  const [guestLookupResult, setGuestLookupResult] = useState(null);

  // Điều hướng Tab
  const [activeTab, setActiveTab] = useState('orders');
  const [orderSubTab, setOrderSubTab] = useState('active'); // 'active' | 'adjust' | 'done'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCtv, setFilterCtv] = useState('all');

  // Modals
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedText, setCopiedText] = useState('');
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [editOrderModal, setEditOrderModal] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteCtvTarget, setDeleteCtvTarget] = useState(null);

  // State Form Tab 1 (Admin tạo đơn Taobao)
  const [taobaoForm, setTaobaoForm] = useState({
    cnTracking: '',
    productName: '',
    costCny: '',
    selectedDomesticIds: []
  });

  // State Form Tab 1 (CTV lên đơn khách hàng)
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    productName: '',
    sizeColor: '',
    quantity: 1,
    salePriceVnd: '',
    depositVnd: '',
    commissionVnd: '',
    note: '',
    productImages: [],
    depositBillImage: ''
  });

  // State Form Tab 2 (Đợt xuất kho, Check-out kiểm đếm & Xem chi tiết đợt kho)
  const [batchForm, setBatchForm] = useState({
    batchName: '',
    totalKg: '',
    pricePerKg: '25000',
    localShipVnd: '0',
    selectedCnTrackings: []
  });
  const [checkoutModalBatch, setCheckoutModalBatch] = useState(null);
  const [verifiedTrackings, setVerifiedTrackings] = useState([]);
  const [viewBatchModal, setViewBatchModal] = useState(null);

  // State Form Tab 3 (Tạo đơn trả hàng & In tem A6)
  const [selectedPrintOrderId, setSelectedPrintOrderId] = useState('');
  const [vnDomesticTrackingInput, setVnDomesticTrackingInput] = useState('');
  const [customCodVnd, setCustomCodVnd] = useState('');
  const [shipFeeInput, setShipFeeInput] = useState('0');
  const [shippingPayer, setShippingPayer] = useState('customer');
  const [activeLabelPreview, setActiveLabelPreview] = useState(null);

  // State Form Tab 4 (Quản lý CTV & Thanh toán hoa hồng)
  const [newCtvForm, setNewCtvForm] = useState({
    name: '',
    username: '',
    password: ''
  });
  const [payoutModal, setPayoutModal] = useState(null);
  const [paidInputAmount, setPaidInputAmount] = useState('');
  const [payoutBillBase64, setPayoutBillBase64] = useState('');

  // State Form Tab 5 (Báo cáo tài chính & Thuế)
  const [taxMonthFilter, setTaxMonthFilter] = useState('all');

  // State Form CTV (Cập nhật ngân hàng nhận lương)
  const [bankForm, setBankForm] = useState({
    bankName: '',
    bankHolder: '',
    bankAccount: ''
  });

  useEffect(() => {
    if (currentUser?.role === 'ctv') {
      const me = appData.ctvs.find((c) => c.id === currentUser.id);
      if (me) {
        setBankForm({
          bankName: me.bankName || '',
          bankHolder: me.bankHolder || '',
          bankAccount: me.bankAccount || ''
        });
      }
    }
  }, [currentUser, appData.ctvs]);

  // ==========================================================================
  // ĐỒNG BỘ REALTIME FIREBASE FIRESTORE (CÓ FALLBACK AN TOÀN)
  // ==========================================================================
  useEffect(() => {
    if (!STATE_DOC_REF) {
      setDbReady(true);
      setSyncStatus('local');
      return;
    }

    const unsubscribe = onSnapshot(
      STATE_DOC_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAppData({
            exchangeRate: data.exchangeRate || 3550,
            ctvs: Array.isArray(data.ctvs) ? data.ctvs : INITIAL_DATA.ctvs,
            orders: Array.isArray(data.orders) ? data.orders : [],
            taobaoOrders: Array.isArray(data.taobaoOrders) ? data.taobaoOrders : [],
            batches: Array.isArray(data.batches) ? data.batches : [],
            shipments: Array.isArray(data.shipments) ? data.shipments : []
          });
        } else {
          setDoc(STATE_DOC_REF, INITIAL_DATA).catch(() => {});
        }
        setDbReady(true);
        setSyncStatus('synced');
      },
      (error) => {
        console.warn('Firestore listener fallback:', error);
        setSyncStatus('local');
        setDbReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateAppData = async (nextData) => {
    setAppData(nextData);
    if (!STATE_DOC_REF) return;
    setSyncStatus('saving');
    try {
      await setDoc(STATE_DOC_REF, nextData);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Save cloud fallback:', err);
      setSyncStatus('local');
    }
  };

  const handleCopy = (text, label = '') => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedText(label || text);
    setTimeout(() => setCopiedText(''), 1800);
  };

  // ==========================================================================
  // XỬ LÝ ĐĂNG NHẬP & TRA CỨU KHÁCH HÀNG
  // ==========================================================================
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const u = loginUser.trim();
    const p = loginPass.trim();

    if (u === 'admin' && p === 'adminrich') {
      const adminObj = { role: 'admin', username: 'admin', name: 'Admin (Serenade Order)' };
      setCurrentUser(adminObj);
      sessionStorage.setItem('otb_session_user', JSON.stringify(adminObj));
      setActiveTab('orders');
      return;
    }

    const foundCtv = appData.ctvs.find(
      (c) => c.username.toLowerCase() === u.toLowerCase() && c.password === p
    );
    if (foundCtv) {
      if (foundCtv.active === false) {
        setLoginError('Tài khoản CTV này đã bị khóa.');
        return;
      }
      const ctvObj = {
        role: 'ctv',
        id: foundCtv.id,
        username: foundCtv.username,
        name: foundCtv.name
      };
      setCurrentUser(ctvObj);
      sessionStorage.setItem('otb_session_user', JSON.stringify(ctvObj));
      setActiveTab('orders');
      return;
    }

    setLoginError('Sai tên đăng nhập hoặc mật khẩu!');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('otb_session_user');
    setLoginUser('');
    setLoginPass('');
  };

  // Xử lý tra cứu đơn hàng dành cho khách (yêu cầu khớp SĐT và Mã đơn)
  const handleGuestLookup = (e) => {
    e.preventDefault();
    setGuestLookupError('');
    setGuestLookupResult(null);

    const cleanPhone = guestPhone.replace(/\s+/g, '').trim();
    const cleanCode = guestOrderCode.replace(/^#/, '').trim();

    if (!cleanPhone || !cleanCode) {
      setGuestLookupError('Vui lòng nhập đầy đủ Số điện thoại và Mã đơn hàng.');
      return;
    }

    const phoneOrders = appData.orders.filter(
      (o) => String(o.customerPhone || '').replace(/\s+/g, '').trim() === cleanPhone
    );

    const matchedOrder = phoneOrders.find(
      (o) => String(o.code || '').trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (!matchedOrder) {
      setGuestLookupError(
        'Không tìm thấy đơn hàng khớp với Số điện thoại và Mã đơn này. Vui lòng kiểm tra lại!'
      );
      return;
    }

    const completedHistory = phoneOrders.filter(
      (o) => o.status === 'shipped_done' && o.id !== matchedOrder.id
    );

    setGuestLookupResult({
      matchedOrder,
      completedHistory
    });
  };

  // Sinh mã đơn nội địa tự động (#2601, #2602...)
  const nextOrderCode = useMemo(() => {
    const prefix = '26';
    const existingNums = appData.orders
      .map((o) => {
        const s = String(o.code || '');
        return s.startsWith(prefix) ? parseInt(s.slice(2), 10) || 0 : 0;
      })
      .filter((n) => n > 0);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum < 10 ? '0' + nextNum : nextNum}`;
  }, [appData.orders]);

  // ==========================================================================
  // CÁC HÀM NGHIỆP VỤ QUẢN LÝ ĐƠN HÀNG, ĐỢT KHO, TEM A6, CTV & THUẾ
  // ==========================================================================
  const computedCostVnd = Math.round(
    (Number(taobaoForm.costCny) || 0) * (Number(appData.exchangeRate) || 3550)
  );

  const computedRemainingCod = Math.max(
    0,
    (Number(newOrder.salePriceVnd) || 0) - (Number(newOrder.depositVnd) || 0)
  );

  const toggleDomesticOrderForTaobao = (orderId) => {
    setTaobaoForm((prev) => {
      const exists = prev.selectedDomesticIds.includes(orderId);
      return {
        ...prev,
        selectedDomesticIds: exists
          ? prev.selectedDomesticIds.filter((id) => id !== orderId)
          : [...prev.selectedDomesticIds, orderId]
      };
    });
  };

  const handleCreateOrderAdmin = (e) => {
    e.preventDefault();
    const tracking = taobaoForm.cnTracking.trim().toUpperCase();
    const cny = Number(taobaoForm.costCny) || 0;
    const selectedIds = taobaoForm.selectedDomesticIds;

    if (selectedIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mã đơn nội địa của CTV!');
      return;
    }

    const perOrderCny = Number((cny / selectedIds.length).toFixed(2));
    const updatedOrders = appData.orders.map((o) =>
      selectedIds.includes(o.id)
        ? {
            ...o,
            cnTracking: tracking || o.cnTracking,
            costCny: perOrderCny,
            status: o.status === 'pending' ? 'ordered_cn' : o.status
          }
        : o
    );

    const newTbEntry = {
      id: 'tb_' + Date.now(),
      cnTracking: tracking,
      productName: taobaoForm.productName.trim(),
      costCny: cny,
      domesticIds: selectedIds,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    updateAppData({
      ...appData,
      orders: updatedOrders,
      taobaoOrders: [newTbEntry, ...appData.taobaoOrders]
    });

    setTaobaoForm({
      cnTracking: '',
      productName: '',
      costCny: '',
      selectedDomesticIds: []
    });
    showToast(`Đã lưu đơn Taobao & cập nhật ${selectedIds.length} đơn cho CTV!`);
  };

  const handleMultiProductImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const compressedList = await Promise.all(files.map((f) => compressImageToBase64(f)));
    setNewOrder((prev) => ({
      ...prev,
      productImages: [...(prev.productImages || []), ...compressedList]
    }));
  };

  const handleUploadDepositBill = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImageToBase64(file);
    setNewOrder((prev) => ({ ...prev, depositBillImage: base64 }));
  };

  const handleCreateOrderCTV = (e) => {
    e.preventDefault();
    const sale = Number(newOrder.salePriceVnd) || 0;
    const deposit = Number(newOrder.depositVnd) || 0;
    const comm = Number(newOrder.commissionVnd) || 0;

    const created = {
      id: 'ord_' + Date.now(),
      code: nextOrderCode,
      createdAt: new Date().toISOString().slice(0, 10),
      ctvId: currentUser.id,
      ctvName: currentUser.name,
      customerName: newOrder.customerName.trim(),
      customerPhone: newOrder.customerPhone.trim(),
      customerAddress: newOrder.customerAddress.trim(),
      productName: newOrder.productName.trim(),
      sizeColor: newOrder.sizeColor.trim(),
      quantity: Number(newOrder.quantity) || 1,
      salePriceVnd: sale,
      depositVnd: deposit,
      codVnd: Math.max(0, sale - deposit),
      commissionVnd: comm,
      commissionPaid: false,
      commissionBillImage: '',
      costCny: 0,
      cnTracking: '',
      batchId: '',
      vnShippingCostVnd: 0,
      spxTracking: '',
      shippingPayer: 'customer',
      shopShipFeeVnd: 0,
      status: 'pending',
      note: newOrder.note.trim(),
      productImages: newOrder.productImages || [],
      depositBillImage: newOrder.depositBillImage || ''
    };

    updateAppData({
      ...appData,
      orders: [created, ...appData.orders]
    });

    setNewOrder({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      productName: '',
      sizeColor: '',
      quantity: 1,
      salePriceVnd: '',
      depositVnd: '',
      commissionVnd: '',
      note: '',
      productImages: [],
      depositBillImage: ''
    });
    showToast(`Đã tạo thành công đơn hàng #${created.code}!`);
  };

  const updateOrderField = (orderId, patch) => {
    const updatedOrders = appData.orders.map((o) => {
      if (o.id !== orderId) return o;
      const merged = { ...o, ...patch };
      if (patch.salePriceVnd !== undefined || patch.depositVnd !== undefined) {
        merged.codVnd = Math.max(
          0,
          (Number(merged.salePriceVnd) || 0) - (Number(merged.depositVnd) || 0)
        );
      }
      return merged;
    });
    updateAppData({ ...appData, orders: updatedOrders });
  };

  const confirmDeleteOrder = () => {
    if (!deleteConfirmId) return;
    updateAppData({
      ...appData,
      orders: appData.orders.filter((o) => o.id !== deleteConfirmId)
    });
    setDeleteConfirmId(null);
    showToast('Đã xóa đơn hàng!');
  };

  // Lọc đơn hàng theo quyền & sub-tab
  const roleOrders = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return appData.orders;
    return appData.orders.filter((o) => o.ctvId === currentUser.id);
  }, [appData.orders, currentUser]);

  const activeCount = useMemo(
    () =>
      roleOrders.filter((o) =>
        ['pending', 'ordered_cn', 'shipping_cn', 'arrived_vn'].includes(o.status)
      ).length,
    [roleOrders]
  );

  const adjustCount = useMemo(
    () => roleOrders.filter((o) => ['keep', 'lost_reorder'].includes(o.status)).length,
    [roleOrders]
  );

  const doneCount = useMemo(
    () => roleOrders.filter((o) => ['shipped_done', 'cancelled'].includes(o.status)).length,
    [roleOrders]
  );

  const visibleOrders = useMemo(() => {
    return roleOrders.filter((o) => {
      const stObj = ORDER_STATUSES.find((s) => s.id === o.status) || ORDER_STATUSES[0];
      if (stObj.group !== orderSubTab) return false;
      if (currentUser?.role === 'admin' && filterCtv !== 'all' && o.ctvId !== filterCtv) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${o.code} ${o.customerName} ${o.customerPhone} ${o.productName} ${o.cnTracking} ${o.spxTracking}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roleOrders, orderSubTab, currentUser, filterCtv, searchQuery]);

  // Đợt xuất kho & Check-out kiểm đếm
  const availableCnTrackings = useMemo(() => {
    const map = {};
    appData.orders.forEach((o) => {
      if (
        o.cnTracking &&
        ['pending', 'ordered_cn'].includes(o.status)
      ) {
        if (!map[o.cnTracking]) {
          map[o.cnTracking] = { cnTracking: o.cnTracking, orderCodes: [] };
        }
        map[o.cnTracking].orderCodes.push(o.code);
      }
    });
    return Object.values(map);
  }, [appData.orders]);

  const toggleCnTrackingForBatch = (trk) => {
    setBatchForm((prev) => {
      const exists = prev.selectedCnTrackings.includes(trk);
      return {
        ...prev,
        selectedCnTrackings: exists
          ? prev.selectedCnTrackings.filter((t) => t !== trk)
          : [...prev.selectedCnTrackings, trk]
      };
    });
  };

  const handleCreateBatch = (e) => {
    e.preventDefault();
    const trks = batchForm.selectedCnTrackings;
    if (trks.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 MVĐ Taobao trong đợt kho!');
      return;
    }

    const kg = Number(batchForm.totalKg) || 0;
    const priceKg = Number(batchForm.pricePerKg) || 0;
    const localShip = Number(batchForm.localShipVnd) || 0;
    const totalFee = Math.round(kg * priceKg + localShip);

    const affectedOrders = appData.orders.filter((o) => trks.includes(o.cnTracking));
    const perOrderFee =
      affectedOrders.length > 0 ? Math.round(totalFee / affectedOrders.length) : 0;

    const batchId = 'batch_' + Date.now();
    const newBatch = {
      id: batchId,
      name: batchForm.batchName.trim() || `Đợt kho ${new Date().toLocaleDateString('vi-VN')}`,
      createdAt: new Date().toISOString().slice(0, 10),
      totalKg: kg,
      pricePerKg: priceKg,
      localShipVnd: localShip,
      totalFeeVnd: totalFee,
      cnTrackings: trks,
      orderIds: affectedOrders.map((o) => o.id),
      checkedOut: false
    };

    const updatedOrders = appData.orders.map((o) =>
      trks.includes(o.cnTracking)
        ? {
            ...o,
            batchId,
            vnShippingCostVnd: perOrderFee,
            status: 'shipping_cn'
          }
        : o
    );

    updateAppData({
      ...appData,
      batches: [newBatch, ...appData.batches],
      orders: updatedOrders
    });

    setBatchForm({
      batchName: '',
      totalKg: '',
      pricePerKg: '25000',
      localShipVnd: '0',
      selectedCnTrackings: []
    });
    showToast(`Đã tạo đợt kho & chia đều ${formatVND(perOrderFee)}/đơn!`);
  };

  const openCheckoutModal = (batch) => {
    setCheckoutModalBatch(batch);
    setVerifiedTrackings(batch.cnTrackings || []);
  };

  const handleConfirmBatchCheckout = () => {
    if (!checkoutModalBatch) return;
    const updatedOrders = appData.orders.map((o) =>
      verifiedTrackings.includes(o.cnTracking) && o.status === 'shipping_cn'
        ? { ...o, status: 'arrived_vn' }
        : o
    );
    const updatedBatches = appData.batches.map((b) =>
      b.id === checkoutModalBatch.id ? { ...b, checkedOut: true, verifiedTrackings } : b
    );
    updateAppData({
      ...appData,
      orders: updatedOrders,
      batches: updatedBatches
    });
    setCheckoutModalBatch(null);
    showToast('Đã xác nhận kiểm đếm & cập nhật hàng Có sẵn cho CTV!');
  };

  // Tạo đơn trả hàng & In tem A6
  const readyToShipOrders = useMemo(() => {
    return appData.orders.filter((o) => ['arrived_vn', 'keep'].includes(o.status));
  }, [appData.orders]);

  const calculatedPrintCod = useMemo(() => {
    const base = Number(customCodVnd) || 0;
    const fee = Number(shipFeeInput) || 0;
    return shippingPayer === 'customer' ? base + fee : Math.max(0, base - fee);
  }, [customCodVnd, shipFeeInput, shippingPayer]);

  const handleGenerateA6Label = (e) => {
    e.preventDefault();
    const target = appData.orders.find((o) => o.id === selectedPrintOrderId);
    if (!target) {
      showToast('Vui lòng chọn đơn hàng cần trả!');
      return;
    }

    const spxCode =
      vnDomesticTrackingInput.trim().toUpperCase() ||
      `SPXVN06${Math.floor(100000 + Math.random() * 900000)}`;
    const shipFee = Number(shipFeeInput) || 0;

    setActiveLabelPreview({
      spxCode,
      receiverName: target.customerName,
      receiverPhone: target.customerPhone,
      receiverAddress: target.customerAddress || 'Nhận tại cửa hàng / Địa chỉ đã xác nhận',
      itemsSummary: `#${target.code} - ${target.productName}${target.sizeColor ? ` (${target.sizeColor})` : ''} x${target.quantity}`,
      note: target.note,
      codAmount: calculatedPrintCod,
      shipFee,
      shippingPayer
    });

    const updatedOrders = appData.orders.map((o) =>
      o.id === target.id
        ? {
            ...o,
            spxTracking: spxCode,
            shippingPayer,
            shopShipFeeVnd: shippingPayer === 'shop' ? shipFee : 0,
            status: 'shipped_done'
          }
        : o
    );

    updateAppData({
      ...appData,
      orders: updatedOrders
    });
    showToast(`Đã tạo phiếu vận đơn A6 (${spxCode}) & chuyển đơn sang Đã trả hàng!`);
  };

  // Quản lý CTV & Xóa tài khoản CTV
  const handleCreateCtv = (e) => {
    e.preventDefault();
    const uname = newCtvForm.username.trim().toLowerCase();
    if (!uname || !newCtvForm.name.trim() || !newCtvForm.password.trim()) return;

    if (appData.ctvs.some((c) => c.username.toLowerCase() === uname)) {
      showToast('Tên đăng nhập CTV đã tồn tại!');
      return;
    }

    const created = {
      id: 'ctv_' + Date.now(),
      name: newCtvForm.name.trim(),
      username: uname,
      password: newCtvForm.password.trim(),
      bankName: '',
      bankAccount: '',
      bankHolder: '',
      active: true
    };

    updateAppData({
      ...appData,
      ctvs: [...appData.ctvs, created]
    });

    setNewCtvForm({ name: '', username: '', password: '' });
    showToast(`Đã tạo tài khoản CTV ${created.name}!`);
  };

  const confirmDeleteCtv = () => {
    if (!deleteCtvTarget) return;
    const updatedCtvs = appData.ctvs.filter((c) => c.id !== deleteCtvTarget.id);
    updateAppData({
      ...appData,
      ctvs: updatedCtvs
    });
    showToast(`Đã xóa tài khoản CTV ${deleteCtvTarget.name}!`);
    setDeleteCtvTarget(null);
  };

  const handleUploadPayoutBill = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImageToBase64(file);
    setPayoutBillBase64(base64);
  };

  const confirmCommissionPayout = () => {
    if (!payoutModal) return;
    const { orderIds } = payoutModal;
    const updatedOrders = appData.orders.map((o) =>
      orderIds.includes(o.id)
        ? {
            ...o,
            commissionPaid: true,
            commissionBillImage: payoutBillBase64 || o.commissionBillImage
          }
        : o
    );
    updateAppData({ ...appData, orders: updatedOrders });
    setPayoutModal(null);
    setPayoutBillBase64('');
    showToast('Đã xác nhận thanh toán hoa hồng & gửi bill cho CTV!');
  };

  const handleSaveCtvBank = (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'ctv') return;
    const updatedCtvs = appData.ctvs.map((c) =>
      c.id === currentUser.id
        ? {
            ...c,
            bankName: bankForm.bankName.trim(),
            bankHolder: bankForm.bankHolder.trim().toUpperCase(),
            bankAccount: bankForm.bankAccount.trim()
          }
        : c
    );
    updateAppData({ ...appData, ctvs: updatedCtvs });
    showToast('Đã lưu thông tin tài khoản ngân hàng!');
  };

  // Báo cáo tài chính & Kê khai thuế
  const validFinancialOrders = useMemo(() => {
    return appData.orders.filter((o) => {
      if (o.status === 'cancelled') return false;
      if (taxMonthFilter !== 'all' && !String(o.createdAt || '').startsWith(taxMonthFilter)) {
        return false;
      }
      return true;
    });
  }, [appData.orders, taxMonthFilter]);

  const financialSummary = useMemo(() => {
    const rate = Number(appData.exchangeRate) || 3550;
    let totalRevenue = 0;
    let totalCost = 0;

    validFinancialOrders.forEach((o) => {
      const rev = Number(o.salePriceVnd) || 0;
      const goodsCost = Math.round((Number(o.costCny) || 0) * rate);
      const batchShip = Number(o.vnShippingCostVnd) || 0;
      const shopShip = Number(o.shopShipFeeVnd) || 0;
      totalRevenue += rev;
      totalCost += goodsCost + batchShip + shopShip;
    });

    const tax15 = Math.round(totalRevenue * 0.015);
    const netProfit = totalRevenue - totalCost - tax15;
    return { totalRevenue, totalCost, tax15, netProfit };
  }, [validFinancialOrders, appData.exchangeRate]);

  const handleExportTaxCSV = () => {
    const rate = Number(appData.exchangeRate) || 3550;
    const headers = [
      'Ma Don',
      'Ngay',
      'Khach Hang',
      'San Pham',
      'Doanh Thu (VND)',
      'Gia Von Hang + Kho + Ship (VND)',
      'Thue Khoan 1.5% (VND)',
      'Lai Thuc Te (VND)'
    ];
    const rows = validFinancialOrders.map((o) => {
      const rev = Number(o.salePriceVnd) || 0;
      const cost =
        Math.round((Number(o.costCny) || 0) * rate) +
        (Number(o.vnShippingCostVnd) || 0) +
        (Number(o.shopShipFeeVnd) || 0);
      const tax = Math.round(rev * 0.015);
      const profit = rev - cost - tax;
      return [
        o.code,
        o.createdAt,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        `"${(o.productName || '').replace(/"/g, '""')}"`,
        rev,
        cost,
        tax,
        profit
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCaoThue_SerenadeOrder_${taxMonthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file Excel kê khai thuế (.CSV)!');
  };

  // ==========================================================================
  // MÀN HÌNH ĐĂNG NHẬP & TRA CỨU ĐƠN HÀNG DÀNH CHO KHÁCH
  // ==========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center p-4 space-y-5">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-orange-100 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight notranslate" translate="no">
              ordertaobao.pro
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Hệ thống quản lý đặt hàng, vận đơn & đối soát tập trung
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Nhập tên tài khoản..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none notranslate"
                translate="no"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Đăng nhập hệ thống
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Đồng bộ đám mây: {dbReady ? 'Sẵn sàng' : 'Đang kết nối...'}</span>
            <span className="notranslate" translate="no">© 2026 Serenade Order</span>
          </div>
        </div>

        {/* KHU VỰC DÀNH CHO KHÁCH: TRA CỨU ĐƠN HÀNG */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-orange-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">
                Dành cho khách: Tra cứu đơn hàng
              </h2>
              <p className="text-[11px] text-gray-500">
                Nhập SĐT và Mã đơn hàng (VD: 2601, 2602...) để kiểm tra hành trình
              </p>
            </div>
          </div>

          <form onSubmit={handleGuestLookup} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Mã đơn hàng *
                </label>
                <input
                  type="text"
                  required
                  value={guestOrderCode}
                  onChange={(e) => setGuestOrderCode(e.target.value)}
                  placeholder="VD: 2601"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 outline-none notranslate"
                  translate="no"
                />
              </div>
            </div>

            {guestLookupError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{guestLookupError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> Tra Cứu Đơn Hàng
            </button>
          </form>

          {/* KẾT QUẢ TRA CỨU ĐƠN HÀNG */}
          {guestLookupResult && (() => {
            const { matchedOrder, completedHistory } = guestLookupResult;
            const statusObj =
              ORDER_STATUSES.find((s) => s.id === matchedOrder.status) || ORDER_STATUSES[0];

            return (
              <div className="pt-3 border-t border-gray-200 space-y-4">
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-900 text-white font-mono font-bold notranslate" translate="no">
                      #{matchedOrder.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusObj.color}`}>
                      {statusObj.label}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-gray-900 notranslate" translate="no">
                    {matchedOrder.productName}{' '}
                    {matchedOrder.sizeColor && (
                      <span className="text-gray-500 font-normal">({matchedOrder.sizeColor})</span>
                    )}{' '}
                    <span className="text-orange-600">x{matchedOrder.quantity}</span>
                  </div>

                  <div className="space-y-1 text-gray-700 border-t border-orange-200/70 pt-2">
                    <div className="notranslate" translate="no">
                      <span className="text-gray-500">Người đặt: </span>
                      <strong>{matchedOrder.customerName}</strong> — {matchedOrder.customerPhone}
                    </div>
                    <div>
                      <span className="text-gray-500">Địa chỉ: </span>
                      <span>{matchedOrder.customerAddress || 'Đang cập nhật'}</span>
                    </div>
                    {matchedOrder.spxTracking && (
                      <div className="notranslate" translate="no">
                        <span className="text-gray-500">Mã vận đơn VN: </span>
                        <strong className="font-mono text-indigo-700">{matchedOrder.spxTracking}</strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-orange-200/70 text-center">
                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                      <div className="text-[10px] text-gray-500">Tổng đơn</div>
                      <div className="font-extrabold text-gray-900">
                        {formatVND(matchedOrder.salePriceVnd)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700">Đã cọc</div>
                      <div className="font-extrabold text-emerald-700">
                        {formatVND(matchedOrder.depositVnd)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-orange-200">
                      <div className="text-[10px] text-orange-700">Thanh toán</div>
                      <div className="font-extrabold text-orange-600">
                        {formatVND(matchedOrder.codVnd)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CÁC ĐƠN ĐÃ HOÀN THÀNH TRƯỚC ĐÓ CỦA CÙNG SỐ ĐIỆN THOẠI */}
                {completedHistory.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-gray-600 uppercase">
                      Các đơn đã hoàn thành trước đó ({completedHistory.length} đơn):
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {completedHistory.map((oldOrd) => (
                        <div
                          key={oldOrd.id}
                          className="p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-gray-900 notranslate" translate="no">
                              #{oldOrd.code} • {oldOrd.productName} x{oldOrd.quantity}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                              Đã trả hàng
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 flex flex-wrap items-center justify-between gap-1">
                            <span>
                              Cọc: <strong>{formatVND(oldOrd.depositVnd)}</strong> • Thanh toán:{' '}
                              <strong>{formatVND(oldOrd.codVnd)}</strong>
                            </span>
                            {oldOrd.spxTracking && (
                              <span className="font-mono font-bold text-indigo-700 notranslate" translate="no">
                                MVĐ: {oldOrd.spxTracking}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // GIAO DIỆN CHÍNH SAU KHI ĐĂNG NHẬP
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-14">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-a6-label, #printable-a6-label * { visibility: visible; }
          #printable-a6-label {
            position: fixed;
            left: 0;
            top: 0;
            width: 105mm;
            min-height: 148mm;
            margin: 0;
            padding: 6mm;
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* THÔNG BÁO TOAST */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-gray-900 tracking-tight notranslate" translate="no">
                  ordertaobao.pro
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {syncStatus === 'synced' ? 'Trực tuyến' : 'Đang đồng bộ'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800 notranslate" translate="no">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-orange-600" />
              )}
              <span className="max-w-[110px] sm:max-w-none truncate">{currentUser.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* THANH ĐIỀU HƯỚNG TAB */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex overflow-x-auto no-scrollbar border-t border-gray-100">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Package className="w-4 h-4" />
            1. Đơn Hàng & Theo Dõi
          </button>

          {currentUser.role === 'ctv' && (
            <button
              onClick={() => setActiveTab('ctv_income')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'ctv_income'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              2. Nhận Lương & Ngân Hàng
            </button>
          )}

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'batches'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Truck className="w-4 h-4" />
                2. Tracking & Đợt Kho
              </button>

              <button
                onClick={() => setActiveTab('shipping')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'shipping'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                3. Tạo Đơn Trả Hàng & A6
              </button>

              <button
                onClick={() => setActiveTab('ctv_admin')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'ctv_admin'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Users className="w-4 h-4" />
                4. CTV & Hoa Hồng
              </button>

              <button
                onClick={() => setActiveTab('finance')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'finance'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                5. Báo Cáo & Thuế
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* ================================================================== */}
        {/* TAB 1: ĐƠN HÀNG (ADMIN & CTV)                                      */}
        {/* ================================================================== */}
        {activeTab === 'orders' && (
          <>
            {currentUser.role === 'admin' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>Tỷ giá Trung - Việt (CNY/VNĐ) tự động tính giá gốc:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">1 ¥ =</span>
                  <input
                    type="number"
                    value={appData.exchangeRate}
                    onChange={(e) =>
                      updateAppData({
                        ...appData,
                        exchangeRate: Number(e.target.value) || 3550
                      })
                    }
                    className="w-24 px-2.5 py-1 rounded-xl border border-amber-300 bg-white text-sm font-bold text-amber-900 text-right"
                  />
                  <span className="text-xs font-bold text-gray-700">₫</span>
                </div>
              </div>
            )}

            {/* FORM LÊN ĐƠN MỚI */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-mono font-bold text-xs notranslate" translate="no">
                    #{nextOrderCode}
                  </span>
                  <h2 className="font-bold text-sm sm:text-base text-gray-900">
                    {currentUser.role === 'admin'
                      ? 'Tạo Đơn Taobao & Gán Mã Đơn Nội Địa'
                      : 'Tạo Đơn Hàng Mới'}
                  </h2>
                </div>
                <span className="text-xs text-gray-500 notranslate" translate="no">
                  Tài khoản: <strong>{currentUser.name}</strong>
                </span>
              </div>

              {currentUser.role === 'admin' ? (
                <form onSubmit={handleCreateOrderAdmin} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Mã vận đơn (MVĐ) Taobao *
                      </label>
                      <input
                        type="text"
                        required
                        value={taobaoForm.cnTracking}
                        onChange={(e) => setTaobaoForm({ ...taobaoForm, cnTracking: e.target.value })}
                        placeholder="VD: SF1682940..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono notranslate"
                        translate="no"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Tên sản phẩm trên Taobao *
                      </label>
                      <input
                        type="text"
                        required
                        value={taobaoForm.productName}
                        onChange={(e) => setTaobaoForm({ ...taobaoForm, productName: e.target.value })}
                        placeholder="VD: Tweed Jacket..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                        translate="no"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-orange-700 uppercase mb-1">
                        Giá tệ (¥) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={taobaoForm.costCny}
                        onChange={(e) => setTaobaoForm({ ...taobaoForm, costCny: e.target.value })}
                        placeholder="VD: 65.5"
                        className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-orange-50/40 text-xs font-bold text-orange-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Giá gốc hàng hóa (Tự động tính)
                      </label>
                      <div className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-extrabold text-gray-900">
                        {formatVND(computedCostVnd)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase">
                      Chọn các mã đơn nội địa thuộc đơn Taobao này ({taobaoForm.selectedDomesticIds.length} đã chọn — tự động cập nhật sang CTV):
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                      {appData.orders
                        .filter((o) => o.status !== 'cancelled' && o.status !== 'shipped_done')
                        .map((o) => {
                          const selected = taobaoForm.selectedDomesticIds.includes(o.id);
                          return (
                            <button
                              type="button"
                              key={o.id}
                              onClick={() => toggleDomesticOrderForTaobao(o.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 notranslate ${
                                selected
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'
                              }`}
                              translate="no"
                            >
                              <span className="font-mono font-bold">#{o.code}</span>
                              <span>• {o.productName}</span>
                              <span className="opacity-75">({o.ctvName})</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Lưu Đơn Taobao & Cập Nhật CTV
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateOrderCTV} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Tên khách hàng *
                      </label>
                      <input
                        type="text"
                        required
                        value={newOrder.customerName}
                        onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                        placeholder="VD: Nguyễn Thu Hà"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                        translate="no"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Số điện thoại khách
                      </label>
                      <input
                        type="tel"
                        value={newOrder.customerPhone}
                        onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                        placeholder="09xx..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Địa chỉ giao hàng
                      </label>
                      <input
                        type="text"
                        value={newOrder.customerAddress}
                        onChange={(e) => setNewOrder({ ...newOrder, customerAddress: e.target.value })}
                        placeholder="Số nhà, đường, phường/xã..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Tên sản phẩm *
                      </label>
                      <input
                        type="text"
                        required
                        value={newOrder.productName}
                        onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                        placeholder="VD: Set Tweed / Cardigan..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                        translate="no"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Phân loại (Màu / Size)
                      </label>
                      <input
                        type="text"
                        value={newOrder.sizeColor}
                        onChange={(e) => setNewOrder({ ...newOrder, sizeColor: e.target.value })}
                        placeholder="VD: Kem - Size S"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                        translate="no"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Giá bán tổng đơn (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        value={newOrder.salePriceVnd}
                        onChange={(e) => setNewOrder({ ...newOrder, salePriceVnd: e.target.value })}
                        placeholder="VD: 350000"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1">
                        Khách đã cọc (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={newOrder.depositVnd}
                        onChange={(e) => setNewOrder({ ...newOrder, depositVnd: e.target.value })}
                        placeholder="VD: 150000"
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-700 uppercase mb-1">
                        Hoa hồng CTV (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={newOrder.commissionVnd}
                        onChange={(e) => setNewOrder({ ...newOrder, commissionVnd: e.target.value })}
                        placeholder="VD: 35000"
                        className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-bold text-purple-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-orange-700 uppercase mb-1">
                        Phần còn lại (Tự tính)
                      </label>
                      <div className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-orange-50 text-xs font-extrabold text-orange-700">
                        {formatVND(computedRemainingCod)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-3 text-center bg-gray-50 overflow-hidden">
                      <label className="cursor-pointer block">
                        <Upload className="mx-auto text-gray-400 mb-1 w-5 h-5" />
                        <span className="text-xs font-semibold text-gray-600">
                          Upload ảnh sản phẩm (Chọn nhiều ảnh)
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleMultiProductImageUpload}
                          className="hidden"
                        />
                      </label>
                      {newOrder.productImages && newOrder.productImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5 justify-center">
                          {newOrder.productImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shrink-0"
                            >
                              <img
                                src={img}
                                alt="SP"
                                onClick={() => setPreviewImage(img)}
                                className="w-full h-full object-cover cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-3 text-center bg-gray-50 overflow-hidden">
                      <label className="cursor-pointer block">
                        <ImageIcon className="mx-auto text-gray-400 mb-1 w-5 h-5" />
                        <span className="text-xs font-semibold text-gray-600">
                          Upload ảnh Bill cọc (Chỉ 1 ảnh)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadDepositBill}
                          className="hidden"
                        />
                      </label>
                      {newOrder.depositBillImage && (
                        <div className="mt-2.5 flex justify-center">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-emerald-300 shrink-0">
                            <img
                              src={newOrder.depositBillImage}
                              alt="Bill"
                              onClick={() => setPreviewImage(newOrder.depositBillImage)}
                              className="w-full h-full object-cover cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Ghi chú đơn hàng
                    </label>
                    <input
                      type="text"
                      value={newOrder.note}
                      onChange={(e) => setNewOrder({ ...newOrder, note: e.target.value })}
                      placeholder="Ghi chú thêm về size, màu sắc, lưu ý giao hàng..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Lưu Đơn Hàng #{nextOrderCode}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* DANH SÁCH ĐƠN HÀNG (3 MỤC: ĐANG CHỜ / ĐIỀU CHỈNH / HOÀN THÀNH) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setOrderSubTab('active')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                      orderSubTab === 'active'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Đang chờ ({activeCount})
                  </button>

                  <button
                    onClick={() => setOrderSubTab('adjust')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                      orderSubTab === 'adjust'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Điều chỉnh ({adjustCount})
                  </button>

                  <button
                    onClick={() => setOrderSubTab('done')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                      orderSubTab === 'done'
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành ({doneCount})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentUser.role === 'admin' && (
                    <select
                      value={filterCtv}
                      onChange={(e) => setFilterCtv(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white notranslate"
                      translate="no"
                    >
                      <option value="all">Tất cả CTV</option>
                      {appData.ctvs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm mã đơn, tên khách, SP, MVĐ..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {visibleOrders.length === 0 ? (
                  <div className="p-10 text-center text-xs text-gray-400">
                    Chưa có đơn hàng nào trong mục này.
                  </div>
                ) : (
                  visibleOrders.map((order) => {
                    const statusObj =
                      ORDER_STATUSES.find((s) => s.id === order.status) || ORDER_STATUSES[0];

                    return (
                      <div key={order.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-wrap gap-1.5 shrink-0 max-w-[130px]">
                              {order.productImages && order.productImages.length > 0 ? (
                                order.productImages.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt="SP"
                                    onClick={() => setPreviewImage(img)}
                                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 cursor-pointer hover:opacity-90"
                                  />
                                ))
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                                  No Img
                                </div>
                              )}
                              {order.depositBillImage && (
                                <img
                                  src={order.depositBillImage}
                                  alt="Bill"
                                  onClick={() => setPreviewImage(order.depositBillImage)}
                                  className="w-14 h-14 rounded-xl object-cover border border-emerald-300 cursor-pointer hover:opacity-90"
                                  title="Xem ảnh bill"
                                />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white font-mono font-bold text-xs notranslate" translate="no">
                                  #{order.code}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[11px] font-bold notranslate" translate="no">
                                  {order.ctvName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusObj.color}`}
                                >
                                  {statusObj.label}
                                </span>
                                <span className="text-[11px] text-gray-400">{order.createdAt}</span>
                              </div>

                              <h3 className="font-bold text-sm text-gray-900 notranslate" translate="no">
                                {order.productName}{' '}
                                {order.sizeColor && (
                                  <span className="text-gray-500 font-normal">({order.sizeColor})</span>
                                )}{' '}
                                <span className="text-orange-600">x{order.quantity}</span>
                              </h3>

                              <p className="text-xs text-gray-600 notranslate" translate="no">
                                <strong>{order.customerName}</strong> • {order.customerPhone || 'Chưa có SĐT'} •{' '}
                                {order.customerAddress || 'Chưa có địa chỉ'}
                              </p>

                              {order.cnTracking && (
                                <p className="text-[11px] font-mono text-blue-700 font-semibold notranslate" translate="no">
                                  MVĐ Taobao: {order.cnTracking}
                                </p>
                              )}

                              {order.spxTracking && (
                                <p className="text-[11px] font-mono text-indigo-700 font-semibold notranslate" translate="no">
                                  MVĐ Trả Khách: {order.spxTracking}
                                </p>
                              )}

                              {order.note && (
                                <p className="text-[11px] text-gray-500 italic">
                                  Ghi chú: {order.note}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <div className="text-left sm:text-right text-xs space-y-0.5">
                              <div>
                                Bán: <strong className="text-gray-900">{formatVND(order.salePriceVnd)}</strong> • Cọc:{' '}
                                <strong className="text-emerald-700">{formatVND(order.depositVnd)}</strong>
                              </div>
                              <div>
                                Còn lại: <strong className="text-orange-600">{formatVND(order.codVnd)}</strong> • HH CTV:{' '}
                                <strong className="text-purple-700">{formatVND(order.commissionVnd)}</strong>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {currentUser.role === 'ctv' && order.status === 'arrived_vn' && (
                                <>
                                  <button
                                    onClick={() => {
                                      updateOrderField(order.id, { status: 'keep' });
                                      showToast(`Đã chuyển đơn #${order.code} sang Keep!`);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold hover:bg-purple-100"
                                  >
                                    Báo Keep
                                  </button>
                                  <button
                                    onClick={() => setShippingModalOrder(order)}
                                    className="px-2.5 py-1 rounded-lg bg-orange-600 text-white text-[11px] font-bold hover:bg-orange-700"
                                  >
                                    Báo Giao Hàng
                                  </button>
                                </>
                              )}

                              {currentUser.role === 'admin' && (
                                <>
                                  <select
                                    value={order.status}
                                    onChange={(e) => updateOrderField(order.id, { status: e.target.value })}
                                    className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-bold"
                                  >
                                    {ORDER_STATUSES.map((st) => (
                                      <option key={st.id} value={st.id}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    onClick={() => setEditOrderModal({ ...order })}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    title="Chỉnh sửa toàn bộ thông tin đơn"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmId(order.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    title="Xóa đơn hàng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ================================================================== */}
        {/* TAB 2 (ADMIN): TRACKING & ĐỢT HÀNG KHO TRẢ (CHECK-OUT + XEM LẠI)   */}
        {/* ================================================================== */}
        {activeTab === 'batches' && currentUser.role === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-3">
                Tạo Đợt Hàng Kho Trả & Chia Đều Cước Vận Chuyển
              </h2>
              <form onSubmit={handleCreateBatch} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Tên đợt kho
                    </label>
                    <input
                      type="text"
                      value={batchForm.batchName}
                      onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                      placeholder="VD: Đợt kho 25/11"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Tổng cân bao (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={batchForm.totalKg}
                      onChange={(e) => setBatchForm({ ...batchForm, totalKg: e.target.value })}
                      placeholder="VD: 12.5"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Giá cân (VNĐ/kg) *
                    </label>
                    <input
                      type="number"
                      required
                      value={batchForm.pricePerKg}
                      onChange={(e) => setBatchForm({ ...batchForm, pricePerKg: e.target.value })}
                      placeholder="VD: 25000"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Phí ship nội địa (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={batchForm.localShipVnd}
                      onChange={(e) => setBatchForm({ ...batchForm, localShipVnd: e.target.value })}
                      placeholder="VD: 35000"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-2">
                    Chọn các MVĐ Taobao kho vận chuyển báo có trong đợt xuất kho ({batchForm.selectedCnTrackings.length} MVĐ):
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
                    {availableCnTrackings.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Chưa có MVĐ Taobao nào đang chờ xuất kho. Hãy gán MVĐ Taobao ở Tab 1 trước!
                      </div>
                    ) : (
                      availableCnTrackings.map((item) => {
                        const checked = batchForm.selectedCnTrackings.includes(item.cnTracking);
                        return (
                          <label
                            key={item.cnTracking}
                            className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-gray-50 ${
                              checked ? 'bg-orange-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCnTrackingForBatch(item.cnTracking)}
                                className="rounded text-orange-600"
                              />
                              <div>
                                <span className="font-mono font-bold text-blue-700 notranslate" translate="no">
                                  {item.cnTracking}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  (Gồm đơn: {item.orderCodes.map((c) => `#${c}`).join(', ')})
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow"
                >
                  Tạo Đợt Xuất Kho & Chia Đều Cước
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-3">
              <h3 className="font-bold text-sm text-gray-900">
                Danh Sách Đợt Xuất Kho ({appData.batches.length})
              </h3>
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {appData.batches.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Chưa có đợt kho nào.</p>
                ) : (
                  appData.batches.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setViewBatchModal(b)}
                      className="p-3.5 rounded-2xl bg-gray-50 hover:bg-orange-50/40 border border-gray-200 hover:border-orange-300 text-xs space-y-2 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900">{b.name}</span>
                        <span className="text-[11px] text-gray-400">{b.createdAt}</span>
                      </div>
                      <div className="text-gray-600">
                        Nặng: <strong>{b.totalKg} kg</strong> • Tổng cước:{' '}
                        <strong className="text-orange-700">{formatVND(b.totalFeeVnd)}</strong>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono truncate notranslate" translate="no">
                        MVĐ: {b.cnTrackings?.join(', ')}
                      </div>
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setViewBatchModal(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold text-[11px] flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-600" />
                          <span>Xem chi tiết ({b.orderIds?.length || 0} đơn)</span>
                        </button>

                        {b.checkedOut ? (
                          <button
                            type="button"
                            onClick={() => setViewBatchModal(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Đã xác nhận
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCheckoutModal(b)}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                          >
                            <CheckSquare className="w-3.5 h-3.5" /> Check-out kiểm hàng
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3 (ADMIN): TẠO ĐƠN TRẢ HÀNG & PHIẾU A6 (MÃ VẠCH CODE 128B)     */}
        {/* ================================================================== */}
        {activeTab === 'shipping' && currentUser.role === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                1. Tạo Đơn Trả Hàng & Cấu Hình Vận Đơn
              </h2>

              <form onSubmit={handleGenerateA6Label} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Chọn đơn hàng cần trả *
                  </label>
                  <select
                    required
                    value={selectedPrintOrderId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPrintOrderId(id);
                      const found = appData.orders.find((o) => o.id === id);
                      if (found) setCustomCodVnd(String(found.codVnd));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold notranslate"
                    translate="no"
                  >
                    <option value="">-- Chọn đơn hàng sẵn sàng trả --</option>
                    {readyToShipOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.code} — {o.customerName} — {o.productName} (Còn lại: {formatVND(o.codVnd)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Mã vận đơn nội địa VN (Tự sinh nếu để trống)
                  </label>
                  <input
                    type="text"
                    value={vnDomesticTrackingInput}
                    onChange={(e) => setVnDomesticTrackingInput(e.target.value)}
                    placeholder="VD: SPXVN06829104..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono notranslate"
                    translate="no"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-orange-700 uppercase mb-1">
                      Tùy chỉnh tiền thu COD gốc (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={customCodVnd}
                      onChange={(e) => setCustomCodVnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-orange-50/40 text-xs font-bold text-orange-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                      Phí ship nội địa (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={shipFeeInput}
                      onChange={(e) => setShipFeeInput(e.target.value)}
                      placeholder="VD: 22000"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">
                    Hình thức thanh toán phí ship:
                  </label>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="payer"
                        checked={shippingPayer === 'customer'}
                        onChange={() => setShippingPayer('customer')}
                      />
                      <span>Khách trả ship (COD + Phí ship)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-red-700">
                      <input
                        type="radio"
                        name="payer"
                        checked={shippingPayer === 'shop'}
                        onChange={() => setShippingPayer('shop')}
                      />
                      <span>Shop trả ship (Trừ phí ship ra)</span>
                    </label>
                  </div>
                  <div className="pt-1 text-xs font-bold text-indigo-700">
                    Tổng thu hộ in trên tem: {formatVND(calculatedPrintCod)}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Tạo Phiếu Vận Đơn Khổ A6
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-gray-900">
                  2. Phiếu Vận Đơn Khổ A6 (Lưu PDF)
                </h2>
                {activeLabelPreview && (
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" /> Tải / In File PDF
                  </button>
                )}
              </div>

              {activeLabelPreview ? (
                <div
                  id="printable-a6-label"
                  className="w-full max-w-[360px] border-2 border-gray-900 rounded-2xl p-4 bg-white space-y-3 shadow-md text-gray-900"
                >
                  <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2.5 gap-2">
                    <div>
                      <div className="font-black text-base tracking-tight">EXPRESS A6</div>
                      <div className="text-xs font-bold text-orange-600 notranslate" translate="no">
                        Serenade Order
                      </div>
                    </div>
                    <BarcodeCode128 value={activeLabelPreview.spxCode} />
                  </div>

                  <div className="text-xs border-b border-dashed border-gray-400 pb-2">
                    <span className="font-bold text-gray-500 uppercase">Người gửi: </span>
                    <strong className="notranslate" translate="no">Serenade Order</strong>
                  </div>

                  <div className="border-b-2 border-gray-900 pb-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">
                      Người nhận hàng:
                    </div>
                    <div className="font-extrabold text-sm notranslate" translate="no">
                      {activeLabelPreview.receiverName} — {activeLabelPreview.receiverPhone}
                    </div>
                    <div className="text-xs leading-relaxed">
                      {activeLabelPreview.receiverAddress}
                    </div>
                  </div>

                  <div className="border-b border-gray-300 pb-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">
                      Thông tin sản phẩm:
                    </div>
                    <div className="text-xs font-semibold notranslate" translate="no">
                      {activeLabelPreview.itemsSummary}
                    </div>
                    {activeLabelPreview.note && (
                      <div className="text-[11px] italic text-gray-600">
                        Ghi chú: {activeLabelPreview.note}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase">
                        Tiền thu hộ (COD):
                      </div>
                      <div className="text-xl font-black text-gray-900">
                        {formatVND(activeLabelPreview.codAmount)}
                      </div>
                      {activeLabelPreview.shipFee > 0 && (
                        <div className="text-[10px] text-gray-500">
                          ({activeLabelPreview.shippingPayer === 'customer'
                            ? `Đã cộng ${formatVND(activeLabelPreview.shipFee)} phí ship`
                            : `Đã trừ ${formatVND(activeLabelPreview.shipFee)} phí ship`})
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-1 rounded-lg border-2 border-gray-900 text-[10px] font-black uppercase">
                      {activeLabelPreview.shippingPayer === 'shop'
                        ? 'SHOP TRẢ SHIP'
                        : 'KHÁCH TRẢ SHIP'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-72 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-xs text-gray-400 text-center p-4">
                  Chọn đơn hàng và bấm "Tạo Phiếu Vận Đơn Khổ A6" để hiển thị tem có mã vạch Code 128B chuẩn quét.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4 (ADMIN): CTV & HOA HỒNG + QUYỀN XÓA TÀI KHOẢN CTV            */}
        {/* ================================================================== */}
        {activeTab === 'ctv_admin' && currentUser.role === 'admin' && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-3">
                Tạo Tài Khoản Cộng Tác Viên (Cấp 2)
              </h2>
              <form onSubmit={handleCreateCtv} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Tên hiển thị CTV
                  </label>
                  <input
                    type="text"
                    required
                    value={newCtvForm.name}
                    onChange={(e) => setNewCtvForm({ ...newCtvForm, name: e.target.value })}
                    placeholder="VD: Lan Anh"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                    translate="no"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    required
                    value={newCtvForm.username}
                    onChange={(e) => setNewCtvForm({ ...newCtvForm, username: e.target.value })}
                    placeholder="VD: lananh"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                    translate="no"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Mật khẩu cấp cho CTV
                  </label>
                  <input
                    type="text"
                    required
                    value={newCtvForm.password}
                    onChange={(e) => setNewCtvForm({ ...newCtvForm, password: e.target.value })}
                    placeholder="VD: 123456"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow"
                >
                  + Tạo Tài Khoản CTV
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appData.ctvs.map((ctv) => {
                const ctvOrders = appData.orders.filter(
                  (o) => o.ctvId === ctv.id && o.status !== 'cancelled'
                );
                const totalComm = ctvOrders.reduce(
                  (s, o) => s + (Number(o.commissionVnd) || 0),
                  0
                );
                const paidComm = ctvOrders
                  .filter((o) => o.commissionPaid)
                  .reduce((s, o) => s + (Number(o.commissionVnd) || 0), 0);
                const unpaidComm = totalComm - paidComm;
                const unpaidOrders = ctvOrders.filter(
                  (o) => !o.commissionPaid && (Number(o.commissionVnd) || 0) > 0
                );

                return (
                  <div
                    key={ctv.id}
                    className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-gray-900 notranslate" translate="no">
                        {ctv.name}{' '}
                        <span className="text-xs font-normal text-gray-400">
                          (@{ctv.username} / pass: {ctv.password})
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-bold">
                          {ctvOrders.length} đơn
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteCtvTarget(ctv)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                          title="Xóa tài khoản CTV"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2 text-xs">
                      {ctv.bankAccount ? (
                        <div className="notranslate" translate="no">
                          <div className="font-bold text-blue-900">
                            {ctv.bankName} — {ctv.bankAccount}
                          </div>
                          <div className="text-[11px] text-blue-700 uppercase">
                            {ctv.bankHolder}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">
                          CTV chưa cập nhật số tài khoản ngân hàng
                        </span>
                      )}
                      {ctv.bankAccount && (
                        <button
                          onClick={() => handleCopy(ctv.bankAccount, ctv.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          {copiedText === ctv.id ? (
                            <>
                              <Check className="w-3 h-3" /> Đã copy
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy STK
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="text-emerald-700">Hoa hồng đã thanh toán</div>
                        <div className="font-extrabold text-emerald-800 text-sm">
                          {formatVND(paidComm)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                        <div className="text-amber-700">Hoa hồng chưa thanh toán</div>
                        <div className="font-extrabold text-amber-800 text-sm">
                          {formatVND(unpaidComm)}
                        </div>
                      </div>
                    </div>

                    {unpaidComm > 0 && (
                      <button
                        onClick={() => {
                          setPayoutModal({
                            ctvObj: ctv,
                            orderIds: unpaidOrders.map((o) => o.id),
                            totalAmount: unpaidComm
                          });
                          setPaidInputAmount(String(unpaidComm));
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Thanh Toán Hoa Hồng & Upload Bill
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 5 (ADMIN): BÁO CÁO & KÊ KHAI THUẾ EXCEL (.CSV)                 */}
        {/* ================================================================== */}
        {activeTab === 'finance' && currentUser.role === 'admin' && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-gray-900">
                  Báo Cáo Doanh Thu, Lãi Thực Tế & Kê Khai Thuế
                </h2>
                <p className="text-xs text-gray-500">
                  Loại trừ các đơn đã hủy/hoàn. Doanh thu tính theo tổng tiền khách trả (không ghi riêng phần CTV).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={taxMonthFilter === 'all' ? '' : taxMonthFilter}
                  onChange={(e) => setTaxMonthFilter(e.target.value || 'all')}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold"
                />
                {taxMonthFilter !== 'all' && (
                  <button
                    onClick={() => setTaxMonthFilter('all')}
                    className="px-2.5 py-2 rounded-xl border text-xs font-bold text-gray-600"
                  >
                    Tất cả
                  </button>
                )}
                <button
                  onClick={handleExportTaxCSV}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Xuất File Excel Thuế (.CSV)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500 font-semibold">
                  Doanh thu ({validFinancialOrders.length} đơn hợp lệ)
                </div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">
                  {formatVND(financialSummary.totalRevenue)}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-3xl border border-purple-200 shadow-sm">
                <div className="text-xs text-purple-700 font-semibold">
                  Tổng chi phí (Vốn + Cước kho + Ship shop)
                </div>
                <div className="text-xl font-extrabold text-purple-800 mt-1">
                  {formatVND(financialSummary.totalCost)}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-3xl border border-red-200 shadow-sm">
                <div className="text-xs text-red-700 font-semibold">Thuế khoán dự tính (1.5%)</div>
                <div className="text-xl font-extrabold text-red-800 mt-1">
                  {formatVND(financialSummary.tax15)}
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-300 shadow-sm">
                <div className="text-xs text-emerald-800 font-bold">Lãi thực tế</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {formatVND(financialSummary.netProfit)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2 (CTV): NHẬN LƯƠNG & NGÂN HÀNG                                */}
        {/* ================================================================== */}
        {activeTab === 'ctv_income' && currentUser.role === 'ctv' && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-3">
                Cập Nhật Tài Khoản Ngân Hàng Nhận Lương
              </h2>
              <form onSubmit={handleSaveCtvBank} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Tên ngân hàng
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="VD: MB Bank / Vietcombank"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs notranslate"
                    translate="no"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Chủ tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankHolder}
                    onChange={(e) => setBankForm({ ...bankForm, bankHolder: e.target.value })}
                    placeholder="NGUYEN THI LAN ANH"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs uppercase notranslate"
                    translate="no"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Số TKNH
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankAccount}
                    onChange={(e) => setBankForm({ ...bankForm, bankAccount: e.target.value })}
                    placeholder="0987654321"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow"
                >
                  Lưu Tài Khoản Ngân Hàng
                </button>
              </form>
            </div>

            {(() => {
              const myOrders = appData.orders.filter(
                (o) => o.ctvId === currentUser.id && o.status !== 'cancelled'
              );
              const totalComm = myOrders.reduce(
                (s, o) => s + (Number(o.commissionVnd) || 0),
                0
              );
              const paidComm = myOrders
                .filter((o) => o.commissionPaid)
                .reduce((s, o) => s + (Number(o.commissionVnd) || 0), 0);
              const unpaidComm = totalComm - paidComm;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-500 font-semibold">Tổng hoa hồng tích lũy</p>
                      <p className="text-xl font-extrabold text-gray-900 mt-1">
                        {formatVND(totalComm)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-200 shadow-sm">
                      <p className="text-xs text-emerald-700 font-semibold">Đã nhận thanh toán</p>
                      <p className="text-xl font-extrabold text-emerald-800 mt-1">
                        {formatVND(paidComm)}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200 shadow-sm">
                      <p className="text-xs text-amber-700 font-semibold">Đang chờ thanh toán</p>
                      <p className="text-xl font-extrabold text-amber-800 mt-1">
                        {formatVND(unpaidComm)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-bold text-sm">
                      Chi Tiết Hoa Hồng Thanh Toán & Bill Chuyển Khoản
                    </div>
                    <div className="divide-y divide-gray-100">
                      {myOrders.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                          Chưa có dữ liệu hoa hồng.
                        </div>
                      ) : (
                        myOrders.map((o) => (
                          <div
                            key={o.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div className="notranslate" translate="no">
                              <span className="font-mono font-bold text-gray-900 mr-2">
                                #{o.code}
                              </span>
                              <span className="font-semibold text-gray-800">{o.productName}</span>
                              <span className="text-gray-400 ml-2">({o.createdAt})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-purple-700">
                                +{formatVND(o.commissionVnd)}
                              </span>
                              {o.commissionPaid ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Đã thanh toán
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  Chờ thanh toán
                                </span>
                              )}
                              {o.commissionBillImage && (
                                <button
                                  onClick={() => setPreviewImage(o.commissionBillImage)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Xem Bill Admin TT
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: CTV BÁO GIAO HÀNG (CẬP NHẬT SĐT & ĐỊA CHỈ KHÁCH)            */}
      {/* ==================================================================== */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">
                Báo Giao Hàng — #{shippingModalOrder.code}
              </h3>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Số điện thoại nhận hàng:
                </label>
                <input
                  type="tel"
                  defaultValue={shippingModalOrder.customerPhone}
                  id="modal_ship_phone"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Địa chỉ nhận hàng chi tiết:
                </label>
                <textarea
                  defaultValue={shippingModalOrder.customerAddress}
                  id="modal_ship_addr"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShippingModalOrder(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const phone = document.getElementById('modal_ship_phone').value;
                  const addr = document.getElementById('modal_ship_addr').value;
                  updateOrderField(shippingModalOrder.id, {
                    customerPhone: phone,
                    customerAddress: addr,
                    note: (shippingModalOrder.note ? shippingModalOrder.note + ' | ' : '') + 'CTV báo giao ngay'
                  });
                  setShippingModalOrder(null);
                  showToast('Đã cập nhật địa chỉ & báo giao hàng cho Admin!');
                }}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
              >
                Xác Nhận Báo Giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ADMIN CHỈNH SỬA TOÀN BỘ THÔNG TIN ĐƠN HÀNG                  */}
      {/* ==================================================================== */}
      {editOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">
                Chỉnh Sửa Đơn Hàng #{editOrderModal.code}
              </h3>
              <button
                onClick={() => setEditOrderModal(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  value={editOrderModal.customerName}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, customerName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={editOrderModal.customerPhone}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, customerPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Địa chỉ nhận hàng</label>
                <input
                  type="text"
                  value={editOrderModal.customerAddress}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, customerAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tên sản phẩm</label>
                <input
                  type="text"
                  value={editOrderModal.productName}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, productName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Phân loại</label>
                <input
                  type="text"
                  value={editOrderModal.sizeColor}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, sizeColor: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">MVĐ Taobao</label>
                <input
                  type="text"
                  value={editOrderModal.cnTracking}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, cnTracking: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Giá tệ gốc (¥)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editOrderModal.costCny}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, costCny: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Giá bán (VNĐ)</label>
                <input
                  type="number"
                  value={editOrderModal.salePriceVnd}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, salePriceVnd: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Khách đã cọc (VNĐ)</label>
                <input
                  type="number"
                  value={editOrderModal.depositVnd}
                  onChange={(e) =>
                    setEditOrderModal({ ...editOrderModal, depositVnd: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditOrderModal(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  updateOrderField(editOrderModal.id, editOrderModal);
                  setEditOrderModal(null);
                  showToast('Đã lưu chỉnh sửa đơn hàng!');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: CHECK-OUT KIỂM ĐẾM ĐỢT KHO LẦN 2                            */}
      {/* ==================================================================== */}
      {checkoutModalBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">
                Check-out Kiểm Đếm — {checkoutModalBatch.name}
              </h3>
              <button
                onClick={() => setCheckoutModalBatch(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Tích chọn các MVĐ Taobao thực tế đã nhận đủ trong bao hàng. Khi xác nhận, toàn bộ đơn nội địa thuộc các MVĐ này sẽ tự động cập nhật sang <strong>Có sẵn</strong> cho CTV:
            </p>

            <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
              {checkoutModalBatch.cnTrackings?.map((trk) => {
                const isOk = verifiedTrackings.includes(trk);
                return (
                  <label
                    key={trk}
                    className="flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isOk}
                        onChange={() => {
                          setVerifiedTrackings((prev) =>
                            prev.includes(trk)
                              ? prev.filter((x) => x !== trk)
                              : [...prev, trk]
                          );
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span className="font-mono font-bold text-gray-900 notranslate" translate="no">
                        {trk}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {isOk ? 'Đủ hàng' : 'Thiếu'}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCheckoutModalBatch(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmBatchCheckout}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
              >
                Xác Nhận Đủ Hàng & Cập Nhật Có Sẵn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3B: XEM CHI TIẾT ĐỢT XUẤT KHO (MỞ LẠI CÁC ĐƠN ĐÃ XÁC NHẬN)     */}
      {/* ==================================================================== */}
      {viewBatchModal && (() => {
        const batchOrders = appData.orders.filter(
          (o) =>
            o.batchId === viewBatchModal.id ||
            (viewBatchModal.orderIds || []).includes(o.id)
        );
        const perOrderFee =
          batchOrders.length > 0
            ? Math.round((Number(viewBatchModal.totalFeeVnd) || 0) / batchOrders.length)
            : 0;

        return (
          <div
            onClick={() => setViewBatchModal(null)}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-8"
            >
              <div className="flex items-start justify-between border-b border-gray-100 pb-3 gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900">
                      {viewBatchModal.name}
                    </h3>
                    {viewBatchModal.checkedOut ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã check-out xác nhận
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                        Chưa check-out
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ngày tạo đợt kho: {viewBatchModal.createdAt}
                  </p>
                </div>

                <button
                  onClick={() => setViewBatchModal(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* THÔNG SỐ TỔNG QUAN CƯỚC & CÂN NẶNG */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="text-[11px] text-gray-500">Tổng cân nặng</div>
                  <div className="font-extrabold text-gray-900 text-sm mt-0.5">
                    {viewBatchModal.totalKg} kg
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200">
                  <div className="text-[11px] text-orange-700">Tổng cước đợt kho</div>
                  <div className="font-extrabold text-orange-700 text-sm mt-0.5">
                    {formatVND(viewBatchModal.totalFeeVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <div className="text-[11px] text-purple-700">Cước chia / đơn</div>
                  <div className="font-extrabold text-purple-800 text-sm mt-0.5">
                    {formatVND(perOrderFee)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] text-blue-700">Số kiện / Đơn</div>
                  <div className="font-extrabold text-blue-900 text-sm mt-0.5">
                    {viewBatchModal.cnTrackings?.length || 0} MVĐ / {batchOrders.length} đơn
                  </div>
                </div>
              </div>

              {/* DANH SÁCH MVĐ TAOBAO TRONG ĐỢT KHO */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-600 uppercase">
                  Danh sách MVĐ Taobao trong bao ({viewBatchModal.cnTrackings?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(viewBatchModal.cnTrackings || []).map((trk) => (
                    <span
                      key={trk}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold text-xs notranslate"
                      translate="no"
                    >
                      {trk}
                    </span>
                  ))}
                </div>
              </div>

              {/* CHI TIẾT TỪNG ĐƠN NỘI ĐỊA THUỘC ĐỢT KHO */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-600 uppercase">
                  Chi tiết các đơn nội địa trong đợt kho ({batchOrders.length} đơn):
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
                  {batchOrders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      Không tìm thấy đơn nội địa liên kết với đợt kho này.
                    </div>
                  ) : (
                    batchOrders.map((ord) => {
                      const stObj =
                        ORDER_STATUSES.find((s) => s.id === ord.status) || ORDER_STATUSES[0];
                      return (
                        <div
                          key={ord.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-gray-50"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded bg-gray-900 text-white font-mono font-bold text-[11px] notranslate"
                                translate="no"
                              >
                                #{ord.code}
                              </span>
                              <span className="font-bold text-gray-900 notranslate" translate="no">
                                {ord.customerName}
                              </span>
                              <span className="text-gray-400">({ord.ctvName})</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stObj.color}`}
                              >
                                {stObj.label}
                              </span>
                            </div>
                            <div className="text-gray-700 truncate notranslate" translate="no">
                              {ord.productName}{' '}
                              {ord.sizeColor ? `(${ord.sizeColor})` : ''} x{ord.quantity}
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <div className="font-mono text-[11px] text-blue-700 font-bold notranslate" translate="no">
                              {ord.cnTracking}
                            </div>
                            <div className="text-[11px] text-purple-700 font-bold">
                              Cước kho: {formatVND(ord.vnShippingCostVnd || perOrderFee)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const targetBatch = viewBatchModal;
                    setViewBatchModal(null);
                    openCheckoutModal(targetBatch);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{viewBatchModal.checkedOut ? 'Kiểm đếm lại đợt kho' : 'Check-out kiểm hàng'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewBatchModal(null)}
                  className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 4: XÁC NHẬN THANH TOÁN HOA HỒNG & UPLOAD BILL (ADMIN)          */}
      {/* ==================================================================== */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">
                Thanh Toán Hoa Hồng — {payoutModal.ctvObj.name}
              </h3>
              <button
                onClick={() => setPayoutModal(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Số tiền hoa hồng đã thanh toán (VNĐ):
                </label>
                <input
                  type="number"
                  value={paidInputAmount}
                  onChange={(e) => setPaidInputAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Upload ảnh bill chuyển khoản:
                </label>
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 overflow-hidden">
                  {payoutBillBase64 ? (
                    <img
                      src={payoutBillBase64}
                      alt="Bill"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 text-xs">
                      <Upload className="w-5 h-5 mb-1" />
                      <span>Chọn ảnh bill chuyển khoản</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPayoutBill}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPayoutModal(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={confirmCommissionPayout}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Xác Nhận Đã Thanh Toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: XÁC NHẬN XÓA ĐƠN HÀNG                                       */}
      {/* ==================================================================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">Xác nhận xóa đơn hàng?</h3>
            <p className="text-xs text-gray-500">
              Dữ liệu đơn hàng này sẽ bị xóa khỏi hệ thống và không thể khôi phục.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteOrder}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Xóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5B: XÁC NHẬN XÓA TÀI KHOẢN CTV                                 */}
      {/* ==================================================================== */}
      {deleteCtvTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">
              Xóa tài khoản CTV "{deleteCtvTarget.name}"?
            </h3>
            <p className="text-xs text-gray-500">
              Tài khoản <strong className="text-gray-700">@{deleteCtvTarget.username}</strong> sẽ bị xóa khỏi danh sách CTV và không thể đăng nhập lại. Các đơn hàng cũ vẫn được giữ nguyên lịch sử.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteCtvTarget(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteCtv}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Xác Nhận Xóa CTV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: PHÓNG TO ẢNH SẢN PHẨM / BILL TRÊN MÀN HÌNH                 */}
      {/* ==================================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white rounded-3xl p-2 shadow-2xl"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 shadow-lg flex items-center justify-center font-bold"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}