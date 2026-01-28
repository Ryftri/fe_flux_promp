<script setup>
import { ref, computed } from 'vue'
import workflowTemplate from './workflow_api.json'

const serverIp = ref('192.168.1.20')
const serverPort = '8188'
const isLocked = ref(false)

const fullComfyUrl = computed(() => `http://${serverIp.value}:${serverPort}`)

const promptInput = ref(
  'A photograph of a woman holding up a wooden picture frame, obscuring her face, standing in a field of wildflowers at sunset...',
)
const negativeInput = ref(
  'text, watermark, writing, letters, words, logo, signature, brand name, frame mockup, blurry, low quality, rough texture',
)

// -- State Resolusi Canvas --
const width = ref(1024)
const height = ref(1024)

const status = ref('Idle')
const generatedImage = ref(null)

// -- FITUR BARU: Timer State --
const executionTime = ref('0.0')
let timerInterval = null
let startTime = 0

const toggleLock = () => {
  if (!serverIp.value.trim()) {
    alert('Silakan masukkan IP Address terlebih dahulu!')
    return
  }
  isLocked.value = !isLocked.value
}

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  startTime = Date.now()
  executionTime.value = '0.0'
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    executionTime.value = elapsed.toFixed(1)
  }, 100)
}

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
}

const generateImage = async () => {
  if (!isLocked.value) {
    alert('Mohon kunci (Lock) konfigurasi IP Server terlebih dahulu di pojok kanan atas.')
    return
  }

  if (status.value === 'Processing...') return

  status.value = 'Processing...'
  generatedImage.value = null

  // Mulai penghitung waktu
  startTimer()

  const payload = JSON.parse(JSON.stringify(workflowTemplate))

  // Inject ukuran canvas ke Node 41
  if (payload['41']) {
    payload['41']['inputs']['width'] = parseInt(width.value)
    payload['41']['inputs']['height'] = parseInt(height.value)
  }

  if (payload['45']) payload['45']['inputs']['text'] = promptInput.value
  if (payload['70']) payload['70']['inputs']['text'] = negativeInput.value
  if (payload['44']) payload['44']['inputs']['seed'] = Math.floor(Math.random() * 100000000000000)

  try {
    const response = await fetch(`${fullComfyUrl.value}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: payload }),
    })

    if (!response.ok) throw new Error('Gagal mengirim prompt. Periksa IP/Koneksi.')

    const data = await response.json()
    const promptId = data.prompt_id

    const checkStatus = setInterval(async () => {
      try {
        const res = await fetch(`${fullComfyUrl.value}/history/${promptId}`)
        const historyData = await res.json()

        if (historyData[promptId]) {
          clearInterval(checkStatus)
          stopTimer() // Hentikan timer saat selesai
          status.value = 'Idle'

          const outputs = historyData[promptId].outputs
          if (outputs['9'] && outputs['9'].images.length > 0) {
            const imgInfo = outputs['9'].images[0]
            generatedImage.value = `${fullComfyUrl.value}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`
          }
        }
      } catch (e) {
        clearInterval(checkStatus)
        stopTimer()
        status.value = 'Error polling'
      }
    }, 1000)
  } catch (error) {
    stopTimer()
    status.value = `Error: ${error.message}`
  }
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="brand-title">ComfyUI <span class="brand-pro">PRO</span></h1>
        <span class="version-tag">v1.2</span>
      </div>

      <div class="sidebar-content">
        <div class="input-group">
          <label class="label-heading positive">
            <span class="dot green"></span> Positive Prompt
          </label>
          <textarea
            v-model="promptInput"
            class="text-input prompt-area"
            placeholder="Describe what you want to see..."
          ></textarea>
        </div>

        <div class="input-group">
          <label class="label-heading negative">
            <span class="dot red"></span> Negative Prompt
          </label>
          <textarea
            v-model="negativeInput"
            class="text-input negative-area"
            placeholder="Describe what you want to avoid..."
          ></textarea>
        </div>

        <div class="input-group">
          <label class="label-heading"> <span class="dot blue"></span> Canvas Size </label>
          <div class="res-container">
            <div class="res-field">
              <span class="res-label">W</span>
              <input
                type="number"
                v-model="width"
                class="text-input res-input"
                step="64"
                min="256"
              />
            </div>
            <div class="res-separator">×</div>
            <div class="res-field">
              <span class="res-label">H</span>
              <input
                type="number"
                v-model="height"
                class="text-input res-input"
                step="64"
                min="256"
              />
            </div>
          </div>
        </div>

        <div
          v-if="status !== 'Idle' || executionTime !== '0.0'"
          class="status-indicator"
          :class="{ done: status === 'Idle' }"
        >
          <div v-if="status === 'Processing...'" class="spinner"></div>
          <span class="status-text">{{ status === 'Idle' ? 'Finished' : status }}</span>
          <span class="timer-display">{{ executionTime }}s</span>
        </div>
      </div>

      <div class="sidebar-footer">
        <button
          @click="generateImage"
          :disabled="status === 'Processing...'"
          class="btn-generate"
          :class="{ 'btn-loading': status === 'Processing...' }"
        >
          {{ status === 'Processing...' ? 'GENERATING...' : 'GENERATE IMAGE' }}
        </button>
      </div>
    </aside>

    <main class="main-canvas">
      <div class="canvas-header">
        <div class="connection-group">
          <span class="protocol-label">http://</span>
          <input
            type="text"
            v-model="serverIp"
            class="ip-input"
            :disabled="isLocked"
            placeholder="192.168.1.x"
          />
          <span class="port-label">:8188</span>
          <button
            @click="toggleLock"
            class="btn-lock"
            :class="{ locked: isLocked }"
            :title="isLocked ? 'Unlock IP' : 'Lock IP to use'"
          >
            <span v-if="isLocked">🔒 Locked</span>
            <span v-else>🔓 Edit</span>
          </button>
        </div>
      </div>

      <div class="canvas-viewport">
        <div v-if="!generatedImage" class="empty-state">
          <div class="empty-icon">🖼️</div>
          <h3>Ready to Create</h3>
          <p v-if="!isLocked" style="color: #e67e22">
            ⚠️ Please Lock the Server IP above to start.
          </p>
          <p v-else>Enter your prompt on the left and hit Generate.</p>
        </div>

        <div v-else class="image-wrapper">
          <img :src="generatedImage" alt="Generated Result" class="result-image" />
          <div class="image-actions">
            <a :href="generatedImage" target="_blank" class="btn-download">Open Full Size</a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --bg-dark: #0f1115;
  --bg-sidebar: #181b21;
  --bg-input: #22262e;
  --border-color: #2f333d;
  --text-main: #e0e0e0;
  --text-muted: #8a8d95;
  --accent-green: #27ae60;
  --accent-green-hover: #219150;
  --accent-red: #c0392b;
  --font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: var(--font-family);
  background-color: var(--bg-dark);
  color: var(--text-main);
  overflow: hidden;
}
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.sidebar {
  width: 380px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
}
.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand-title {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.brand-pro {
  color: var(--accent-green);
  font-size: 0.8em;
  background: rgba(39, 174, 96, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
.version-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
  background: var(--bg-input);
  padding: 2px 6px;
  border-radius: 4px;
}
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.label-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  color: var(--text-muted);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.green {
  background-color: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}
.dot.red {
  background-color: var(--accent-red);
}
.dot.blue {
  background-color: #3498db;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
}

/* Resolusi Styles */
.res-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
.res-field {
  position: relative;
  flex: 1;
}
.res-label {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: bold;
  pointer-events: none;
}
.res-input {
  padding-left: 30px !important;
  text-align: center;
  font-family: monospace;
}
.res-separator {
  color: var(--text-muted);
  font-weight: bold;
}

.text-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  padding: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: none;
  transition: 0.2s;
}
.text-input:focus {
  outline: none;
  border-color: var(--accent-green);
  box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
}
.prompt-area {
  height: 180px;
}
.negative-area {
  height: 100px;
}

/* Status Indicator Update */
.status-indicator {
  background: rgba(41, 128, 185, 0.15);
  border: 1px solid rgba(41, 128, 185, 0.3);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between; /* Pisahkan text dan timer */
  gap: 10px;
  font-size: 0.9rem;
  color: #3498db;
}
.status-indicator.done {
  background: rgba(39, 174, 96, 0.15);
  border-color: rgba(39, 174, 96, 0.3);
  color: var(--accent-green);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #3498db;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 5px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.timer-display {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.sidebar-footer {
  padding: 20px;
  background-color: var(--bg-sidebar);
  border-top: 1px solid var(--border-color);
}
.btn-generate {
  width: 100%;
  padding: 16px;
  background-color: var(--accent-green);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 1px;
  transition: 0.2s;
  box-shadow: 0 4px 10px rgba(39, 174, 96, 0.3);
}
.btn-generate:hover {
  background-color: var(--accent-green-hover);
  transform: translateY(-1px);
}
.btn-generate:active {
  transform: translateY(1px);
}
.btn-generate:disabled {
  background-color: var(--border-color);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.main-canvas {
  flex: 1;
  background-color: var(--bg-dark);
  display: flex;
  flex-direction: column;
  position: relative;
  background-image: radial-gradient(#2f333d 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-header {
  height: 60px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(15, 17, 21, 0.9);
  backdrop-filter: blur(5px);
}
.connection-group {
  display: flex;
  align-items: center;
  background: var(--bg-input);
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.protocol-label {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding-left: 8px;
}
.port-label {
  color: var(--text-muted);
  font-size: 0.9rem;
  padding-right: 8px;
}

.ip-input {
  background: transparent;
  border: none;
  color: #fff;
  width: 120px;
  font-family: monospace;
  font-size: 0.95rem;
  text-align: center;
}
.ip-input:focus {
  outline: none;
}
.ip-input:disabled {
  color: var(--accent-green);
  font-weight: bold;
}

.btn-lock {
  background: #2c3e50;
  border: none;
  color: #bdc3c7;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 5px;
  transition: 0.2s;
}
.btn-lock:hover {
  background: #34495e;
  color: white;
}
.btn-lock.locked {
  background: var(--accent-green);
  color: white;
}

.canvas-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow: hidden;
}
.empty-state {
  text-align: center;
  color: var(--text-muted);
  opacity: 0.8;
}
.empty-icon {
  font-size: 4rem;
  margin-bottom: 15px;
  filter: grayscale(1);
  opacity: 0.5;
}

.image-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}
.result-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}
.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}
.image-wrapper:hover .image-actions {
  opacity: 1;
}
.btn-download {
  background: white;
  color: black;
  padding: 8px 16px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-sidebar);
}
::-webkit-scrollbar-thumb {
  background: #3f4452;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555b6b;
}
</style>
