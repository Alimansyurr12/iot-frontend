import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import AlertNotification from '../components/AlertNotification'
import MonitoringChart from '../components/MonitoringChart'

const ONLINE_TIMEOUT_MS = 30000

const DEFAULT_CONTROL = {
  heater: 'OFF',
  kipas: 'OFF',
  mode: 'Otomatis',
  min_temp: 27,
  max_temp: 29,
  hysteresis: 0.3,
  min_ph: 6.5,
  max_ph: 8.5,
}

function Dashboard() {
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [control, setControl] = useState(DEFAULT_CONTROL)
  const [settingsForm, setSettingsForm] = useState({
    min_temp: '27',
    max_temp: '29',
    hysteresis: '0.3',
    min_ph: '6.5',
    max_ph: '8.5',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingControl, setSendingControl] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [nowTime, setNowTime] = useState(Date.now())
  const [notification, setNotification] = useState(null)

  const previousEspStatusRef = useRef('UNKNOWN')

  useEffect(() => {
    fetchAllData()

    const dataInterval = setInterval(() => {
      fetchAllData(false)
    }, 5000)

    const clockInterval = setInterval(() => {
      setNowTime(Date.now())
    }, 1000)

    return () => {
      clearInterval(dataInterval)
      clearInterval(clockInterval)
    }
  }, [])

  useEffect(() => {
    if (!notification) return undefined

    const timeout = setTimeout(() => {
      setNotification(null)
    }, 3500)

    return () => clearTimeout(timeout)
  }, [notification])

  const showNotification = (type, message) => {
    setNotification({ type, message })
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('token')
    window.location.reload()
  }

  const fetchAllData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError('')

      const [latestRes, historyRes, controlRes] = await Promise.all([
        api.get('/sensor/latest'),
        api.get('/sensor/history?limit=50'),
        api.get('/control'),
      ])

      const latestData = latestRes?.data?.data || null
      const historyData = Array.isArray(historyRes?.data?.data)
        ? [...historyRes.data.data].reverse()
        : []

      const rawControl = controlRes?.data?.data || {}
      const controlData = {
        heater: rawControl.heater || 'OFF',
        kipas: rawControl.kipas || 'OFF',
        mode: rawControl.mode || 'Otomatis',
        min_temp: Number(rawControl.min_temp ?? DEFAULT_CONTROL.min_temp),
        max_temp: Number(rawControl.max_temp ?? DEFAULT_CONTROL.max_temp),
        hysteresis: Number(rawControl.hysteresis ?? DEFAULT_CONTROL.hysteresis),
        min_ph: Number(rawControl.min_ph ?? DEFAULT_CONTROL.min_ph),
        max_ph: Number(rawControl.max_ph ?? DEFAULT_CONTROL.max_ph),
      }

      setLatest(latestData)
      setHistory(historyData)
      setControl(controlData)
      setSettingsForm({
        min_temp: String(controlData.min_temp),
        max_temp: String(controlData.max_temp),
        hysteresis: String(controlData.hysteresis),
        min_ph: String(controlData.min_ph),
        max_ph: String(controlData.max_ph),
      })

      return { success: true }
    } catch (err) {
      console.error('Gagal mengambil data:', err)
      setError('Gagal mengambil data dari backend.')
      return { success: false }
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const getWaterCondition = (suhu) => {
    const suhuNumber = Number(suhu)
    const minSuhu = Number(control?.min_temp ?? DEFAULT_CONTROL.min_temp)
    const maxSuhu = Number(control?.max_temp ?? DEFAULT_CONTROL.max_temp)

    if (Number.isNaN(suhuNumber)) return '-'
    if (suhuNumber < minSuhu) return 'Di Bawah Batas'
    if (suhuNumber > maxSuhu) return 'Di Atas Batas'
    return 'Normal'
  }

  const getPHCondition = (ph) => {
    const phNumber = Number(ph)
    const minPH = Number(control?.min_ph ?? DEFAULT_CONTROL.min_ph)
    const maxPH = Number(control?.max_ph ?? DEFAULT_CONTROL.max_ph)

    if (Number.isNaN(phNumber)) return '-'
    if (phNumber < minPH) return 'Asam'
    if (phNumber > maxPH) return 'Basa'
    return 'Normal'
  }

  const getStatusColor = (condition) => {
    if (condition === 'Normal') return '#16a34a'
    if (condition === 'Di Bawah Batas') return '#2563eb'
    if (condition === 'Di Atas Batas') return '#dc2626'
    if (condition === 'Asam') return '#dc2626'
    if (condition === 'Basa') return '#ca8a04'
    return '#6b7280'
  }

  const formatDateTime = (value) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getEsp32Status = () => {
    if (!latest?.created_at) return 'OFFLINE'

    const lastTime = new Date(latest.created_at).getTime()
    if (Number.isNaN(lastTime)) return 'OFFLINE'

    return nowTime - lastTime < ONLINE_TIMEOUT_MS ? 'ONLINE' : 'OFFLINE'
  }

  const espStatus = getEsp32Status()
  const esp32Online = espStatus === 'ONLINE'

  useEffect(() => {
    const previousStatus = previousEspStatusRef.current

    if (previousStatus !== 'UNKNOWN' && previousStatus !== espStatus) {
      if (espStatus === 'ONLINE') {
        showNotification('success', 'ESP32 kembali online dan mengirim data sensor.')
      }

      if (espStatus === 'OFFLINE') {
        showNotification('error', 'ESP32 offline. Data sensor tidak diterima dalam 30 detik terakhir.')
      }
    }

    previousEspStatusRef.current = espStatus
  }, [espStatus])

  const getBackendMessage = (err, fallbackMessage) => {
    return err?.response?.data?.message || fallbackMessage
  }

  const ensureEsp32Online = (actionName) => {
    if (esp32Online) return true

    showNotification(
      'error',
      `Gagal ${actionName}. ESP32 sedang offline, sehingga perubahan tidak dapat dikirim ke backend.`
    )

    return false
  }

  const syncAfterAction = async (successMessage) => {
    const syncResult = await fetchAllData(false)

    if (!syncResult.success) {
      showNotification(
        'error',
        `${successMessage}, tetapi gagal sinkron ulang data dari backend.`
      )
      return
    }

    showNotification('success', `${successMessage} dan tersinkron dengan backend.`)
  }

  const sendControl = async (
    heater,
    kipas,
    mode = 'Manual',
    actionName = 'mengirim perintah kontrol'
  ) => {
    if (!ensureEsp32Online(actionName)) return

    try {
      setSendingControl(true)

      const response = await api.post('/control', {
        heater,
        kipas,
        mode,
      })

      if (!response.data?.success) {
        showNotification('error', response.data?.message || `Gagal ${actionName}.`)
        return
      }

      await syncAfterAction(`Berhasil ${actionName}`)
    } catch (err) {
      console.error(`Gagal ${actionName}:`, err)
      showNotification('error', getBackendMessage(err, `Gagal ${actionName}.`))
    } finally {
      setSendingControl(false)
    }
  }

  const setAutoMode = async () => {
    const actionName = 'mengaktifkan mode otomatis'

    if (!ensureEsp32Online(actionName)) return

    try {
      setSendingControl(true)

      const response = await api.post('/control', {
        mode: 'Otomatis',
      })

      if (!response.data?.success) {
        showNotification('error', response.data?.message || `Gagal ${actionName}.`)
        return
      }

      await syncAfterAction(`Berhasil ${actionName}`)
    } catch (err) {
      console.error(`Gagal ${actionName}:`, err)
      showNotification('error', getBackendMessage(err, `Gagal ${actionName}.`))
    } finally {
      setSendingControl(false)
    }
  }

  const handleSettingsInput = (event) => {
    const { name, value } = event.target

    setSettingsForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const getSettingsActionName = () => {
    const changedActions = []

    const minTempChanged = Number(settingsForm.min_temp) !== Number(control.min_temp)
    const maxTempChanged = Number(settingsForm.max_temp) !== Number(control.max_temp)
    const hysteresisChanged = Number(settingsForm.hysteresis) !== Number(control.hysteresis)
    const minPHChanged = Number(settingsForm.min_ph) !== Number(control.min_ph)
    const maxPHChanged = Number(settingsForm.max_ph) !== Number(control.max_ph)

    if (minTempChanged && maxTempChanged) {
      changedActions.push('mengubah batas suhu minimum dan maksimum')
    } else if (minTempChanged) {
      changedActions.push('mengubah batas suhu minimum')
    } else if (maxTempChanged) {
      changedActions.push('mengubah batas suhu maksimum')
    }

    if (hysteresisChanged) {
      changedActions.push('mengubah hysteresis suhu')
    }

    if (minPHChanged && maxPHChanged) {
      changedActions.push('mengubah batas pH minimum dan maksimum')
    } else if (minPHChanged) {
      changedActions.push('mengubah batas pH minimum')
    } else if (maxPHChanged) {
      changedActions.push('mengubah batas pH maksimum')
    }

    if (changedActions.length === 0) {
      return 'menyimpan pengaturan'
    }

    return changedActions.join(', ')
  }

  const saveSettings = async (event) => {
    event.preventDefault()

    const actionName = getSettingsActionName()

    if (!ensureEsp32Online(actionName)) return

    const minTemp = Number(settingsForm.min_temp)
    const maxTemp = Number(settingsForm.max_temp)
    const hysteresis = Number(settingsForm.hysteresis)
    const minPH = Number(settingsForm.min_ph)
    const maxPH = Number(settingsForm.max_ph)

    if (
      !Number.isFinite(minTemp) ||
      !Number.isFinite(maxTemp) ||
      !Number.isFinite(hysteresis) ||
      !Number.isFinite(minPH) ||
      !Number.isFinite(maxPH)
    ) {
      showNotification('error', `Gagal ${actionName}. Semua nilai pengaturan harus berupa angka.`)
      return
    }

    if (minTemp >= maxTemp) {
      showNotification(
        'error',
        `Gagal ${actionName}. Batas suhu minimum harus lebih kecil dari batas suhu maksimum.`
      )
      return
    }

    if (minTemp < 0 || maxTemp > 100) {
      showNotification(
        'error',
        `Gagal ${actionName}. Rentang suhu harus berada di antara 0 sampai 100 °C.`
      )
      return
    }

    if (hysteresis < 0 || hysteresis > 10) {
      showNotification(
        'error',
        `Gagal ${actionName}. Nilai hysteresis harus berada di antara 0 sampai 10.`
      )
      return
    }

    if (minPH >= maxPH) {
      showNotification(
        'error',
        `Gagal ${actionName}. Batas pH minimum harus lebih kecil dari batas pH maksimum.`
      )
      return
    }

    if (minPH < 0 || maxPH > 14) {
      showNotification(
        'error',
        `Gagal ${actionName}. Rentang pH harus berada di antara 0 sampai 14.`
      )
      return
    }

    try {
      setSavingSettings(true)

      const response = await api.post('/control', {
        min_temp: minTemp,
        max_temp: maxTemp,
        hysteresis,
        min_ph: minPH,
        max_ph: maxPH,
      })

      if (!response.data?.success) {
        showNotification('error', response.data?.message || `Gagal ${actionName}.`)
        return
      }

      await syncAfterAction(`Berhasil ${actionName}`)
    } catch (err) {
      console.error(`Gagal ${actionName}:`, err)
      showNotification('error', getBackendMessage(err, `Gagal ${actionName}.`))
    } finally {
      setSavingSettings(false)
    }
  }

  const labels = useMemo(
    () =>
      history.map((item) =>
        new Date(item.created_at).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      ),
    [history]
  )

  const suhuData = useMemo(
    () => history.map((item) => Number(item.suhu)),
    [history]
  )

  const phData = useMemo(
    () => history.map((item) => Number(item.ph)),
    [history]
  )

  const kondisiAir = latest ? getWaterCondition(latest.suhu) : '-'
  const kondisiPH = latest?.ph_status || (latest ? getPHCondition(latest.ph) : '-')
  const actionDisabled = sendingControl || savingSettings

  return (
    <div style={pageStyle}>
      <AlertNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Dashboard Monitoring IoT</h1>
            <p style={subtitleStyle}>
              Sistem Monitoring pH dan Stabilisasi Suhu Air Pembibitan Ikan Patin
            </p>
          </div>

          <div style={headerButtonGroupStyle}>
            <button style={refreshButtonStyle} onClick={() => fetchAllData(true)}>
              Refresh Data
            </button>

            <button style={logoutButtonStyle} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {loading && <div style={infoBoxStyle}>Memuat data...</div>}
        {error && <div style={errorBoxStyle}>{error}</div>}

        <div style={gridFourStyle}>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Suhu Air</h3>
            <h2 style={cardValueStyle}>{latest ? `${latest.suhu} °C` : '-'}</h2>
            <p style={cardDescStyle}>Realtime dari sensor suhu</p>
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>pH Air</h3>
            <h2 style={cardValueStyle}>{latest ? latest.ph : '-'}</h2>
            <p style={{ ...cardDescStyle, color: getStatusColor(kondisiPH), fontWeight: 'bold' }}>
              Status pH: {kondisiPH}
            </p>
            <p style={cardDescStyle}>
              Normal: {Number(control.min_ph).toFixed(1)} - {Number(control.max_ph).toFixed(1)}
            </p>
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Mode Sistem</h3>
            <h2 style={cardValueStyle}>{control?.mode || latest?.mode_kontrol || '-'}</h2>
            <p style={cardDescStyle}>Mode kontrol perangkat</p>
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Kondisi Suhu</h3>
            <h2 style={{ ...cardValueStyle, color: getStatusColor(kondisiAir) }}>
              {kondisiAir}
            </h2>
            <p style={cardDescStyle}>
              Update: {latest ? formatDateTime(latest.created_at) : '-'}
            </p>
          </div>
        </div>

        <div style={gridThreeStyle}>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Status ESP32</h3>
            <h2
              style={{
                ...cardValueStyle,
                color: esp32Online ? '#16a34a' : '#dc2626',
              }}
            >
              {espStatus}
            </h2>
            <p style={cardDescStyle}>
              {esp32Online
                ? 'Perangkat aktif mengirim data'
                : 'Perangkat tidak mengirim data'}
            </p>
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Status Heater</h3>
            <h2 style={cardValueStyle}>{latest?.heater_status || control?.heater || 'OFF'}</h2>
            <p style={cardDescStyle}>Aktuator pemanas air</p>
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Status Kipas</h3>
            <h2 style={cardValueStyle}>{latest?.kipas_status || control?.kipas || 'OFF'}</h2>
            <p style={cardDescStyle}>Aktuator pendingin</p>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Pengaturan Sistem</h3>
          <p style={cardDescStyle}>
            Suhu digunakan untuk kontrol otomatis heater dan kipas. pH hanya digunakan untuk status Asam, Normal, atau Basa.
          </p>

          <form onSubmit={saveSettings}>
            <div style={settingsGridStyle}>
              <div>
                <label style={labelStyle} htmlFor="min_temp">
                  Batas Suhu Minimum (°C)
                </label>
                <input
                  id="min_temp"
                  name="min_temp"
                  type="number"
                  step="0.1"
                  value={settingsForm.min_temp}
                  onChange={handleSettingsInput}
                  style={inputStyle}
                  disabled={savingSettings}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="max_temp">
                  Batas Suhu Maksimum (°C)
                </label>
                <input
                  id="max_temp"
                  name="max_temp"
                  type="number"
                  step="0.1"
                  value={settingsForm.max_temp}
                  onChange={handleSettingsInput}
                  style={inputStyle}
                  disabled={savingSettings}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="hysteresis">
                  Hysteresis Suhu
                </label>
                <input
                  id="hysteresis"
                  name="hysteresis"
                  type="number"
                  step="0.1"
                  value={settingsForm.hysteresis}
                  onChange={handleSettingsInput}
                  style={inputStyle}
                  disabled={savingSettings}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="min_ph">
                  Batas pH Minimum
                </label>
                <input
                  id="min_ph"
                  name="min_ph"
                  type="number"
                  step="0.1"
                  value={settingsForm.min_ph}
                  onChange={handleSettingsInput}
                  style={inputStyle}
                  disabled={savingSettings}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="max_ph">
                  Batas pH Maksimum
                </label>
                <input
                  id="max_ph"
                  name="max_ph"
                  type="number"
                  step="0.1"
                  value={settingsForm.max_ph}
                  onChange={handleSettingsInput}
                  style={inputStyle}
                  disabled={savingSettings}
                />
              </div>
            </div>

            <div style={settingsInfoGridStyle}>
              <div style={settingsInfoItemStyle}>
                <span style={settingsInfoLabelStyle}>Suhu minimum aktif</span>
                <strong>{Number(control.min_temp).toFixed(1)} °C</strong>
              </div>
              <div style={settingsInfoItemStyle}>
                <span style={settingsInfoLabelStyle}>Suhu maksimum aktif</span>
                <strong>{Number(control.max_temp).toFixed(1)} °C</strong>
              </div>
              <div style={settingsInfoItemStyle}>
                <span style={settingsInfoLabelStyle}>Hysteresis aktif</span>
                <strong>{Number(control.hysteresis).toFixed(1)}</strong>
              </div>
              <div style={settingsInfoItemStyle}>
                <span style={settingsInfoLabelStyle}>pH normal aktif</span>
                <strong>
                  {Number(control.min_ph).toFixed(1)} - {Number(control.max_ph).toFixed(1)}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              style={getButtonStyle(saveButtonStyle, savingSettings)}
              disabled={savingSettings}
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Kontrol Manual</h3>
          <p style={cardDescStyle}>
            Kontrol ini hanya untuk heater dan kipas. Sensor pH tetap monitoring saja.
          </p>

          <div style={buttonGroupStyle}>
            <button
              style={getButtonStyle(primaryButtonStyle, actionDisabled)}
              disabled={actionDisabled}
              onClick={() => sendControl('ON', 'OFF', 'Manual', 'menyalakan heater')}
            >
              Heater ON
            </button>

            <button
              style={getButtonStyle(secondaryButtonStyle, actionDisabled)}
              disabled={actionDisabled}
              onClick={() => sendControl('OFF', 'ON', 'Manual', 'menyalakan kipas')}
            >
              Kipas ON
            </button>

            <button
              style={getButtonStyle(dangerButtonStyle, actionDisabled)}
              disabled={actionDisabled}
              onClick={() => sendControl('OFF', 'OFF', 'Manual', 'mematikan heater dan kipas')}
            >
              Semua OFF
            </button>

            <button
              style={getButtonStyle(successButtonStyle, actionDisabled)}
              disabled={actionDisabled}
              onClick={setAutoMode}
            >
              Mode Otomatis
            </button>
          </div>
        </div>

        <div style={gridTwoStyle}>
          <MonitoringChart
            title="Grafik Suhu Air"
            labels={labels.length ? labels : ['Belum ada data']}
            dataValues={suhuData.length ? suhuData : [0]}
            label="Suhu (°C)"
            borderColor="rgb(255, 99, 132)"
          />

          <MonitoringChart
            title="Grafik pH Air"
            labels={labels.length ? labels : ['Belum ada data']}
            dataValues={phData.length ? phData : [0]}
            label="pH Air"
            borderColor="rgb(54, 162, 235)"
          />
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Riwayat Monitoring</h3>

          {history.length === 0 ? (
            <p style={cardDescStyle}>Belum ada data histori.</p>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>No</th>
                    <th style={thStyle}>Waktu</th>
                    <th style={thStyle}>Suhu</th>
                    <th style={thStyle}>Kondisi Suhu</th>
                    <th style={thStyle}>pH</th>
                    <th style={thStyle}>Status pH</th>
                    <th style={thStyle}>Heater</th>
                    <th style={thStyle}>Kipas</th>
                    <th style={thStyle}>Mode</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item, index) => {
                    const suhuStatus = getWaterCondition(item.suhu)
                    const phStatus = item.ph_status || getPHCondition(item.ph)

                    return (
                      <tr key={item.id || index}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>{formatDateTime(item.created_at)}</td>
                        <td style={tdStyle}>{item.suhu} °C</td>
                        <td style={{ ...tdStyle, color: getStatusColor(suhuStatus), fontWeight: 'bold' }}>
                          {suhuStatus}
                        </td>
                        <td style={tdStyle}>{item.ph}</td>
                        <td style={{ ...tdStyle, color: getStatusColor(phStatus), fontWeight: 'bold' }}>
                          {phStatus}
                        </td>
                        <td style={tdStyle}>{item.heater_status}</td>
                        <td style={tdStyle}>{item.kipas_status}</td>
                        <td style={tdStyle}>{item.mode_kontrol}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const getButtonStyle = (style, disabled) => ({
  ...style,
  ...(disabled ? disabledButtonStyle : {}),
})

const pageStyle = {
  minHeight: '100vh',
  background: '#f5f7fb',
  padding: '24px',
  fontFamily: 'Arial, sans-serif',
}

const containerStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
  marginBottom: '24px',
}

const headerButtonGroupStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const titleStyle = {
  margin: 0,
  fontSize: '32px',
  color: '#1f2937',
}

const subtitleStyle = {
  marginTop: '8px',
  marginBottom: 0,
  color: '#6b7280',
}

const refreshButtonStyle = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
}

const logoutButtonStyle = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
}

const infoBoxStyle = {
  background: '#e0f2fe',
  color: '#075985',
  padding: '12px 16px',
  borderRadius: '10px',
  marginBottom: '16px',
}

const errorBoxStyle = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '12px 16px',
  borderRadius: '10px',
  marginBottom: '16px',
}

const gridFourStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
}

const gridThreeStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
}

const gridTwoStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
}

const settingsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginTop: '16px',
}

const settingsInfoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginTop: '16px',
  marginBottom: '16px',
}

const settingsInfoItemStyle = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const settingsInfoLabelStyle = {
  color: '#6b7280',
  fontSize: '13px',
}

const cardStyle = {
  background: '#fff',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  marginBottom: '24px',
}

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: '12px',
  color: '#374151',
}

const cardValueStyle = {
  margin: 0,
  fontSize: '28px',
  color: '#111827',
}

const cardDescStyle = {
  marginTop: '8px',
  color: '#6b7280',
}

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#374151',
  fontWeight: 'bold',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  outline: 'none',
  boxSizing: 'border-box',
}

const buttonGroupStyle = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  marginTop: '16px',
}

const baseButtonStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
  color: '#fff',
}

const disabledButtonStyle = {
  opacity: 0.55,
  cursor: 'not-allowed',
}

const primaryButtonStyle = {
  ...baseButtonStyle,
  background: '#f59e0b',
}

const secondaryButtonStyle = {
  ...baseButtonStyle,
  background: '#3b82f6',
}

const dangerButtonStyle = {
  ...baseButtonStyle,
  background: '#ef4444',
}

const successButtonStyle = {
  ...baseButtonStyle,
  background: '#16a34a',
}

const saveButtonStyle = {
  ...baseButtonStyle,
  background: '#2563eb',
}

const tableWrapperStyle = {
  overflowX: 'auto',
  marginTop: '12px',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
}

const thStyle = {
  textAlign: 'left',
  padding: '12px',
  background: '#f3f4f6',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
}

const tdStyle = {
  padding: '12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
}

export default Dashboard