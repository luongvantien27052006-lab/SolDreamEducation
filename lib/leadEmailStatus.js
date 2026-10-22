'use strict';

// Shared presentation for the first render and subsequent authenticated updates.
function leadEmailStatus(lead) {
  const status = lead.email_status || 'unqueued';
  const labels = {
    sent: 'Đã gửi email cho trung tâm',
    failed: 'Gửi email chưa thành công',
    sending: 'Đang gửi email',
    pending: lead.email_attempts ? 'Đang chờ thử gửi lại' : 'Đang chờ gửi email',
    unqueued: 'Đăng ký cũ chưa xếp gửi email',
  };
  const date = lead.email_sent_at ? new Date(lead.email_sent_at) : null;
  return {
    status,
    label: labels[status] || 'Đang cập nhật trạng thái',
    recipient: lead.email_recipient || '',
    sentAt: date && Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '',
    error: lead.email_error || '',
    action: status === 'failed' ? 'Thử gửi lại' : status === 'unqueued' ? 'Gửi thông báo cho đăng ký cũ' : '',
    hotlineNotified: !!lead.notified,
    subscribed: !!lead.subscription_active,
  };
}

module.exports = { leadEmailStatus };
