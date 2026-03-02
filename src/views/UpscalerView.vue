<script setup>
import { ref, computed } from 'vue'
import upscaleTemplate from '../upscale_api.json'

const serverIp = ref('192.168.1.20')
const serverPort = '8188'
const isLocked = ref(false)

const fullComfyUrl = computed(() => `http://${serverIp.value}:${serverPort}`)

const status = ref('Idle')
const uploadedFile = ref(null)
const previewImage = ref(null)
const upscaledImage = ref(null)

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

// 1. Handle Pemilihan File Gambar Lokal
const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  uploadedFile.value = file
  previewImage.value = URL.createObjectURL(file) // Buat preview lokal
  upscaledImage.value = null // Reset hasil sebelumnya
}

// 2. Fungsi Utama: Upload -> Upscale
const runStandaloneUpscale = async () => {
  if (!isLocked.value) {
    alert('Mohon kunci (Lock) konfigurasi IP Server terlebih dahulu.')
    return
  }
  if (!uploadedFile.value) {
    alert('Silakan pilih gambar untuk di-upscale terlebih dahulu.')
    return
  }
  if (status.value !== 'Idle') return

  status.value = 'Uploading...'
  startTimer()

  try {
    // --- LANGKAH A: Upload gambar lokal ke ComfyUI Input Folder ---
    const formData = new FormData()
    // Beri nama unik agar tidak bentrok
    const safeFilename = `manual_up_${Date.now()}_${uploadedFile.value.name}`
    formData.append('image', uploadedFile.value, safeFilename)
    formData.append('overwrite', 'true')

    const uploadRes = await fetch(`${fullComfyUrl.value}/upload/image`, {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) throw new Error('Gagal mengunggah gambar ke server.')
    const uploadData = await uploadRes.json()
    const serverFilename = uploadData.name // Nama file yang diterima server

    // --- LANGKAH B: Kirim Payload Upscale ---
    status.value = 'Upscaling...'
    const payload = JSON.parse(JSON.stringify(upscaleTemplate))

    // Inject nama file ke Node LoadImage (136)
    if (payload['136']) {
      payload['136']['inputs']['image'] = serverFilename
    }
    // Randomize seed
    if (payload['51']) {
      payload['51']['inputs']['seed'] = Math.floor(Math.random() * 100000000000000)
    }

    const response = await fetch(`${fullComfyUrl.value}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: payload }),
    })

    if (!response.ok) throw new Error('Gagal mengirim prompt upscale.')
    const data = await response.json()
    const promptId = data.prompt_id

    // --- LANGKAH C: Polling Hasil ---
    const checkStatus = setInterval(async () => {
      try {
        const res = await fetch(`${fullComfyUrl.value}/history/${promptId}`)
        const historyData = await res.json()

        if (historyData[promptId]) {
          clearInterval(checkStatus)
          stopTimer()
          status.value = 'Idle'

          const outputs = historyData[promptId].outputs
          let imgInfo = null

          // Cari output di Node 142 (Atau Node SaveImage manapun)
          if (outputs['142'] && outputs['142'].images.length > 0) {
            imgInfo = outputs['142'].images[0]
          } else {
            for (const key of Object.keys(outputs)) {
              if (outputs[key].images && outputs[key].images.length > 0) {
                imgInfo = outputs[key].images[0]
                break
              }
            }
          }

          if (imgInfo) {
            upscaledImage.value = `${fullComfyUrl.value}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`
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
        <h1 class="brand-title">
          ComfyUI
          <span class="brand-pro" style="background: rgba(155, 89, 182, 0.2); color: #9b59b6"
            >UPSCALER</span
          >
        </h1>
      </div>

      <div class="sidebar-content">
        <div class="input-group">
          <label class="label-heading">
            <span class="dot" style="background: #9b59b6; box-shadow: 0 0 8px #9b59b6"></span>
            Select Source Image
          </label>
          <input type="file" @change="handleFileChange" accept="image/*" class="file-uploader" />
        </div>

        <div v-if="previewImage" class="preview-box">
          <label class="label-heading">Preview Input:</label>
          <img :src="previewImage" alt="Preview" class="preview-img" />
        </div>

        <div v-if="status !== 'Idle' || executionTime !== '0.0'" class="status-indicator">
          <div v-if="status === 'Upscaling...' || status === 'Uploading...'" class="spinner"></div>
          <span class="status-text">{{ status === 'Idle' ? 'Finished' : status }}</span>
          <span class="timer-display">{{ executionTime }}s</span>
        </div>
      </div>

      <div class="sidebar-footer">
        <button
          @click="runStandaloneUpscale"
          :disabled="status !== 'Idle' && status !== 'Error polling'"
          class="btn-generate btn-upscale"
          :class="{ 'btn-loading': status !== 'Idle' && status !== 'Error polling' }"
        >
          {{
            status !== 'Idle' && status !== 'Error polling' ? 'PROCESSING...' : '🚀 RUN UPSCALE 2x'
          }}
        </button>
      </div>
    </aside>

    <main class="main-canvas">
      <div class="canvas-header">
        <div class="connection-group">
          <span class="protocol-label">http://</span>
          <input type="text" v-model="serverIp" class="ip-input" :disabled="isLocked" />
          <span class="port-label">:8188</span>
          <button @click="toggleLock" class="btn-lock" :class="{ locked: isLocked }">
            <span v-if="isLocked">🔒 Locked</span><span v-else>🔓 Edit</span>
          </button>
        </div>
      </div>

      <div class="canvas-viewport">
        <div v-if="!upscaledImage" class="empty-state">
          <div class="empty-icon">✨</div>
          <h3>Upscaler Mode</h3>
          <p v-if="!isLocked" style="color: #e67e22">⚠️ Lock the Server IP above to start.</p>
          <p v-else>Upload an image on the left panel to upscale it.</p>
        </div>

        <div v-else class="image-wrapper">
          <img :src="upscaledImage" alt="Upscaled Result" class="result-image" />
          <div class="image-actions">
            <a :href="upscaledImage" target="_blank" class="btn-action btn-download">
              Download HD Result
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Tambahan CSS khusus untuk Upscaler */
.file-uploader {
  width: 100%;
  padding: 10px;
  background: var(--bg-input);
  border: 1px dashed var(--text-muted);
  border-radius: 8px;
  color: var(--text-main);
  cursor: pointer;
}
.preview-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.preview-img {
  width: 100%;
  border-radius: 4px;
  object-fit: contain;
  max-height: 200px;
}
.btn-upscale {
  background: linear-gradient(135deg, #8e44ad, #9b59b6);
  box-shadow: 0 4px 10px rgba(142, 68, 173, 0.3);
}
.btn-upscale:hover {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
}
</style>
