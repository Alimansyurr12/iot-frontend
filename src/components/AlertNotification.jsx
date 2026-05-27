function AlertNotification({ notification, onClose }) {
  if (!notification?.message) return null

  const isSuccess = notification.type === 'success'
  const isError = notification.type === 'error'
  const isWarning = notification.type === 'warning'

  const containerStyle = {
    ...toastStyle,
    ...(isSuccess ? successStyle : {}),
    ...(isError ? errorStyle : {}),
    ...(isWarning ? warningStyle : {}),
  }

  const title = isSuccess ? 'Berhasil' : isWarning ? 'Perhatian' : 'Gagal'

  return (
    <div style={wrapperStyle}>
      <div style={containerStyle} role="alert" aria-live="assertive">
        <div style={messageWrapperStyle}>
          <strong style={titleStyle}>{title}</strong>
          <span style={messageStyle}>{notification.message}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={closeButtonStyle}
          aria-label="Tutup notifikasi"
        >
          ×
        </button>
      </div>
    </div>
  )
}

const wrapperStyle = {
  position: 'fixed',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 9999,
  pointerEvents: 'none',
  padding: '0 16px',
  boxSizing: 'border-box',
}

const toastStyle = {
  width: '100%',
  maxWidth: '420px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '14px 16px',
  borderRadius: '14px',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.18)',
  border: '1px solid transparent',
  fontFamily: 'Arial, sans-serif',
  pointerEvents: 'auto',
}

const successStyle = {
  background: '#ecfdf5',
  borderColor: '#86efac',
  color: '#14532d',
}

const errorStyle = {
  background: '#fef2f2',
  borderColor: '#fca5a5',
  color: '#7f1d1d',
}

const warningStyle = {
  background: '#fffbeb',
  borderColor: '#fcd34d',
  color: '#78350f',
}

const messageWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  lineHeight: 1.4,
  flex: 1,
  minWidth: 0,
}

const titleStyle = {
  fontSize: '14px',
  fontWeight: 'bold',
}

const messageStyle = {
  fontSize: '14px',
  wordBreak: 'break-word',
}

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '20px',
  lineHeight: 1,
  padding: 0,
  minWidth: '24px',
}

export default AlertNotification