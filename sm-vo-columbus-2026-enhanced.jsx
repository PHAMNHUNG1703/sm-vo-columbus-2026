import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Calendar, DollarSign, AlertCircle, TrendingUp, Mail, FileText, Download, Upload } from 'lucide-react';

export default function SMVOColumbus2026() {
  const [records, setRecords] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    llcName: '',
    services: { vo: false, phone: false },
    startDate: '',
    months: 3,
    address: '',
    phone: '',
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sm-vo-columbus-records');
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sm-vo-columbus-records', JSON.stringify(records));
  }, [records]);

  const calculateExpiry = (startDate, months) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return date;
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const calculateMonthlyCost = (services) => {
    let cost = 0;
    if (services.vo) cost += 29;
    if (services.phone) cost += 9;
    return cost;
  };

  const handleAddRecord = (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.llcName || !formData.startDate) {
      alert('Vui lòng điền đủ thông tin bắt buộc');
      return;
    }

    if (!formData.services.vo && !formData.services.phone) {
      alert('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }

    const expiryDate = calculateExpiry(formData.startDate, formData.months);
    const newRecord = {
      id: Date.now(),
      ...formData,
      expiryDate: expiryDate.toISOString().split('T')[0],
      monthlyCost: calculateMonthlyCost(formData.services),
    };

    setRecords([...records, newRecord]);
    setFormData({
      customerName: '',
      llcName: '',
      services: { vo: false, phone: false },
      startDate: '',
      months: 3,
      address: '',
      phone: '',
    });
    setShowForm(false);
  };

  const handleDeleteRecord = (id) => {
    if (confirm('Bạn chắc chắn muốn xoá?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          const newRecords = importedData.map(item => ({
            id: item.id || Date.now() + Math.random(),
            ...item,
            monthlyCost: item.monthlyCost || calculateMonthlyCost(item.services),
          }));
          setRecords([...records, ...newRecords]);
          alert(`✅ Đã import thành công ${importedData.length} bản ghi!`);
        } else {
          alert('❌ File không đúng định dạng');
        }
      } catch (error) {
        alert('❌ Lỗi khi đọc file: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generatePaymentSchedule = () => {
    const schedule = {};
    records.forEach(record => {
      const startDate = new Date(record.startDate);
      const expiryDate = new Date(record.expiryDate);

      for (let i = 0; i < record.months; i++) {
        const paymentMonth = new Date(startDate);
        paymentMonth.setMonth(paymentMonth.getMonth() + i);
        const monthKey = `${paymentMonth.getFullYear()}-${String(paymentMonth.getMonth() + 1).padStart(2, '0')}`;

        if (!schedule[monthKey]) {
          schedule[monthKey] = [];
        }
        schedule[monthKey].push({
          llcName: record.llcName,
          customerName: record.customerName,
          services: record.services,
          cost: record.monthlyCost,
          expiryDate: record.expiryDate,
          phone: record.phone,
          address: record.address,
        });
      }
    });

    return Object.keys(schedule).sort().map(month => ({
      month,
      items: schedule[month],
      total: schedule[month].reduce((sum, item) => sum + item.cost, 0),
    }));
  };

  const getDeadlineTracker = () => {
    return records
      .map(record => ({
        ...record,
        daysUntilExpiry: getDaysUntilExpiry(record.expiryDate),
      }))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const getStatusBadge = (daysUntilExpiry) => {
    if (daysUntilExpiry < 0) {
      return { text: 'Quá hạn', color: 'bg-red-100 text-red-800 border-red-300' };
    } else if (daysUntilExpiry <= 7) {
      return { text: 'Sắp tới', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    } else if (daysUntilExpiry <= 30) {
      return { text: 'Trong tháng', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    }
    return { text: 'Bình thường', color: 'bg-green-100 text-green-800 border-green-300' };
  };

  const summaryStats = {
    totalCustomers: [...new Set(records.map(r => r.customerName))].length,
    totalLLCs: records.length,
    thisMonth: generatePaymentSchedule().find(s => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return s.month === currentMonth;
    })?.total || 0,
    overdue: records.filter(r => getDaysUntilExpiry(r.expiryDate) < 0).length,
    dueSoon: records.filter(r => {
      const days = getDaysUntilExpiry(r.expiryDate);
      return days >= 0 && days <= 7;
    }).length,
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateFull = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // ===== EMAIL TEMPLATE GENERATOR =====
  const generateEmailContent = (record) => {
    const dayToExpiry = getDaysUntilExpiry(record.expiryDate);
    const monthlyServices = [record.services.vo && 'VO ($29)', record.services.phone && 'Phone ($9)'].filter(Boolean).join(' + ');
    
    let subject = '';
    let body = '';

    if (dayToExpiry < 0) {
      subject = `[URGENT] Gia hạn dịch vụ - ${record.llcName} (Quá hạn ${Math.abs(dayToExpiry)} ngày)`;
      body = `Kính gửi ${record.customerName},

Chúng tôi ghi nhận rằng dịch vụ của ${record.llcName} đã quá hạn gia hạn từ ngày ${formatDateFull(record.expiryDate)}.

📌 CHI TIẾT THANH TOÁN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tên LLC: ${record.llcName}
• Dịch vụ: ${monthlyServices}
• Chi phí: $${record.monthlyCost}/tháng
• Ngày hết hạn: ${formatDateFull(record.expiryDate)}
• Trạng thái: ⚠️ QUADEFER HẠN (${Math.abs(dayToExpiry)} ngày)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vui lòng liên hệ ngay để gia hạn dịch vụ và tránh gián đoạn.

Cảm ơn!
SM VO_Columbus 2026`;
    } else if (dayToExpiry <= 7) {
      subject = `Gia hạn dịch vụ - ${record.llcName} (Còn ${dayToExpiry} ngày)`;
      body = `Kính gửi ${record.customerName},

Dịch vụ của ${record.llcName} sẽ hết hạn vào ngày ${formatDateFull(record.expiryDate)} (còn ${dayToExpiry} ngày).

📌 CHI TIẾT THANH TOÁN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tên LLC: ${record.llcName}
• Dịch vụ: ${monthlyServices}
• Chi phí: $${record.monthlyCost}/tháng
• Ngày hết hạn: ${formatDateFull(record.expiryDate)}
• Số ngày còn lại: ${dayToExpiry} ngày
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vui lòng liên hệ chúng tôi để gia hạn dịch vụ trước ngày hết hạn.

Cảm ơn!
SM VO_Columbus 2026`;
    } else {
      subject = `Gia hạn dịch vụ - ${record.llcName} (Thông báo tháng trước)`;
      body = `Kính gửi ${record.customerName},

Chúng tôi muốn nhắc nhở rằng dịch vụ của ${record.llcName} sẽ hết hạn vào ngày ${formatDateFull(record.expiryDate)}.

📌 CHI TIẾT THANH TOÁN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tên LLC: ${record.llcName}
• Dịch vụ: ${monthlyServices}
• Chi phí: $${record.monthlyCost}/tháng
• Ngày hết hạn: ${formatDateFull(record.expiryDate)}
• Số ngày còn lại: ${dayToExpiry} ngày
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nếu quý khách muốn gia hạn, vui lòng liên hệ chúng tôi sớm.

Cảm ơn!
SM VO_Columbus 2026`;
    }

    return { subject, body };
  };

  // ===== PDF EXPORT FUNCTION =====
  const exportToPDF = () => {
    const schedule = generatePaymentSchedule();
    let pdfContent = `SM VO_Columbus 2026 - Payment Schedule Report\n`;
    pdfContent += `Generated: ${new Date().toLocaleDateString('vi-VN')}\n`;
    pdfContent += `\n${'='.repeat(80)}\n\n`;

    schedule.forEach(month => {
      pdfContent += `Month: ${month.month} | Total: $${month.total}\n`;
      pdfContent += `${'-'.repeat(80)}\n`;
      month.items.forEach(item => {
        pdfContent += `LLC: ${item.llcName}\n`;
        pdfContent += `Customer: ${item.customerName}\n`;
        pdfContent += `Services: ${[item.services.vo && 'VO ($29)', item.services.phone && 'Phone ($9)'].filter(Boolean).join(' + ')}\n`;
        pdfContent += `Cost: $${item.cost}\n`;
        pdfContent += `Expiry: ${formatDate(item.expiryDate)}\n`;
        pdfContent += `Contact: ${item.phone || 'N/A'}\n\n`;
      });
      pdfContent += `\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(pdfContent));
    element.setAttribute('download', `SM-VO-Columbus-PaymentSchedule-${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportAllDataJSON = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
    element.setAttribute('download', `SM-VO-Columbus-Backup-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                SM VO_Columbus 2026
              </h1>
              <p className="text-sm text-slate-500 mt-1">Payment & Deadline Management System</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <Plus size={18} /> Thêm
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md cursor-pointer">
                <Upload size={18} /> Import
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
              <button
                onClick={exportAllDataJSON}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
              >
                <Download size={18} /> Backup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Tổng quan
          </button>
          <button
            onClick={() => setCurrentTab('schedule')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 Lịch thanh toán
          </button>
          <button
            onClick={() => setCurrentTab('deadline')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'deadline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏰ Deadline tracker
          </button>
          <button
            onClick={() => setCurrentTab('data')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              currentTab === 'data'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Quản lý dữ liệu
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Thêm dữ liệu mới</h2>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên LLC</label>
                <input
                  type="text"
                  value={formData.llcName}
                  onChange={(e) => setFormData({...formData, llcName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dịch vụ</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.services.vo}
                      onChange={(e) => setFormData({
                        ...formData,
                        services: {...formData.services, vo: e.target.checked}
                      })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">VO ($29)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.services.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        services: {...formData.services, phone: e.target.checked}
                      })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Phone ($9)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số tháng thuê</label>
                <select
                  value={formData.months}
                  onChange={(e) => setFormData({...formData, months: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3 tháng</option>
                  <option value={6}>6 tháng</option>
                  <option value={12}>12 tháng</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ LLC</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {showEmailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">✉️ Email Reminder - {selectedRecord.llcName}</h2>
            {(() => {
              const { subject, body } = generateEmailContent(selectedRecord);
              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject:</label>
                    <div className="bg-slate-100 p-3 rounded border border-slate-300 text-slate-900 font-mono text-sm break-words">
                      {subject}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(subject);
                        alert('✅ Copied to clipboard!');
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋 Copy subject
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Body:</label>
                    <textarea
                      value={body}
                      readOnly
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                      rows="12"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(body);
                        alert('✅ Nội dung được copy!');
                      }}
                      className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      📋 Copy nội dung email
                    </button>
                  </div>

                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    Đóng
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-slate-600 mb-1">Khách hàng</p>
                <p className="text-3xl font-bold text-slate-900">{summaryStats.totalCustomers}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-slate-600 mb-1">Tổng LLC</p>
                <p className="text-3xl font-bold text-slate-900">{summaryStats.totalLLCs}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-slate-600 mb-1">Thanh toán tháng này</p>
                <p className="text-3xl font-bold text-green-600">${summaryStats.thisMonth}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-red-600 mb-1">Quá hạn</p>
                <p className="text-3xl font-bold text-red-600">{summaryStats.overdue}</p>
              </div>
              <div className="bg-white rounded-lg border border-orange-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-orange-600 mb-1">Sắp tới (≤7 ngày)</p>
                <p className="text-3xl font-bold text-orange-600">{summaryStats.dueSoon}</p>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md font-medium"
              >
                <FileText size={18} /> Export Report
              </button>
            </div>

            {/* Next 3 months projection */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} /> Dự báo 3 tháng tới
              </h3>
              <div className="space-y-2">
                {generatePaymentSchedule().slice(0, 3).map((item) => (
                  <div key={item.month} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-900">
                      Tháng {item.month.split('-')[1]}/{item.month.split('-')[0]}
                    </span>
                    <span className="text-lg font-bold text-blue-600">${item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment Schedule Tab */}
        {currentTab === 'schedule' && (
          <div className="space-y-4">
            {generatePaymentSchedule().length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                <p className="text-slate-600">Chưa có dữ liệu. Vui lòng thêm dữ liệu mới.</p>
              </div>
            ) : (
              generatePaymentSchedule().map((month) => (
                <div key={month.month} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">Tháng {month.month.split('-')[1]}/{month.month.split('-')[0]}</h3>
                      <span className="text-2xl font-bold">${month.total}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {month.items.map((item, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{item.llcName}</p>
                            <p className="text-sm text-slate-600 mt-1">Khách hàng: {item.customerName}</p>
                            <p className="text-sm text-slate-600">Dịch vụ: {[item.services.vo && 'VO ($29)', item.services.phone && 'Phone ($9)'].filter(Boolean).join(' + ')}</p>
                            <p className="text-xs text-slate-500 mt-1">Đến hạn: {formatDate(item.expiryDate)}</p>
                          </div>
                          <span className="text-lg font-bold text-slate-900 ml-4">${item.cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Deadline Tracker Tab */}
        {currentTab === 'deadline' && (
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                <p className="text-slate-600">Chưa có dữ liệu. Vui lòng thêm dữ liệu mới.</p>
              </div>
            ) : (
              getDeadlineTracker().map((record) => {
                const status = getStatusBadge(record.daysUntilExpiry);
                const daysText = record.daysUntilExpiry < 0 
                  ? `${Math.abs(record.daysUntilExpiry)} ngày` 
                  : `${record.daysUntilExpiry} ngày`;
                
                return (
                  <div key={record.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="font-bold text-slate-900">{record.llcName}</h4>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">Khách hàng: {record.customerName}</p>
                        {record.address && (
                          <p className="text-sm text-slate-600 mt-1">📍 {record.address}</p>
                        )}
                        {record.phone && (
                          <p className="text-sm text-slate-600">☎️ {record.phone}</p>
                        )}
                        <div className="flex gap-6 mt-2 text-sm flex-wrap">
                          <span className="text-slate-600">
                            <span className="font-semibold">Ngày đến hạn:</span> {formatDate(record.expiryDate)}
                          </span>
                          <span className={`font-semibold ${record.daysUntilExpiry < 0 ? 'text-red-600' : record.daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                            {record.daysUntilExpiry < 0 ? '❌ Quá hạn ' : '⏰ Còn '}{daysText}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowEmailModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded"
                          title="Generate email reminder"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Data Management Tab */}
        {currentTab === 'data' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {records.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-600">Chưa có dữ liệu. Vui lòng thêm dữ liệu mới.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Khách hàng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">LLC</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Dịch vụ</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Ngày bắt đầu</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Đến hạn</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Chi phí/tháng</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-900">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900">{record.customerName}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{record.llcName}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {[record.services.vo && 'VO', record.services.phone && 'Phone'].filter(Boolean).join(' + ')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(record.startDate)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(record.expiryDate)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">${record.monthlyCost}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-500 hover:text-red-700 transition-colors hover:bg-red-50 p-2 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}